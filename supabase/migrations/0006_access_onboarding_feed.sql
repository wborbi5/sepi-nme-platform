-- SEPi NME Platform — pre-approved access, onboarding, assignments, to-dos, feed
--
-- Adds the five things the v1 schema had no shape for:
--   1. a pre-approved email allowlist that is the *only* door into the app
--   2. onboarding state and the profile fields that make a profile read like a
--      person instead of a form
--   3. assignments and submissions — the homework ledger
--   4. one function that answers "what do I owe, when, and where do I put it"
--   5. feed posts that carry a kind, an audience, and a call to action

-- ============================================================ 1. ACCESS

-- The allowlist. Nobody authenticates without a row here. Admin-managed.
create table allowed_emails (
  email       text primary key check (email = lower(btrim(email))),
  role        text not null default 'new_member'
                check (role in ('admin', 'current_member', 'new_member')),
  full_name   text,
  note        text,
  added_by    uuid references profiles (id) on delete set null,
  claimed_at  timestamptz,
  claimed_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index allowed_emails_unclaimed_idx on allowed_emails (created_at desc)
  where claimed_at is null;

-- Case- and whitespace-insensitive lookup. Security definer so the auth
-- trigger can read the table while RLS keeps it admin-only for everyone else.
create or replace function allowlist_entry(candidate text)
returns allowed_emails
language sql
stable
security definer
set search_path = public
as $$
  select * from allowed_emails where email = lower(btrim(candidate));
$$;

create or replace function email_is_allowed(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from allowed_emails where email = lower(btrim(candidate)));
$$;

-- Replaces the 0002 version. Two changes that matter:
--   * an email outside the allowlist raises, which aborts the auth.users
--     insert — the account is never created, not merely left profile-less
--   * role and name come from the allowlist row, not from user metadata, so a
--     crafted signup payload cannot mint itself an admin profile
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entry allowed_emails%rowtype;
begin
  select * into entry from allowed_emails where email = lower(btrim(new.email));

  if not found then
    raise exception 'This email is not on the SEPi member list. Ask an admin to add you.'
      using errcode = '42501';
  end if;

  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    lower(btrim(new.email)),
    coalesce(entry.full_name, nullif(new.raw_user_meta_data ->> 'full_name', '')),
    entry.role
  )
  on conflict (id) do nothing;

  update allowed_emails
     set claimed_at = coalesce(claimed_at, now()),
         claimed_by = coalesce(claimed_by, new.id)
   where email = entry.email;

  return new;
end;
$$;

-- ====================================================== 2. PROFILE SHAPE

-- Deliberately not the unaccent extension: this is a 50-person roster, and a
-- one-line mapping beats provisioning a Postgres extension for it.
create or replace function unaccent_lite(input text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(input, ''),
    'áàâäãåÁÀÂÄÃÅéèêëÉÈÊËíìîïÍÌÎÏóòôöõÓÒÔÖÕúùûüÚÙÛÜñÑçÇ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUnNcC'
  );
$$;

-- Slugs are generated once and never change — they are in URLs and links.
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(btrim(regexp_replace(lower(unaccent_lite(input)), '[^a-z0-9]+', '-', 'g'), '-'), ''),
    'member'
  );
$$;

alter table profiles
  add column slug           text unique,
  add column onboarded_at   timestamptz,
  -- Answer to the first onboarding question. Distinct from `role`: role is what
  -- an admin granted, track is what the member said about themselves. They
  -- agree in every normal case; when they disagree, an admin wants to know.
  add column member_track   text check (member_track in ('new', 'current')),
  add column pronouns       text,
  add column hometown       text,
  -- The profile-as-a-person fields. Every one of these is a sentence or a
  -- short list, never a boolean, because the profile page reads as prose.
  add column headline       text check (char_length(headline) <= 90),
  add column currently      text check (char_length(currently) <= 240),
  add column superpower     text check (char_length(superpower) <= 160),
  add column origin         text check (char_length(origin) <= 400),
  add column fun_fact       text check (char_length(fun_fact) <= 160),
  add column ask_me_about   text[] not null default '{}',
  add column need_help_with text[] not null default '{}',
  -- How they operate. Drives the "general vibe" line and the chatbot's sense
  -- of who to point at.
  add column energy         text check (energy in
                              ('builder', 'operator', 'seller', 'storyteller',
                               'researcher', 'connector', 'designer')),
  add column working_style  text[] not null default '{}';

create index profiles_track_idx on profiles (member_track) where is_active;
create index profiles_ask_idx   on profiles using gin (ask_me_about);
create index profiles_help_idx  on profiles using gin (need_help_with);

-- Backfill, then enforce. Collisions get a short suffix; the loop is bounded
-- because each pass adds entropy.
create or replace function ensure_profile_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         integer := 1;
begin
  if new.slug is not null then
    return new;
  end if;

  base := slugify(coalesce(nullif(btrim(new.full_name), ''), split_part(new.email, '@', 1)));
  candidate := base;

  while exists (select 1 from profiles where slug = candidate and id <> new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create trigger profiles_slug_guard
  before insert or update of full_name on profiles
  for each row execute function ensure_profile_slug();

-- Backfill any rows that predate the column. Ties are broken by signup order
-- so the earliest member keeps the clean slug.
with ranked as (
  select
    id,
    slugify(coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1))) as base,
    row_number() over (
      partition by slugify(coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1)))
      order by created_at, id
    ) as n
  from profiles
  where slug is null
)
update profiles p
   set slug = case when r.n = 1 then r.base else r.base || '-' || r.n end
  from ranked r
 where p.id = r.id;

-- ================================================== 3. ASSIGNMENTS / HOMEWORK

create table assignments (
  id            uuid primary key default gen_random_uuid(),
  week_number   integer check (week_number between 1 and 7),
  title         text not null,
  detail        text,
  audience      text not null default 'all'
                  check (audience in ('all', 'new_member', 'current_member')),
  due_at        timestamptz,
  -- What "turning it in" physically means, and the exact place to do it.
  submit_kind   text not null default 'text'
                  check (submit_kind in ('text', 'link', 'file', 'external', 'none')),
  submit_href   text,
  submit_hint   text,
  is_published  boolean not null default false,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index assignments_open_idx on assignments (due_at) where is_published;

create table assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  profile_id    uuid not null references profiles (id) on delete cascade,
  body          text,
  url           text,
  file_path     text,
  status        text not null default 'submitted'
                  check (status in ('submitted', 'approved', 'returned')),
  feedback      text,
  submitted_at  timestamptz not null default now(),
  unique (assignment_id, profile_id)
);

create index assignment_submissions_profile_idx on assignment_submissions (profile_id);

-- =========================================================== 4. THE TO-DO LIST

-- One function, five sources, one shape. This is what the profile's to-do
-- panel and the dashboard both render. Nothing here is stored — a to-do is a
-- question about current state, and storing it would mean keeping it in sync.
create or replace function todos_for(target uuid)
returns table (
  key      text,
  kind     text,
  title    text,
  detail   text,
  due_at   timestamptz,
  href     text,
  cta      text,
  urgency  text
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from profiles where id = target
  ),
  -- Published assignments aimed at this member that they have not turned in,
  -- plus anything an admin handed back.
  homework as (
    select
      'assignment:' || a.id                                   as key,
      'assignment'                                            as kind,
      a.title                                                 as title,
      coalesce(
        case when s.status = 'returned'
             then 'Returned: ' || coalesce(s.feedback, 'needs another pass')
        end,
        a.submit_hint,
        a.detail
      )                                                       as detail,
      a.due_at                                                as due_at,
      coalesce(a.submit_href, '/homework/' || a.id)           as href,
      case when s.id is null then 'Turn in' else 'Redo' end   as cta,
      case
        when a.due_at is null                    then 'later'
        when a.due_at < now()                    then 'overdue'
        when a.due_at < now() + interval '48 hours' then 'now'
        else 'soon'
      end                                                     as urgency
    from assignments a
    cross join me
    left join assignment_submissions s
           on s.assignment_id = a.id and s.profile_id = me.id
    where a.is_published
      and (a.audience = 'all' or a.audience = me.role)
      and (s.id is null or s.status = 'returned')
  ),
  -- Investments waiting on this member as a founder. 72 hours, then silence
  -- becomes acceptance — so this one is always urgent.
  responses as (
    select
      'investment:' || i.id                                   as key,
      'investment'                                            as kind,
      'Respond to $' || i.amount || ' from ' ||
        coalesce(p.full_name, p.email)                        as title,
      'Auto-accepts ' ||
        to_char(i.created_at + interval '72 hours', 'Mon DD at HH12:MIam') as detail,
      i.created_at + interval '72 hours'                      as due_at,
      '/c/' || c.slug                                         as href,
      'Accept or decline'                                     as cta,
      'now'                                                   as urgency
    from investments i
    join companies c on c.id = i.company_id
    join profiles  p on p.id = i.investor_id
    where i.status = 'pending'
      and (
        c.created_by = target
        or exists (
          select 1 from company_members cm
           where cm.company_id = i.company_id and cm.profile_id = target
        )
      )
  ),
  -- The accelerator application pass that is open and unfilled, per company.
  passes as (
    select
      'application:' || c.id || ':' || pass.n                 as key,
      'application'                                           as kind,
      'Accelerator Application — pass ' || pass.n             as title,
      c.name                                                  as detail,
      null::timestamptz                                       as due_at,
      '/apply/' || c.id || '?pass=' || pass.n                 as href,
      'Fill it out'                                           as cta,
      'soon'                                                  as urgency
    from companies c
    join company_members cm on cm.company_id = c.id and cm.profile_id = target
    cross join lateral (
      select n from generate_series(1, 3) n
       where not exists (
         select 1 from applications a
          where a.company_id = c.id and a.pass_number = n
       )
       order by n limit 1
    ) pass
  ),
  -- An open Money Sprint you have not logged anything against.
  sprint as (
    select
      'sprint:' || e.id                                       as key,
      'sprint'                                                as kind,
      'Log your Money Sprint revenue'                         as title,
      'Pre-service counts ' || e.multiplier || 'x'            as detail,
      e.ended_at                                              as due_at,
      '/sprint'                                               as href,
      'Log revenue'                                           as cta,
      'now'                                                   as urgency
    from sprint_events e
    where e.status = 'open'
      and not exists (
        select 1 from sprint_entries se
         where se.event_id = e.id and se.profile_id = target
      )
  ),
  -- A profile nobody can learn anything from is itself a to-do.
  profile_gap as (
    select
      'profile:thin'                                          as key,
      'profile'                                               as kind,
      'Finish your profile'                                   as title,
      'Members find each other through these fields'          as detail,
      null::timestamptz                                       as due_at,
      '/p/' || me.slug || '/edit'                             as href,
      'Add detail'                                            as cta,
      'later'                                                 as urgency
    from me
    where me.headline is null
       or me.currently is null
       or cardinality(me.ask_me_about) = 0
  )
  select * from homework
  union all select * from responses
  union all select * from passes
  union all select * from sprint
  union all select * from profile_gap
  order by
    case urgency when 'overdue' then 0 when 'now' then 1 when 'soon' then 2 else 3 end,
    due_at nulls last;
$$;

-- ================================================================ 5. THE FEED

alter table posts
  add column kind       text not null default 'announcement'
               check (kind in ('announcement', 'alert', 'assignment', 'form',
                               'sprint', 'session', 'update')),
  add column audience   text not null default 'all'
               check (audience in ('all', 'new_member', 'current_member')),
  add column pinned     boolean not null default false,
  add column cta_label  text,
  add column cta_href   text,
  add column event_at   timestamptz,
  add column location   text,
  add column assignment_id uuid references assignments (id) on delete set null;

create index posts_pinned_idx on posts (pinned, published_at desc) where pinned;

-- The home feed is admin-only. Company updates are not: a founder posting to
-- their own company page is a different object that happens to share a table.
-- The distinction is company_id, and this policy is the whole rule.
drop policy if exists posts_author_write on posts;

create policy posts_admin_write on posts
  for all to authenticated
  using (is_admin()) with check (is_admin());

create policy posts_company_update_write on posts
  for all to authenticated
  using (company_id is not null and is_company_member(company_id))
  with check (company_id is not null and is_company_member(company_id) and author_id = auth.uid());

-- ================================================== 6. THE MEMBER CHATBOT

-- Everything the assistant is allowed to know about a member, flattened to one
-- row so retrieval is a single indexed scan and no private column can leak in
-- by accident. Section 2 of the application is not here and never will be.
create or replace view member_card
with (security_invoker = off) as
select
  p.id,
  p.slug,
  p.full_name,
  p.role,
  p.member_track,
  p.major,
  p.grad_year,
  p.headline,
  p.currently,
  p.superpower,
  p.energy,
  p.ask_me_about,
  p.need_help_with,
  p.skills,
  p.interests,
  p.working_style,
  p.hometown,
  coalesce(
    (select array_agg(c.name order by c.name)
       from company_members cm join companies c on c.id = cm.company_id
      where cm.profile_id = p.id),
    '{}'
  ) as companies,
  coalesce(
    (select string_agg(c.name || ' — ' || c.one_liner, '; ' order by c.name)
       from company_members cm join companies c on c.id = cm.company_id
      where cm.profile_id = p.id),
    ''
  ) as company_summary
from profiles p
where p.is_active;

grant select on member_card to authenticated;

-- Persisted so a member can scroll back to the answer they got last week.
create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  body       text not null,
  -- Member ids the answer pointed at, for click-through without re-parsing.
  refs       uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chat_messages_thread_idx on chat_messages (profile_id, created_at);

-- ===================================================================== RLS

alter table allowed_emails         enable row level security;
alter table assignments            enable row level security;
alter table assignment_submissions enable row level security;
alter table chat_messages          enable row level security;

-- The allowlist is a roster of people's emails. Admins only; the auth trigger
-- reads it as security definer and does not go through RLS.
create policy allowed_emails_admin on allowed_emails
  for all to authenticated using (is_admin()) with check (is_admin());

create policy assignments_read on assignments
  for select to authenticated using (is_published or is_admin());

create policy assignments_admin on assignments
  for all to authenticated using (is_admin()) with check (is_admin());

-- You see your own work and admins see everyone's. Members do not read each
-- other's homework.
create policy assignment_submissions_own on assignment_submissions
  for select to authenticated using (profile_id = auth.uid() or is_admin());

create policy assignment_submissions_write on assignment_submissions
  for insert to authenticated with check (profile_id = auth.uid() and status = 'submitted');

create policy assignment_submissions_update on assignment_submissions
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy assignment_submissions_admin on assignment_submissions
  for all to authenticated using (is_admin()) with check (is_admin());

create policy chat_messages_own on chat_messages
  for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
