-- SEPi NME Platform — core schema
-- Run order: 0001 schema, 0002 functions, 0003 rls, 0004 storage, 0005 cron.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text unique not null,
  full_name    text,
  role         text not null check (role in ('admin', 'current_member', 'new_member')),
  major        text,
  grad_year    integer,
  skills       text[]  not null default '{}',
  interests    text[]  not null default '{}',
  bio          text,
  linkedin_url text,
  resume_path  text,
  avatar_path  text,
  big_id       uuid references profiles (id) on delete set null,
  is_active    boolean not null default true,
  -- per-type email opt-outs; absent key means opted in
  email_prefs  jsonb   not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index profiles_role_idx on profiles (role) where is_active;
create index profiles_big_idx  on profiles (big_id);

-- --------------------------------------------------------------- companies

create table companies (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  one_liner   text not null check (char_length(one_liner) <= 50),
  status      text not null default 'active' check (status in ('active', 'pivoted', 'killed')),
  investable  boolean not null default false,
  logo_path   text,
  deck_path   text,
  demo_url    text,
  website_url text,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index companies_investable_idx on companies (investable, status);

create table company_members (
  company_id uuid not null references companies (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role       text,
  primary key (company_id, profile_id)
);

create index company_members_profile_idx on company_members (profile_id);

-- ------------------------------------------------------------ applications

-- Three passes per company, stored as separate rows, never overwritten.
-- Question definitions live in TypeScript, not here, so wording can change
-- without a migration.
create table applications (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  pass_number  integer not null check (pass_number in (1, 2, 3)),
  answers      jsonb not null,
  is_current   boolean not null default true,
  submitted_at timestamptz not null default now(),
  unique (company_id, pass_number)
);

-- Draft autosave. Separate from submissions so a dropped connection never
-- touches a real pass row.
create table application_drafts (
  company_id  uuid not null references companies (id) on delete cascade,
  pass_number integer not null check (pass_number in (1, 2, 3)),
  answers     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (company_id, pass_number)
);

-- ------------------------------------------------------------- investments

create table investments (
  id               uuid primary key default gen_random_uuid(),
  investor_id      uuid not null references profiles (id) on delete cascade,
  company_id       uuid not null references companies (id) on delete cascade,
  amount           integer not null check (amount >= 10000 and amount <= 100000),
  note             text not null check (char_length(btrim(note)) > 0),
  commitment_types text[] not null default '{}',
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  unique (investor_id, company_id)
);

create index investments_company_idx  on investments (company_id, status);
create index investments_investor_idx on investments (investor_id, status);
-- drives the hourly auto-accept sweep
create index investments_pending_idx  on investments (created_at) where status = 'pending';

create table investment_resources (
  id            uuid primary key default gen_random_uuid(),
  investment_id uuid not null references investments (id) on delete cascade,
  type          text not null check (type in ('link', 'mentor', 'resource', 'suggestion')),
  title         text not null,
  url           text,
  description   text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------- notifications

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  type         text not null,
  body         text not null,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_unread_idx on notifications (recipient_id, created_at desc)
  where read_at is null;

-- ------------------------------------------------------------- money sprint

create table sprint_events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  multiplier numeric not null default 1.5,
  started_at timestamptz,
  ended_at   timestamptz
);

create table sprint_entries (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references sprint_events (id) on delete cascade,
  profile_id         uuid not null references profiles (id) on delete cascade,
  amount_delivered   integer not null default 0 check (amount_delivered >= 0),
  amount_pre_service integer not null default 0 check (amount_pre_service >= 0),
  proof_path         text,
  description        text,
  team               text check (team in ('wyatt', 'madison')),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason      text,
  submitted_at       timestamptz not null default now()
);

create index sprint_entries_board_idx on sprint_entries (event_id, status);

-- -------------------------------------------------------------------- posts

create table posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references profiles (id) on delete cascade,
  company_id   uuid references companies (id) on delete cascade,
  title        text not null,
  body         text not null,
  published_at timestamptz not null default now()
);

create index posts_feed_idx on posts (published_at desc);

-- ----------------------------------------------------------------- calendar

create table cal_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_date  date not null,
  start_time  time,
  location    text,
  description text,
  week_number integer
);

create index cal_events_date_idx on cal_events (event_date);

-- STUB. Table exists so V2 has data shape to grow into. No UI in V1.
create table attendance (
  id           uuid primary key default gen_random_uuid(),
  cal_event_id uuid not null references cal_events (id) on delete cascade,
  profile_id   uuid not null references profiles (id) on delete cascade,
  status       text not null check (status in ('present', 'excused', 'unexcused')),
  recorded_by  uuid references profiles (id) on delete set null,
  recorded_at  timestamptz not null default now(),
  unique (cal_event_id, profile_id)
);

-- ------------------------------------------------------------------ settings

create table app_settings (
  id                     integer primary key default 1 check (id = 1),
  investment_window_open boolean not null default false,
  investment_opens_at    timestamptz,
  investment_closes_at   timestamptz,
  investment_min         integer not null default 10000,
  investment_max         integer not null default 100000,
  investor_budget        integer not null default 200000
);

insert into app_settings (id, investment_opens_at, investment_closes_at)
values (1, '2026-11-02 00:00:00-05', '2026-11-23 23:59:59-05');

-- ---------------------------------------------------------------- email log

-- Written before and after every send. Also the idempotency ledger — reminder
-- and digest crons check here before sending so a retry cannot double-send.
create table email_log (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles (id) on delete set null,
  to_email     text not null,
  type         text not null,
  -- stable key per logical send, e.g. 'reminder:<investment_id>'
  dedupe_key   text unique,
  subject      text not null,
  status       text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  resend_id    text,
  error        text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create index email_log_type_idx on email_log (type, created_at desc);
