-- Supabase: SQL Editor → New query → paste → Run

create table if not exists public.orb_leaderboard (
  nickname text primary key,
  score int not null check (score >= 0),
  updated_at timestamptz not null default now()
);

alter table public.orb_leaderboard enable row level security;

create policy "orb_leaderboard_select"
  on public.orb_leaderboard for select
  using (true);

create policy "orb_leaderboard_insert"
  on public.orb_leaderboard for insert
  with check (true);

create policy "orb_leaderboard_update"
  on public.orb_leaderboard for update
  using (true);
