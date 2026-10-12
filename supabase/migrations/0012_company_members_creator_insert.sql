-- Company creators can insert the founding team.
-- company_members_manage only allows existing members or admins, so the
-- first insert (the creator themselves) was rejected. This policy is
-- already live in production; the file documents it for a fresh database.
-- Numbered 0012 because 0011 is used on another branch.
-- Idempotent: drop then create.

drop policy if exists company_members_creator_insert on public.company_members;
create policy company_members_creator_insert on public.company_members
  for insert to authenticated
  with check (exists (select 1 from public.companies c where c.id = company_members.company_id and c.created_by = auth.uid()));
