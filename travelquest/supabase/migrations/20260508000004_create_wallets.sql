create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,

  available_balance numeric(18,2) not null default 0,
  locked_balance numeric(18,2) not null default 0,
  pending_balance numeric(18,2) not null default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.wallets
add column if not exists available_balance numeric(18,2) not null default 0,
add column if not exists locked_balance numeric(18,2) not null default 0,
add column if not exists pending_balance numeric(18,2) not null default 0,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();
