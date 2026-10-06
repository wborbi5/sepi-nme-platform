-- Mentor directory.
-- Members paste a LinkedIn profile URL. The table is already live in
-- production; this file documents it for a fresh database. Statements are
-- idempotent so applying them against production does not conflict.
-- Numbered 0010 because 0006_portal_fields.sql already exists.

create table if not exists public.mentors (
  id            uuid primary key default gen_random_uuid(),
  linkedin_url  text not null,
  linkedin_slug text,
  display_name  text,
  headline      text,
  added_by      uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint mentors_linkedin_url_unique unique (linkedin_url)
);

create index if not exists mentors_created_at_idx
  on public.mentors (created_at desc);

alter table public.mentors enable row level security;

drop policy if exists mentors_select_authenticated on public.mentors;
create policy mentors_select_authenticated
  on public.mentors
  for select
  to authenticated
  using (true);

drop policy if exists mentors_insert_authenticated on public.mentors;
create policy mentors_insert_authenticated
  on public.mentors
  for insert
  to authenticated
  with check ((auth.uid() = added_by) or (added_by is null));

drop policy if exists mentors_delete_own on public.mentors;
create policy mentors_delete_own
  on public.mentors
  for delete
  to authenticated
  using (added_by = auth.uid());
