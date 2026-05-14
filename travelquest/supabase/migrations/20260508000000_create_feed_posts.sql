create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  post_type text not null check (post_type in ('standard', 'event')) default 'standard',

  author_name text,
  author_avatar_url text,

  destination text,
  caption text not null,
  achievement text,

  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts
add column if not exists event_title text,
add column if not exists event_category text,
add column if not exists event_difficulty text,
add column if not exists join_cost numeric(18,2),
add column if not exists joined_count integer default 0,
add column if not exists completed_count integer default 0,
add column if not exists failed_count integer default 0,
add column if not exists event_capacity integer,

add column if not exists initial_lat double precision,
add column if not exists initial_lng double precision,
add column if not exists initial_name text,

add column if not exists destination_lat double precision,
add column if not exists destination_lng double precision,
add column if not exists destination_name text,

add column if not exists event_date date,
add column if not exists expiration_date date,
add column if not exists start_time time,
add column if not exists end_time time,

add column if not exists event_description text,
add column if not exists event_image_url text,

add column if not exists creator_authority_name text,
add column if not exists required_authority_name text,

add column if not exists stake_amount numeric(18,2),
add column if not exists reward_pool numeric(18,2),
add column if not exists remaining_reward_pool numeric(18,2),
add column if not exists burn_amount numeric(18,2),
add column if not exists route_distance_km numeric(10,2),
add column if not exists distance_reward_bonus numeric(18,2),
add column if not exists reward_per_finisher numeric(18,2);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
