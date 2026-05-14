create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  category text not null,
  location text,
  difficulty text,
  reward_points numeric(18,2) default 0,
  requires_qr boolean default false,

  description text,
  hero text,
  image_url text,

  start_lat double precision,
  start_lng double precision,
  dest_lat double precision,
  dest_lng double precision,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  destination_id uuid not null references public.destinations(id) on delete cascade,

  gps_verified boolean not null default false,
  photo_verified boolean not null default false,
  verified boolean not null default false,

  gps_lat double precision,
  gps_lng double precision,
  gps_name text,

  photo_name text,
  photo_url text,
  photo_hash text,

  metadata_hash text,
  solana_signature text,
  network text default 'Solana Devnet',

  reward_amount numeric(18,2) default 0,
  rewarded boolean not null default false,

  status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed')),

  created_post_id uuid references public.posts(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.checkins
add column if not exists qr_verified boolean default false,
add column if not exists qr_code_value text;

alter table public.proof_records
add column if not exists checkin_id uuid references public.checkins(id) on delete cascade,
add column if not exists destination_id uuid references public.destinations(id) on delete set null;

alter table public.user_destination_visits
add column if not exists destination_id uuid references public.destinations(id) on delete set null,
add column if not exists checkin_id uuid references public.checkins(id) on delete set null;

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
