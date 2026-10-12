-- New sprint entries count immediately. Admins can still reject them later.
-- Already live in production; this file documents it for a fresh database.
-- Idempotent: replace the function, then drop and recreate the trigger.
--
-- WITH CHECK runs after BEFORE INSERT triggers, so the old insert policy
-- (status = 'pending') would reject the row once this trigger sets
-- status = 'approved'. The submit policy below no longer checks status.
-- The trigger forces approved, so a member cannot insert another status.

create or replace function public.sprint_entries_auto_approve()
returns trigger
language plpgsql
as $$
begin
  new.status := 'approved';
  return new;
end
$$;

drop trigger if exists sprint_entries_auto_approve on public.sprint_entries;
create trigger sprint_entries_auto_approve
  before insert on public.sprint_entries
  for each row
  execute function public.sprint_entries_auto_approve();

drop policy if exists sprint_entries_submit on public.sprint_entries;
create policy sprint_entries_submit on public.sprint_entries
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.sprint_events e
      where e.id = event_id and e.status = 'open'
    )
  );
