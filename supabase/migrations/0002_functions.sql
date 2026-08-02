-- SEPi NME Platform — triggers and business logic
-- Every investment rule lives here, inside a transaction. None of it lives in React.

-- --------------------------------------------------- profile auto-creation

-- Fires on new auth user. Role and name come from the invite metadata the
-- admin set server-side, so a profile row can never exist without a role.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'new_member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ----------------------------------------------------------------- helpers

create or replace function current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_company_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from company_members
    where company_id = target_company and profile_id = auth.uid()
  );
$$;

-- Committed capital. Pending money is locked money — declined money is not.
create or replace function committed_total(investor uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from investments
  where investor_id = investor
    and status in ('pending', 'accepted');
$$;

-- THE balance. There is no balance column anywhere and there never will be.
create or replace function available_balance(investor uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (select investor_budget from app_settings where id = 1) - committed_total(investor);
$$;

create or replace function notify(
  recipient uuid,
  n_type    text,
  n_body    text,
  n_link    text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (recipient_id, type, body, link)
  values (recipient, n_type, n_body, n_link);
$$;

-- ------------------------------------------------------- place_investment

-- All seven rules, one transaction. Raises on any violation; the caller
-- surfaces the message. Funds lock the instant this returns.
create or replace function place_investment(
  target_company   uuid,
  invest_amount    integer,
  invest_note      text,
  types            text[] default '{}'
)
returns investments
language plpgsql
security definer
set search_path = public
as $$
declare
  me           uuid := auth.uid();
  my_role      text;
  settings     app_settings%rowtype;
  target       companies%rowtype;
  investor_row profiles%rowtype;
  created      investments%rowtype;
  founder      record;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize this investor against themselves. Two tabs cannot both slip
  -- under the budget cap.
  select * into investor_row from profiles where id = me for update;
  my_role := investor_row.role;

  -- Rule 7 — only current members and admins invest.
  if my_role not in ('current_member', 'admin') then
    raise exception 'Your role cannot invest';
  end if;

  select * into settings from app_settings where id = 1;

  -- Rule 5 — window must be open.
  if not settings.investment_window_open then
    raise exception 'The investment window is closed';
  end if;

  -- Rule 1 — amount inside caps.
  if invest_amount < settings.investment_min or invest_amount > settings.investment_max then
    raise exception 'Investment must be between $% and $%',
      settings.investment_min, settings.investment_max;
  end if;

  -- The note is the point. No note, no investment.
  if invest_note is null or btrim(invest_note) = '' then
    raise exception 'A note is required — write why you are investing';
  end if;

  select * into target from companies where id = target_company;
  if not found then
    raise exception 'Company not found';
  end if;

  -- Rule 4 — target must be investable.
  if not target.investable then
    raise exception 'This company is not accepting investment';
  end if;

  -- Rule 3 — no investing in your own company.
  if exists (
    select 1 from company_members
    where company_id = target_company and profile_id = me
  ) or target.created_by = me then
    raise exception 'You cannot invest in a company you are part of';
  end if;

  -- Rule 2 — budget cap.
  if committed_total(me) + invest_amount > settings.investor_budget then
    raise exception 'That exceeds your remaining balance of $%', available_balance(me);
  end if;

  -- Rule 6 — one per investor per company (unique constraint is the real
  -- guard; this turns the constraint error into a readable one).
  if exists (
    select 1 from investments where investor_id = me and company_id = target_company
  ) then
    raise exception 'You have already invested in this company';
  end if;

  insert into investments (investor_id, company_id, amount, note, commitment_types)
  values (me, target_company, invest_amount, btrim(invest_note), coalesce(types, '{}'))
  returning * into created;

  -- Notify every founder on the cap table.
  for founder in
    select profile_id from company_members where company_id = target_company
    union
    select target.created_by where target.created_by is not null
  loop
    perform notify(
      founder.profile_id,
      'investment_received',
      coalesce(investor_row.full_name, investor_row.email) || ' backed ' || target.name ||
        ' for $' || invest_amount || '. You have 72 hours to respond.',
      '/c/' || target.slug
    );
  end loop;

  return created;
end;
$$;

-- --------------------------------------------------- respond_to_investment

-- Founders only. Investors can never withdraw or reverse — there is no path
-- in this function for the investor to change their own row.
create or replace function respond_to_investment(
  investment    uuid,
  new_status    text
)
returns investments
language plpgsql
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  inv     investments%rowtype;
  target  companies%rowtype;
  updated investments%rowtype;
begin
  if new_status not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined';
  end if;

  select * into inv from investments where id = investment for update;
  if not found then
    raise exception 'Investment not found';
  end if;

  if inv.status <> 'pending' then
    raise exception 'This investment has already been resolved';
  end if;

  select * into target from companies where id = inv.company_id;

  if not is_admin()
     and not is_company_member(inv.company_id)
     and target.created_by is distinct from me then
    raise exception 'Only the founding team can respond to this investment';
  end if;

  update investments
     set status = new_status, responded_at = now()
   where id = investment
   returning * into updated;

  perform notify(
    inv.investor_id,
    'investment_' || new_status,
    'Your $' || inv.amount || ' investment in ' || target.name || ' was ' || new_status || '.',
    '/c/' || target.slug
  );

  return updated;
end;
$$;

-- ------------------------------------------------------------- auto-accept

-- Silence is acceptance. Runs hourly; see 0005_cron.sql.
create or replace function auto_accept_stale_investments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row_ct integer := 0;
  rec    record;
begin
  for rec in
    select i.id, i.investor_id, i.amount, c.name as company_name, c.slug
      from investments i
      join companies c on c.id = i.company_id
     where i.status = 'pending'
       and i.created_at < now() - interval '72 hours'
     for update of i skip locked
  loop
    update investments
       set status = 'accepted', responded_at = now()
     where id = rec.id;

    perform notify(
      rec.investor_id,
      'investment_auto_accepted',
      'Your $' || rec.amount || ' investment in ' || rec.company_name ||
        ' was auto-accepted after 72 hours.',
      '/c/' || rec.slug
    );

    row_ct := row_ct + 1;
  end loop;

  return row_ct;
end;
$$;

-- ------------------------------------------------------ investor resources

create or replace function attach_investment_resource(
  investment    uuid,
  r_type        text,
  r_title       text,
  r_url         text default null,
  r_description text default null
)
returns investment_resources
language plpgsql
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  inv     investments%rowtype;
  target  companies%rowtype;
  created investment_resources%rowtype;
  founder record;
begin
  select * into inv from investments where id = investment;
  if not found then
    raise exception 'Investment not found';
  end if;

  if inv.investor_id <> me and not is_admin() then
    raise exception 'Only the investor can attach resources to this investment';
  end if;

  insert into investment_resources (investment_id, type, title, url, description)
  values (investment, r_type, r_title, r_url, r_description)
  returning * into created;

  select * into target from companies where id = inv.company_id;

  for founder in
    select profile_id from company_members where company_id = inv.company_id
  loop
    perform notify(
      founder.profile_id,
      'resource_attached',
      'An investor attached a ' || r_type || ': ' || r_title,
      '/c/' || target.slug
    );
  end loop;

  return created;
end;
$$;

-- --------------------------------------------------------- sprint scoring

-- amount_delivered + (amount_pre_service * multiplier), approved entries only.
create or replace view sprint_leaderboard as
select
  e.event_id,
  e.profile_id,
  p.full_name,
  p.avatar_path,
  e.team,
  sum(e.amount_delivered)                                   as delivered,
  sum(e.amount_pre_service)                                  as pre_service,
  sum(e.amount_delivered + e.amount_pre_service * ev.multiplier)::numeric as score
from sprint_entries e
join sprint_events ev on ev.id = e.event_id
join profiles p       on p.id = e.profile_id
where e.status = 'approved'
group by e.event_id, e.profile_id, p.full_name, p.avatar_path, e.team;

-- ------------------------------------------------------- directory totals

create or replace view company_totals as
select
  c.id  as company_id,
  coalesce(sum(i.amount) filter (where i.status = 'accepted'), 0)::integer as raised,
  count(*) filter (where i.status = 'accepted')::integer                   as backer_count
from companies c
left join investments i on i.company_id = c.id
group by c.id;
