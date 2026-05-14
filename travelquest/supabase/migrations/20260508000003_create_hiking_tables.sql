create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),

  code text unique,
  name text not null,
  area text,
  next_trail_id uuid references public.trails(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trailheads (
  id uuid primary key default gen_random_uuid(),

  trail_id uuid not null references public.trails(id) on delete cascade,
  name text not null,
  location text,

  lat double precision,
  lng double precision,

  created_at timestamptz default now()
);

create table if not exists public.trail_destinations (
  id uuid primary key default gen_random_uuid(),

  trail_id uuid not null references public.trails(id) on delete cascade,

  name text not null,
  destination_type text not null check (destination_type in ('Checkpoint', 'Target')),
  difficulty text not null check (difficulty in ('Easy', 'Moderate', 'Hard', 'Expert')),
  reward numeric(18,2) not null default 0,

  sort_order integer default 0,

  lat double precision,
  lng double precision,

  created_at timestamptz default now()
);

create table if not exists public.hike_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  trail_id uuid not null references public.trails(id) on delete cascade,
  selected_target_id uuid references public.trail_destinations(id) on delete set null,

  active boolean not null default false,
  trailhead_verified boolean not null default false,
  current_trailhead_matched boolean not null default false,
  target_reached boolean not null default false,

  status text not null default 'Not Started'
    check (status in ('Not Started', 'Active', 'Target Reached', 'Completed', 'Cancelled')),

  total_earned numeric(18,2) not null default 0,
  multi_destination_bonus_awarded boolean not null default false,
  next_trail_ready boolean not null default false,

  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hike_session_destinations (
  id uuid primary key default gen_random_uuid(),

  hike_session_id uuid not null references public.hike_sessions(id) on delete cascade,
  trail_destination_id uuid not null references public.trail_destinations(id) on delete cascade,

  base_reward numeric(18,2) not null default 0,
  target_bonus numeric(18,2) not null default 0,
  multi_destination_bonus numeric(18,2) not null default 0,
  total_added numeric(18,2) not null default 0,

  reached_at timestamptz default now(),

  unique (hike_session_id, trail_destination_id)
);

create table if not exists public.hike_trailhead_verifications (
  id uuid primary key default gen_random_uuid(),

  hike_session_id uuid not null references public.hike_sessions(id) on delete cascade,
  trailhead_id uuid not null references public.trailheads(id) on delete cascade,

  verified boolean not null default true,
  gps_lat double precision,
  gps_lng double precision,
  verified_at timestamptz default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  tx_type text not null,
  amount numeric(18,2) not null,
  direction text not null check (direction in ('credit', 'debit')),

  title text,
  description text,
  reference_id text,

  created_at timestamptz default now()
);

alter table public.hike_session_destinations
add column if not exists created_post_id uuid references public.posts(id) on delete set null;
