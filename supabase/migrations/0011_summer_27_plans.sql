-- Plans for summer 27 on member profiles.
-- Nullable so existing rows stay valid and the question can be left blank.
-- Row-level policies already cover new columns: profiles_self_update lets a
-- member update their own row, and the privilege guard only blocks role,
-- big_id, is_active, and email. No policy change.

alter table public.profiles
  add column summer_27_plan text,
  add column summer_27_plan_other text;

alter table public.profiles
  add constraint profiles_summer_27_plan_check
  check (
    summer_27_plan is null
    or summer_27_plan in ('internship', 'build_business', 'free_ball', 'other')
  );

comment on column public.profiles.summer_27_plan is
  'Plans for summer 27: internship, build_business, free_ball, other, or null.';

comment on column public.profiles.summer_27_plan_other is
  'Short description when summer_27_plan is other. Cleared by the app otherwise.';
