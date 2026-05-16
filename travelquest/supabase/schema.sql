create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  full_name text,
  bio text default '',
  avatar_url text default '',
  avatar_storage_path text default '',
  avatar_updated_at timestamptz,
  birthdate date,
  gender text default '',
  phone_country text default 'Philippines',
  phone_country_code text default '+63',
  phone_local_number text default '',
  country text default 'Philippines',
  region text default '',
  municipality text default '',
  barangay text default '',
  zip_code text default '',
  wallet_address text,
  is_profile_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_balance numeric not null default 0,
  locked_balance numeric not null default 0,
  pending_balance numeric not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tx_type text not null,
  amount numeric not null,
  direction text not null check (direction in ('credit', 'debit')),
  title text,
  description text,
  reference_id text,
  created_at timestamptz default now()
);

create table if not exists public.user_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_code text not null,
  reward_amount numeric not null default 0,
  source_reference_id text,
  claimed_at timestamptz not null default now(),
  unique (user_id, claim_code)
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  location text,
  difficulty text default 'Easy',
  reward_points numeric not null default 0,
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

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'standard',
  author_name text,
  author_avatar_url text,
  destination text,
  caption text not null,
  achievement text,
  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  event_title text,
  event_category text,
  event_difficulty text,
  join_cost numeric,
  joined_count integer default 0,
  completed_count integer default 0,
  failed_count integer default 0,
  event_capacity integer,
  initial_lat double precision,
  initial_lng double precision,
  initial_name text,
  destination_lat double precision,
  destination_lng double precision,
  destination_name text,
  event_date date,
  expiration_date date,
  start_time time,
  end_time time,
  event_description text,
  event_image_url text,
  creator_authority_name text,
  required_authority_name text,
  stake_amount numeric,
  reward_pool numeric,
  remaining_reward_pool numeric,
  burn_amount numeric,
  route_distance_km numeric,
  distance_reward_bonus numeric,
  reward_per_finisher numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  author_name text,
  author_avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined boolean not null default true,
  verified_start boolean not null default false,
  completed boolean not null default false,
  failed boolean not null default false,
  reward_claimed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (post_id, user_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null,
  tier text not null,
  target integer not null,
  description text not null,
  grants_authority text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete cascade,
  progress integer not null default 0,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_id uuid references public.destinations(id),
  gps_verified boolean default false,
  photo_verified boolean default false,
  verified boolean default false,
  gps_lat double precision,
  gps_lng double precision,
  gps_name text,
  photo_name text,
  photo_url text,
  photo_hash text,
  metadata_hash text,
  solana_signature text,
  network text default 'Solana Devnet',
  reward_amount numeric default 0,
  rewarded boolean default false,
  status text default 'pending',
  created_post_id uuid references public.posts(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.proof_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
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
  destination_id uuid references public.destinations(id) on delete set null,
  checkin_id uuid references public.checkins(id) on delete set null,
  proof_record_id uuid references public.proof_records(id) on delete set null,
  destination_name text not null,
  category text not null,
  location text,
  verified boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_sha256 text,
  solana_public_key text,
  network text default 'Solana Devnet',
  updated_at timestamptz default now()
);

create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  area text,
  next_trail_id uuid references public.trails(id),
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
  created_at timestamptz default now(),
  unique (trail_id, name)
);

create table if not exists public.trail_destinations (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails(id) on delete cascade,
  name text not null,
  destination_type text not null check (destination_type in ('Checkpoint', 'Target')),
  difficulty text not null,
  reward numeric not null default 0,
  sort_order integer default 0,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  unique (trail_id, name)
);

create table if not exists public.hike_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trail_id uuid references public.trails(id),
  selected_target_id uuid references public.trail_destinations(id),
  active boolean default false,
  trailhead_verified boolean default false,
  current_trailhead_matched boolean default false,
  target_reached boolean default false,
  status text default 'Not Started',
  total_earned numeric default 0,
  multi_destination_bonus_awarded boolean default false,
  next_trail_ready boolean default false,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hike_trailhead_verifications (
  id uuid primary key default gen_random_uuid(),
  hike_session_id uuid not null references public.hike_sessions(id) on delete cascade,
  trailhead_id uuid not null references public.trailheads(id),
  verified boolean default true,
  gps_lat double precision,
  gps_lng double precision,
  verified_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.hike_session_destinations (
  id uuid primary key default gen_random_uuid(),
  hike_session_id uuid not null references public.hike_sessions(id) on delete cascade,
  trail_destination_id uuid not null references public.trail_destinations(id),
  base_reward numeric not null default 0,
  target_bonus numeric not null default 0,
  multi_destination_bonus numeric not null default 0,
  total_added numeric not null default 0,
  created_post_id uuid references public.posts(id),
  created_at timestamptz default now()
);

create or replace view public.profile_stats
with (security_invoker = on) as
select
  p.id as user_id,
  coalesce(posts.posts_count, 0)::integer as posts_count,
  coalesce(visits.places_count, 0)::integer as places_count,
  coalesce(badges.badges_count, 0)::integer as badges_count
from public.profiles p
left join (
  select user_id, count(*) as posts_count from public.posts group by user_id
) posts on posts.user_id = p.id
left join (
  select user_id, count(distinct destination_name) as places_count
  from public.user_destination_visits
  where verified = true
  group by user_id
) visits on visits.user_id = p.id
left join (
  select user_id, count(*) as badges_count
  from public.user_achievements
  where unlocked = true
  group by user_id
) badges on badges.user_id = p.id;

create or replace view public.user_hosting_authority
with (security_invoker = on) as
select
  p.id as user_id,
  category.category,
  category.required_badge,
  exists (
    select 1
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p.id
      and ua.unlocked = true
      and a.grants_authority = category.category
  ) as authorized
from public.profiles p
cross join (
  values
    ('Hiking', 'Hike Master'),
    ('Falls', 'Waterfall Expertise'),
    ('Beach', 'Beach Explorer'),
    ('Island', 'Island Specialist')
) as category(category, required_badge);

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.user_reward_claims enable row level security;
alter table public.destinations enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.event_participants enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.checkins enable row level security;
alter table public.proof_records enable row level security;
alter table public.user_destination_visits enable row level security;
alter table public.account_security enable row level security;
alter table public.trails enable row level security;
alter table public.trailheads enable row level security;
alter table public.trail_destinations enable row level security;
alter table public.hike_sessions enable row level security;
alter table public.hike_trailhead_verifications enable row level security;
alter table public.hike_session_destinations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "wallets_own" on public.wallets;
drop policy if exists "wallet_transactions_own" on public.wallet_transactions;
drop policy if exists "user_reward_claims_own" on public.user_reward_claims;
drop policy if exists "destinations_read" on public.destinations;
drop policy if exists "destinations_insert_current_location_demo" on public.destinations;
drop policy if exists "destinations_update_current_location_demo" on public.destinations;
drop policy if exists "posts_read" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;
drop policy if exists "post_likes_read" on public.post_likes;
drop policy if exists "post_likes_own" on public.post_likes;
drop policy if exists "post_comments_read" on public.post_comments;
drop policy if exists "post_comments_insert_own" on public.post_comments;
drop policy if exists "post_comments_delete_own" on public.post_comments;
drop policy if exists "event_participants_own" on public.event_participants;
drop policy if exists "achievements_read" on public.achievements;
drop policy if exists "user_achievements_own" on public.user_achievements;
drop policy if exists "checkins_own" on public.checkins;
drop policy if exists "proof_records_own" on public.proof_records;
drop policy if exists "destination_visits_own" on public.user_destination_visits;
drop policy if exists "account_security_own" on public.account_security;
drop policy if exists "trails_read" on public.trails;
drop policy if exists "trailheads_read" on public.trailheads;
drop policy if exists "trail_destinations_read" on public.trail_destinations;
drop policy if exists "hike_sessions_own" on public.hike_sessions;
drop policy if exists "hike_trailhead_verifications_own" on public.hike_trailhead_verifications;
drop policy if exists "hike_session_destinations_own" on public.hike_session_destinations;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "wallets_own" on public.wallets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wallet_transactions_own" on public.wallet_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_reward_claims_own" on public.user_reward_claims for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "destinations_read" on public.destinations for select to authenticated using (true);
create policy "destinations_insert_current_location_demo" on public.destinations
  for insert to authenticated
  with check (name = 'Current Location Demo');
create policy "destinations_update_current_location_demo" on public.destinations
  for update to authenticated
  using (name = 'Current Location Demo')
  with check (name = 'Current Location Demo');
create policy "posts_read" on public.posts for select to authenticated using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);
create policy "post_likes_read" on public.post_likes for select to authenticated using (true);
create policy "post_likes_own" on public.post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "post_comments_read" on public.post_comments for select to authenticated using (true);
create policy "post_comments_insert_own" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "post_comments_delete_own" on public.post_comments for delete using (auth.uid() = user_id);
create policy "event_participants_own" on public.event_participants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "achievements_read" on public.achievements for select to authenticated using (true);
create policy "user_achievements_own" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "checkins_own" on public.checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "proof_records_own" on public.proof_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "destination_visits_own" on public.user_destination_visits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "account_security_own" on public.account_security for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trails_read" on public.trails for select to authenticated using (true);
create policy "trailheads_read" on public.trailheads for select to authenticated using (true);
create policy "trail_destinations_read" on public.trail_destinations for select to authenticated using (true);
create policy "hike_sessions_own" on public.hike_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hike_trailhead_verifications_own" on public.hike_trailhead_verifications
  for all using (
    exists (
      select 1 from public.hike_sessions hs
      where hs.id = hike_session_id and hs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hike_sessions hs
      where hs.id = hike_session_id and hs.user_id = auth.uid()
    )
  );
create policy "hike_session_destinations_own" on public.hike_session_destinations
  for all using (
    exists (
      select 1 from public.hike_sessions hs
      where hs.id = hike_session_id and hs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hike_sessions hs
      where hs.id = hike_session_id and hs.user_id = auth.uid()
    )
  );

create or replace function public.refresh_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    likes_count = (
      select count(*)::int
      from public.post_likes
      where post_id = coalesce(new.post_id, old.post_id)
    ),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    comments_count = (
      select count(*)::int
      from public.post_comments
      where post_id = coalesce(new.post_id, old.post_id)
    ),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_post_likes_count_after_change on public.post_likes;
create trigger refresh_post_likes_count_after_change
after insert or delete on public.post_likes
for each row execute function public.refresh_post_likes_count();

drop trigger if exists refresh_post_comments_count_after_change on public.post_comments;
create trigger refresh_post_comments_count_after_change
after insert or delete on public.post_comments
for each row execute function public.refresh_post_comments_count();

create or replace function public.refresh_event_participant_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    joined_count = (
      select count(*)::int
      from public.event_participants
      where post_id = coalesce(new.post_id, old.post_id)
        and joined = true
    ),
    completed_count = (
      select count(*)::int
      from public.event_participants
      where post_id = coalesce(new.post_id, old.post_id)
        and completed = true
    ),
    failed_count = (
      select count(*)::int
      from public.event_participants
      where post_id = coalesce(new.post_id, old.post_id)
        and failed = true
    ),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_event_participant_counts_after_change on public.event_participants;
create trigger refresh_event_participant_counts_after_change
after insert or update or delete on public.event_participants
for each row execute function public.refresh_event_participant_counts();

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true),
       ('event-images', 'event-images', true),
       ('checkin-photos', 'checkin-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile_images_read" on storage.objects;
drop policy if exists "profile_images_write_own" on storage.objects;
drop policy if exists "event_images_read" on storage.objects;
drop policy if exists "event_images_write_own" on storage.objects;
drop policy if exists "checkin_photos_read" on storage.objects;
drop policy if exists "checkin_photos_write_own" on storage.objects;

create policy "profile_images_read" on storage.objects
  for select using (bucket_id = 'profile-images');
create policy "profile_images_write_own" on storage.objects
  for all using (
    bucket_id = 'profile-images'
    and name like 'avatars/' || auth.uid()::text || '-%'
  )
  with check (
    bucket_id = 'profile-images'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );
create policy "event_images_read" on storage.objects
  for select using (bucket_id = 'event-images');
create policy "event_images_write_own" on storage.objects
  for all using (
    bucket_id = 'event-images'
    and name like 'events/' || auth.uid()::text || '-%'
  )
  with check (
    bucket_id = 'event-images'
    and name like 'events/' || auth.uid()::text || '-%'
  );
create policy "checkin_photos_read" on storage.objects
  for select using (bucket_id = 'checkin-photos');
create policy "checkin_photos_write_own" on storage.objects
  for all using (
    bucket_id = 'checkin-photos'
    and name like 'checkins/' || auth.uid()::text || '-%'
  )
  with check (
    bucket_id = 'checkin-photos'
    and name like 'checkins/' || auth.uid()::text || '-%'
  );

insert into public.destinations
  (name, category, location, difficulty, reward_points, requires_qr, description, hero, image_url, start_lat, start_lng, dest_lat, dest_lng)
values
  ('CIT-U Main Campus', 'Hiking', 'N. Bacalso Avenue, Cebu City', 'Easy', 1000, false, 'Demo campus destination for testing live GPS, camera proof, and geofence check-in around Cebu Institute of Technology - University.', 'Campus proof run', 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80', 10.29508, 123.88022, 10.29578, 123.88044),
  ('Kawasan Falls', 'Falls', 'Badian, Cebu', 'Easy', 20, false, 'A famous multi-tiered waterfall destination known for turquoise water and canyon activities.', 'Waterfall explorer', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 9.8005, 123.365, 9.8167, 123.3747),
  ('Osmena Peak', 'Hiking', 'Dalaguete, Cebu', 'Moderate', 30, false, 'A scenic mountain destination popular for sunrise hikes and panoramic ridge views.', 'Summit tracker', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', 9.785, 123.596, 9.7993, 123.6072),
  ('Bantayan Island', 'Island', 'Cebu', 'Easy', 25, false, 'A well-known island destination with beaches, resorts, and clear coastal views.', 'Island escape', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 11.244, 123.941, 11.2614, 123.9543),
  ('Moalboal White Beach', 'Beach', 'Moalboal, Cebu', 'Easy', 15, false, 'A coastal destination for beach trips, sunsets, and marine activities.', 'Coastal check-in', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80', 9.932, 123.39, 9.9439, 123.3995)
on conflict (name) do update set
  category = excluded.category,
  location = excluded.location,
  difficulty = excluded.difficulty,
  reward_points = excluded.reward_points,
  requires_qr = excluded.requires_qr,
  description = excluded.description,
  hero = excluded.hero,
  image_url = excluded.image_url,
  start_lat = excluded.start_lat,
  start_lng = excluded.start_lng,
  dest_lat = excluded.dest_lat,
  dest_lng = excluded.dest_lng;

insert into public.achievements
  (code, name, category, tier, target, description, grants_authority)
values
  ('hike-master', 'Hike Master', 'Authority', 'Advanced', 1, 'Grants authority to create hiking events at any difficulty level.', 'Hiking'),
  ('waterfall-expertise', 'Waterfall Expertise', 'Authority', 'Advanced', 1, 'Grants authority to create waterfall events at any difficulty level.', 'Falls'),
  ('beach-explorer', 'Beach Explorer', 'Authority', 'Beginner', 1, 'Grants authority to create beach events once unlocked.', 'Beach'),
  ('island-specialist', 'Island Specialist', 'Authority', 'Expert', 1, 'Grants authority to create island events once unlocked.', 'Island'),
  ('falls-explorer', 'Falls Explorer', 'Falls', 'Advanced', 5, 'Visit 5 verified falls.', null),
  ('trail-starter', 'Trail Starter', 'Hiking', 'Beginner', 1, 'Complete 1 verified hiking destination.', null),
  ('trail-expert', 'Trail Expert', 'Hiking', 'Expert', 10, 'Complete 10 verified hiking destinations.', null),
  ('island-hopper', 'Island Hopper', 'Island', 'Beginner', 3, 'Visit 3 verified islands.', null),
  ('coastal-wanderer', 'Coastal Wanderer', 'Beach', 'Advanced', 5, 'Visit 5 verified beaches.', null)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  tier = excluded.tier,
  target = excluded.target,
  description = excluded.description,
  grants_authority = excluded.grants_authority;

with first_trail as (
  insert into public.trails (code, name, area)
  values ('paseo-ridge-network', 'Paseo Ridge Network', 'Cebu Highlands')
  on conflict (code) do update set name = excluded.name, area = excluded.area
  returning id
), second_trail as (
  insert into public.trails (code, name, area)
  values ('pahamutan-extension-trail', 'Pahamutan Extension Trail', 'Cebu Highlands')
  on conflict (code) do update set name = excluded.name, area = excluded.area
  returning id
)
update public.trails
set next_trail_id = (select id from second_trail)
where id = (select id from first_trail);

insert into public.trailheads (trail_id, name, location, lat, lng)
select id, 'Paseo Trailhead', 'Paseo Arcenas, Banawa, Cebu City', 10.30979, 123.87455
from public.trails where code = 'paseo-ridge-network'
on conflict do nothing;

insert into public.trailheads (trail_id, name, location, lat, lng)
select id, 'Pahamutan Junction Trailhead', 'Connected next trail start', 10.29780, 123.87820
from public.trails where code = 'pahamutan-extension-trail'
on conflict do nothing;

insert into public.trail_destinations (trail_id, name, destination_type, difficulty, reward, sort_order)
select t.id, v.name, v.destination_type, v.difficulty, v.reward, v.sort_order
from public.trails t
join (
  values
    ('paseo-ridge-network', 'Starbuk Viewpoint', 'Checkpoint', 'Moderate', 20, 0),
    ('paseo-ridge-network', 'Pahamutan Peak', 'Target', 'Hard', 30, 1),
    ('pahamutan-extension-trail', 'Cedar Camp Stop', 'Checkpoint', 'Moderate', 20, 0),
    ('pahamutan-extension-trail', 'Eagle Crest Summit', 'Target', 'Expert', 40, 1)
) as v(code, name, destination_type, difficulty, reward, sort_order)
  on t.code = v.code
where not exists (
  select 1 from public.trail_destinations existing
  where existing.trail_id = t.id and existing.name = v.name
);
