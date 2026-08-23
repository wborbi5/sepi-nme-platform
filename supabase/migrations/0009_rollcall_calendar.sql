-- 0009 — Roll Call, and the calendar import shape.
--
-- Roll Call is the daily accountability board at the top of /updates: one
-- check-in row per member per day, plus that member's goals for the day.
-- Both tables are keyed on a plain `date` (America/New_York, computed by the
-- app — the server runs UTC and 8pm Eastern is tomorrow in UTC).
--
-- The calendar half widens cal_events for the Fall '26 import: chapter vs
-- external source, multi-day spans, and the PDF's attendance categories.

-- ------------------------------------------------------------------ roll call

create table checkins (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles (id) on delete cascade,
  day            date not null,
  clocked_in_at  timestamptz not null default now(),
  clocked_out_at timestamptz,
  location       text not null default 'Elm',
  unique (profile_id, day)
);

create index checkins_day_idx on checkins (day);

create table daily_goals (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  day        date not null,
  text       text not null,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

create index daily_goals_day_idx on daily_goals (day, profile_id);

alter table checkins    enable row level security;
alter table daily_goals enable row level security;

-- The board is the point: everyone sees everyone's day.
create policy checkins_read on checkins
  for select to authenticated using (true);

create policy checkins_own_insert on checkins
  for insert to authenticated with check (profile_id = auth.uid());

create policy checkins_own_update on checkins
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy checkins_own_delete on checkins
  for delete to authenticated using (profile_id = auth.uid());

create policy checkins_admin on checkins
  for all to authenticated using (is_admin()) with check (is_admin());

create policy daily_goals_read on daily_goals
  for select to authenticated using (true);

create policy daily_goals_own_insert on daily_goals
  for insert to authenticated with check (profile_id = auth.uid());

create policy daily_goals_own_update on daily_goals
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy daily_goals_own_delete on daily_goals
  for delete to authenticated using (profile_id = auth.uid());

create policy daily_goals_admin on daily_goals
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------- calendar

-- 'chapter'  — the Sigma Eta Pi / Side Hustle Club calendar
-- 'external' — hackathons, meetups, conferences worth showing up to
alter table cal_events
  add column calendar text not null default 'chapter'
    check (calendar in ('chapter', 'external')),
  -- inclusive last day of a multi-day event; null means single-day
  add column end_date date,
  -- the PDF legend, including 'optional' for its "No requirement" events.
  -- Null for external events, which are graded by city, not by chapter
  -- attendance requirement.
  add column category text
    check (category in (
      'chapter', 'mandatory', 'professional', 'social', 'recruitment', 'optional'
    ));

create index cal_events_calendar_idx on cal_events (calendar, event_date);

-- --------------------------------------------------------- calendar PDF bucket

-- The two source PDFs, linked under the calendar header. Public read: they
-- are a fraternity event schedule, and the bucket holds nothing else.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('calendar', 'calendar', true, 10 * 1024 * 1024, array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "calendar pdfs are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'calendar');

create policy "admins write calendar pdfs"
  on storage.objects for all to authenticated
  using (bucket_id = 'calendar' and is_admin())
  with check (bucket_id = 'calendar' and is_admin());
