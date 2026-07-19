-- Run this once in the Supabase SQL Editor (same project as logic-circuit-sim).
create table if not exists public.circuit_puzzle_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.circuit_puzzle_saves enable row level security;

create policy "select own circuit_puzzle_saves" on public.circuit_puzzle_saves for select using (auth.uid() = user_id);
create policy "insert own circuit_puzzle_saves" on public.circuit_puzzle_saves for insert with check (auth.uid() = user_id);
create policy "delete own circuit_puzzle_saves" on public.circuit_puzzle_saves for delete using (auth.uid() = user_id);
