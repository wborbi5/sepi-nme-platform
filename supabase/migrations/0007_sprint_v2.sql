-- Sprint v2 — two sprint kinds and admin-built teams.
--
-- Every sprint event now has an audience: 'current_member' or
-- 'new_member'. Both kinds can run at once. For current-member sprints
-- the admin names two teams and assigns members to them via
-- sprint_rosters; entries inherit the submitter's roster team so the
-- teams compete on the same leaderboard math as before.

alter table sprint_events
  add column audience    text not null default 'new_member'
    check (audience in ('current_member', 'new_member')),
  add column team_a_name text not null default 'Team A',
  add column team_b_name text not null default 'Team B';

-- Admin-assigned rosters: who is on which team for a given event.
create table sprint_rosters (
  event_id   uuid not null references sprint_events (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  team       text not null check (team in ('a', 'b')),
  primary key (event_id, profile_id)
);

alter table sprint_rosters enable row level security;

create policy sprint_rosters_read on sprint_rosters
  for select to authenticated using (true);

create policy sprint_rosters_admin on sprint_rosters
  for all to authenticated using (is_admin()) with check (is_admin());

-- Entries carry the roster team ('a'/'b'); legacy wyatt/madison values
-- stay valid so no historical row can break the constraint.
alter table sprint_entries drop constraint if exists sprint_entries_team_check;
alter table sprint_entries
  add constraint sprint_entries_team_check
  check (team in ('a', 'b', 'wyatt', 'madison'));
