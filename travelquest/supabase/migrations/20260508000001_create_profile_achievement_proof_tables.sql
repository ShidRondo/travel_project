create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),

  code text unique,
  name text not null,
  category text not null,
  tier text not null check (tier in ('Beginner', 'Advanced', 'Expert')),
  target integer not null default 1,
  description text not null,

  grants_authority text,
  created_at timestamptz default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,

  progress integer not null default 0,
  unlocked boolean not null default false,
  unlocked_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (user_id, achievement_id)
);

insert into public.achievements
  (code, name, category, tier, target, description, grants_authority)
values
  (
    'hike-master',
    'Hike Master',
    'Authority',
    'Advanced',
    1,
    'Grants authority to create hiking events at any difficulty level.',
    'Hiking'
  ),
  (
    'waterfall-expertise',
    'Waterfall Expertise',
    'Authority',
    'Advanced',
    1,
    'Grants authority to create waterfall events at any difficulty level.',
    'Falls'
  ),
  (
    'beach-explorer',
    'Beach Explorer',
    'Authority',
    'Beginner',
    1,
    'Grants authority to create beach events once unlocked.',
    'Beach'
  ),
  (
    'island-specialist',
    'Island Specialist',
    'Authority',
    'Expert',
    1,
    'Grants authority to create island events once unlocked.',
    'Island'
  ),
  (
    'falls-explorer',
    'Falls Explorer',
    'Falls',
    'Advanced',
    5,
    'Visit 5 verified falls.',
    null
  ),
  (
    'trail-starter',
    'Trail Starter',
    'Hiking',
    'Beginner',
    1,
    'Complete 1 verified hiking destination.',
    null
  ),
  (
    'trail-expert',
    'Trail Expert',
    'Hiking',
    'Expert',
    10,
    'Complete 10 verified hiking destinations.',
    null
  ),
  (
    'island-hopper',
    'Island Hopper',
    'Island',
    'Beginner',
    3,
    'Visit 3 verified islands.',
    null
  ),
  (
    'coastal-wanderer',
    'Coastal Wanderer',
    'Beach',
    'Advanced',
    5,
    'Visit 5 verified beaches.',
    null
  )
on conflict (code) do update
set
  name = excluded.name,
  category = excluded.category,
  tier = excluded.tier,
  target = excluded.target,
  description = excluded.description,
  grants_authority = excluded.grants_authority;

create table if not exists public.proof_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  destination text not null,

  gps_lat double precision not null,
  gps_lng double precision not null,
  gps_name text,

  photo_name text,
  photo_hash text not null,
  metadata_hash text not null,
  solana_signature text not null,
  network text not null default 'Solana Devnet',

  created_at timestamptz default now()
);

create table if not exists public.user_destination_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  destination_name text not null,
  category text,
  location text,

  verified boolean not null default true,
  proof_record_id uuid references public.proof_records(id) on delete set null,

  visited_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  display_name text,
  full_name text,
  bio text,

  avatar_url text,
  avatar_storage_path text,
  avatar_updated_at timestamptz,

  birthdate date,
  gender text,
  is_profile_complete boolean default false,

  phone_country text,
  phone_country_code text,
  phone_local_number text,

  country text,
  region text,
  municipality text,
  barangay text,
  zip_code text,

  wallet_address text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
add column if not exists display_name text,
add column if not exists full_name text,
add column if not exists bio text,
add column if not exists avatar_url text,
add column if not exists avatar_storage_path text,
add column if not exists avatar_updated_at timestamptz,
add column if not exists birthdate date,
add column if not exists gender text,
add column if not exists is_profile_complete boolean default false,
add column if not exists phone_country text,
add column if not exists phone_country_code text,
add column if not exists phone_local_number text,
add column if not exists country text,
add column if not exists region text,
add column if not exists municipality text,
add column if not exists barangay text,
add column if not exists zip_code text,
add column if not exists wallet_address text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

create table if not exists public.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,

  password_sha256 text,
  solana_public_key text,
  network text default 'Solana Devnet',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace view public.profile_stats as
select
  p.id as user_id,
  coalesce(post_counts.posts_count, 0) as posts_count,
  coalesce(place_counts.places_count, 0) as places_count,
  coalesce(badge_counts.badges_count, 0) as badges_count
from public.profiles p
left join (
  select user_id, count(*)::int as posts_count
  from public.posts
  group by user_id
) post_counts
  on post_counts.user_id = p.id
left join (
  select user_id, count(distinct destination_name)::int as places_count
  from public.user_destination_visits
  where verified = true
  group by user_id
) place_counts
  on place_counts.user_id = p.id
left join (
  select ua.user_id, count(*)::int as badges_count
  from public.user_achievements ua
  where ua.unlocked = true
  group by ua.user_id
) badge_counts
  on badge_counts.user_id = p.id;

create or replace view public.user_hosting_authority as
with required_authorities as (
  select 'Hiking'::text as category, 'Hike Master'::text as required_badge
  union all
  select 'Falls', 'Waterfall Expertise'
  union all
  select 'Beach', 'Beach Explorer'
  union all
  select 'Island', 'Island Specialist'
)
select
  p.id as user_id,
  ra.category,
  ra.required_badge,
  exists (
    select 1
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p.id
      and ua.unlocked = true
      and a.name = ra.required_badge
  ) as authorized
from public.profiles p
cross join required_authorities ra;
