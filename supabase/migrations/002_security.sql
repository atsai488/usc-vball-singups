-- Production security layer. Run after schema.sql.
create table if not exists admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table matches add column if not exists video_url text;
alter table admin_users enable row level security;
drop policy if exists "admins can read own membership" on admin_users;
drop policy if exists "admins manage players" on players;
drop policy if exists "admins manage weeks" on weeks;
drop policy if exists "admins manage signups" on signups;
drop policy if exists "admins manage teams" on teams;
drop policy if exists "admins manage assignments" on team_assignments;
drop policy if exists "admins manage matches" on matches;
drop policy if exists "admins manage history" on elo_history;
create policy "admins can read own membership" on admin_users for select to authenticated using (user_id = auth.uid());

create policy "admins manage players" on players for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage weeks" on weeks for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage signups" on signups for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage teams" on teams for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage assignments" on team_assignments for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage matches" on matches for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins manage history" on elo_history for all to authenticated using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
grant select (id,name,positions,elo,created_at) on players to anon,authenticated;
grant select on weeks,teams,team_assignments,matches,elo_history to anon,authenticated;
grant select (id,player_id,week_id,position,status,created_at) on signups to anon,authenticated;
grant all on players,weeks,signups,teams,team_assignments,matches,elo_history to authenticated;
