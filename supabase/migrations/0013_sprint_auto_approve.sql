-- New sprint entries count immediately. Admins can still reject them later.
-- Already live in production; this file documents it for a fresh database.
-- Idempotent: replace the function, then drop and recreate the trigger.
--
-- WITH CHECK runs after BEFORE INSERT triggers, so the insert policy must
-- allow status 'approved' once this trigger rewrites the row. The check
-- below is the live production policy: the member's own row, pending or
-- approved, an open sprint for their audience, and a team that matches
-- their roster assignment.

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
    and status in ('pending', 'approved')
    and exists (
      select 1 from public.sprint_events e
      where e.id = sprint_entries.event_id
        and e.status = 'open'
        and e.audience = case
          when (select p.role from public.profiles p where p.id = auth.uid()) = 'new_member'
          then 'new_member'
          else 'current_member'
        end
    )
    and team is not distinct from (
      select r.team from public.sprint_rosters r
      where r.event_id = sprint_entries.event_id
        and r.profile_id = auth.uid()
    )
  );
