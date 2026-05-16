create table if not exists public.user_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_code text not null,
  reward_amount numeric not null default 0,
  source_reference_id text,
  claimed_at timestamptz not null default now(),
  unique (user_id, claim_code)
);

alter table public.user_reward_claims enable row level security;

drop policy if exists "user_reward_claims_own" on public.user_reward_claims;
create policy "user_reward_claims_own" on public.user_reward_claims
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
