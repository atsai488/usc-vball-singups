-- Link each player to one Google/Supabase Auth identity and keep one signup per week.
alter table public.players add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.signups add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists players_auth_user_id_unique on public.players(auth_user_id) where auth_user_id is not null;
create unique index if not exists signups_auth_user_week_unique on public.signups(auth_user_id, week_id) where auth_user_id is not null;
