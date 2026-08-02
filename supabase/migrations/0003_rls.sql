-- SEPi NME Platform — row level security
-- Layer 2 of 3. Middleware is layer 1, server-action role re-verification is layer 3.
-- Nothing here is optional: every table is locked, then selectively opened.

alter table profiles             enable row level security;
alter table companies            enable row level security;
alter table company_members      enable row level security;
alter table applications         enable row level security;
alter table application_drafts   enable row level security;
alter table investments          enable row level security;
alter table investment_resources enable row level security;
alter table notifications        enable row level security;
alter table sprint_events        enable row level security;
alter table sprint_entries       enable row level security;
alter table posts                enable row level security;
alter table cal_events           enable row level security;
alter table attendance           enable row level security;
alter table app_settings         enable row level security;
alter table email_log            enable row level security;

-- ---------------------------------------------------------------- profiles

-- Everyone in the org sees everyone. It is a 50-person fraternity directory.
create policy profiles_read on profiles
  for select to authenticated using (true);

-- You edit yourself. You do not edit your own role — that column is
-- protected by the trigger below, not by this policy.
create policy profiles_self_update on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- Privilege escalation guard: a member updating their own row cannot change
-- role, big_id, or is_active. Only an admin can.
create or replace function guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.role      is distinct from old.role
  or new.big_id    is distinct from old.big_id
  or new.is_active is distinct from old.is_active
  or new.email     is distinct from old.email then
    raise exception 'Only an admin can change role, big, active status, or email';
  end if;
  return new;
end;
$$;

create trigger profiles_privilege_guard
  before update on profiles
  for each row execute function guard_profile_privileges();

-- --------------------------------------------------------------- companies

create policy companies_read on companies
  for select to authenticated using (true);

create policy companies_insert on companies
  for insert to authenticated with check (created_by = auth.uid());

create policy companies_member_update on companies
  for update to authenticated
  using (is_company_member(id) or created_by = auth.uid())
  with check (is_company_member(id) or created_by = auth.uid());

create policy companies_admin_all on companies
  for all to authenticated using (is_admin()) with check (is_admin());

-- `investable` is an admin-only switch. Founders must not be able to flip
-- their own company open for investment.
create or replace function guard_company_investable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.investable is distinct from old.investable then
    raise exception 'Only an admin can change investable status';
  end if;
  return new;
end;
$$;

create trigger companies_investable_guard
  before update on companies
  for each row execute function guard_company_investable();

create policy company_members_read on company_members
  for select to authenticated using (true);

create policy company_members_manage on company_members
  for all to authenticated
  using (is_company_member(company_id) or is_admin())
  with check (is_company_member(company_id) or is_admin());

-- ------------------------------------------------------------ applications

-- Section 2 (Idea) is private to the founding team, their big, and admins.
-- The base table is therefore closed to everyone else; the public Section 3
-- answers are exposed through application_public below.
create policy applications_private_read on applications
  for select to authenticated using (
    is_admin()
    or is_company_member(company_id)
    or exists (
      select 1
        from company_members cm
        join profiles p on p.id = cm.profile_id
       where cm.company_id = applications.company_id
         and p.big_id = auth.uid()
    )
  );

create policy applications_write on applications
  for all to authenticated
  using (is_company_member(company_id) or is_admin())
  with check (is_company_member(company_id) or is_admin());

create policy application_drafts_own on application_drafts
  for all to authenticated
  using (is_company_member(company_id) or is_admin())
  with check (is_company_member(company_id) or is_admin());

-- Section 3 answers only. These are public on the company page by design.
-- Keys must match the ids in the TypeScript question config.
create or replace view application_public
with (security_invoker = off) as
select
  a.company_id,
  a.pass_number,
  a.submitted_at,
  a.answers -> 'revenue_model'          as revenue_model,
  a.answers -> 'target_audience'        as target_audience,
  a.answers -> 'competitive_advantage'  as competitive_advantage,
  a.answers -> 'timing'                 as timing,
  a.answers -> 'customer_acquisition'   as customer_acquisition,
  a.answers -> 'milestones'             as milestones
from applications a
where a.is_current;

grant select on application_public to authenticated;

-- ------------------------------------------------------------- investments

-- Accepted investments and their notes are the most valuable content on a
-- company page, so they are readable org-wide. Pending ones are visible only
-- to the investor and the founding team.
create policy investments_read on investments
  for select to authenticated using (
    status = 'accepted'
    or investor_id = auth.uid()
    or is_company_member(company_id)
    or is_admin()
  );

-- No direct writes. place_investment() and respond_to_investment() are the
-- only doors, and both are security definer.
create policy investments_admin_all on investments
  for all to authenticated using (is_admin()) with check (is_admin());

create policy investment_resources_read on investment_resources
  for select to authenticated using (
    exists (
      select 1 from investments i
       where i.id = investment_id
         and (i.investor_id = auth.uid() or is_company_member(i.company_id) or is_admin())
    )
  );

create policy investment_resources_admin on investment_resources
  for all to authenticated using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------- notifications

create policy notifications_own on notifications
  for select to authenticated using (recipient_id = auth.uid() or is_admin());

-- Mark-as-read is the only update a recipient makes.
create policy notifications_mark_read on notifications
  for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ------------------------------------------------------------- money sprint

create policy sprint_events_read on sprint_events
  for select to authenticated using (true);

create policy sprint_events_admin on sprint_events
  for all to authenticated using (is_admin()) with check (is_admin());

-- Approved entries are the leaderboard, so everyone sees them. Your own
-- pending entry is visible to you so the form can show "awaiting approval".
create policy sprint_entries_read on sprint_entries
  for select to authenticated using (
    status = 'approved' or profile_id = auth.uid() or is_admin()
  );

create policy sprint_entries_submit on sprint_entries
  for insert to authenticated with check (
    profile_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from sprint_events e where e.id = event_id and e.status = 'open')
  );

create policy sprint_entries_admin on sprint_entries
  for all to authenticated using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------- posts

create policy posts_read on posts
  for select to authenticated using (true);

create policy posts_author_write on posts
  for all to authenticated
  using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------- calendar

create policy cal_events_read on cal_events
  for select to authenticated using (true);

create policy cal_events_admin on cal_events
  for all to authenticated using (is_admin()) with check (is_admin());

-- Stub table. Admin-only until a V2 attendance UI exists.
create policy attendance_admin on attendance
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------ settings

create policy app_settings_read on app_settings
  for select to authenticated using (true);

create policy app_settings_admin on app_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------- email log

-- Admin-only. The service role bypasses RLS for the actual sends.
create policy email_log_admin on email_log
  for all to authenticated using (is_admin()) with check (is_admin());
