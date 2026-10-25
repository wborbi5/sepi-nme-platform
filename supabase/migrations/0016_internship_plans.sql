-- Summer 2027 internship pipeline.
-- summer_27_plan and summer_27_plan_other stay on profiles (0015).
-- The rest of the pulse is one row per member. Members read and write
-- their own row. Admins can read every row. Gaps and help-wanted stay
-- off the public profile.

create table if not exists public.internship_plans (
  profile_id         uuid primary key references public.profiles (id) on delete cascade,
  preferred_location text,
  job_type           text,
  company_size       text,
  summer_end_goals   text[] not null default '{}',
  brand_strengths    text,
  gaps               text,
  help_wanted        text[] not null default '{}',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint internship_plans_location_len
    check (preferred_location is null or char_length(preferred_location) <= 200),
  constraint internship_plans_job_type_len
    check (job_type is null or char_length(job_type) <= 200),
  constraint internship_plans_company_size_check
    check (
      company_size is null
      or company_size in ('small', 'large', 'either', 'unsure')
    ),
  constraint internship_plans_end_goals_check
    check (
      summer_end_goals <@ array['experience', 'connections', 'name_brand', 'skills']::text[]
    ),
  constraint internship_plans_strengths_len
    check (brand_strengths is null or char_length(brand_strengths) <= 1000),
  constraint internship_plans_gaps_len
    check (gaps is null or char_length(gaps) <= 1000),
  constraint internship_plans_help_wanted_check
    check (
      help_wanted <@ array[
        'interview_prep', 'approach_session', 'resume', 'networking', 'tutoring', 'other'
      ]::text[]
    ),
  constraint internship_plans_notes_len
    check (notes is null or char_length(notes) <= 2000)
);

create or replace function public.touch_internship_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists internship_plans_touch on public.internship_plans;
create trigger internship_plans_touch
  before update on public.internship_plans
  for each row execute function public.touch_internship_plan();

alter table public.internship_plans enable row level security;

drop policy if exists internship_plans_select on public.internship_plans;
create policy internship_plans_select
  on public.internship_plans
  for select
  to authenticated
  using (profile_id = auth.uid() or is_admin());

drop policy if exists internship_plans_insert on public.internship_plans;
create policy internship_plans_insert
  on public.internship_plans
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists internship_plans_update on public.internship_plans;
create policy internship_plans_update
  on public.internship_plans
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists internship_plans_admin on public.internship_plans;
create policy internship_plans_admin
  on public.internship_plans
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on public.internship_plans to authenticated;
