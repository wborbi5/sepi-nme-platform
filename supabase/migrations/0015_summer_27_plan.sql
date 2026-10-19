-- Summer 2027 plan on the member profile. Optional.
-- internship, build_business, free_ball, other, plus a free-text note.

alter table public.profiles
  add column if not exists summer_27_plan text,
  add column if not exists summer_27_plan_other text;

alter table public.profiles
  drop constraint if exists profiles_summer_27_plan_check;

alter table public.profiles
  add constraint profiles_summer_27_plan_check
  check (
    summer_27_plan is null
    or summer_27_plan in ('internship', 'build_business', 'free_ball', 'other')
  );
