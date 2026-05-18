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

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  updated_at timestamptz default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create unique index if not exists friend_requests_pair_unique
on public.friend_requests (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
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
with authority_users as (
  select auth.uid() as id
  where auth.uid() is not null
  union
  select id from public.profiles
),
required_authorities as (
  select 'Hiking'::text as category, 'Hike Master'::text as required_badge
  union all
  select 'Falls', 'Waterfall Expertise'
  union all
  select 'Beach', 'Beach Explorer'
  union all
  select 'Island', 'Island Specialist'
)
select
  u.id as user_id,
  ra.category,
  ra.required_badge,
  exists (
    select 1
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = u.id
      and ua.unlocked = true
      and a.grants_authority = ra.category
  ) as authorized
from authority_users u
cross join required_authorities ra;

create or replace function public.refresh_user_achievement_progress(
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_counts jsonb := '{}'::jsonb;
  v_total integer := 0;
  v_count integer;
  v_progress integer;
  achievement record;
begin
  if v_user_id is null then
    raise exception 'User id is required to refresh achievements.';
  end if;

  if auth.uid() is not null and auth.uid() <> v_user_id then
    raise exception 'Cannot refresh achievements for another user.';
  end if;

  with raw_completions as (
    select coalesce(nullif(d.category, ''), nullif(udv.category, '')) as category
    from public.user_destination_visits udv
    left join public.destinations d on d.id = udv.destination_id
    where udv.user_id = v_user_id
      and coalesce(udv.verified, true) = true

    union all

    select 'Hiking'::text as category
    from public.hike_session_destinations hsd
    join public.hike_sessions hs on hs.id = hsd.hike_session_id
    where hs.user_id = v_user_id

    union all

    select p.event_category as category
    from public.event_participants ep
    join public.posts p on p.id = ep.post_id
    where ep.user_id = v_user_id
      and ep.completed = true
      and p.event_category is not null
  ),
  category_counts as (
    select category, count(*)::integer as total
    from raw_completions
    where category in ('Hiking', 'Falls', 'Beach', 'Island')
    group by category
  )
  select
    coalesce(jsonb_object_agg(category, total), '{}'::jsonb),
    coalesce(sum(total), 0)::integer
  into v_counts, v_total
  from category_counts;

  for achievement in
    select id, code, category, target, grants_authority
    from public.achievements
    order by created_at asc
  loop
    v_count := case
      when achievement.code = 'first-checkin' then v_total
      when achievement.grants_authority is not null then
        coalesce((v_counts ->> achievement.grants_authority)::integer, 0)
      else coalesce((v_counts ->> achievement.category)::integer, 0)
    end;
    v_progress := least(v_count, achievement.target);

    insert into public.user_achievements (
      user_id,
      achievement_id,
      progress,
      unlocked,
      unlocked_at,
      updated_at
    )
    values (
      v_user_id,
      achievement.id,
      v_progress,
      v_progress >= achievement.target,
      case when v_progress >= achievement.target then now() else null end,
      now()
    )
    on conflict (user_id, achievement_id) do update set
      progress = excluded.progress,
      unlocked = public.user_achievements.unlocked or excluded.unlocked,
      unlocked_at = case
        when public.user_achievements.unlocked_at is not null then public.user_achievements.unlocked_at
        when excluded.unlocked then now()
        else null
      end,
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.search_travelers(p_query text default '')
returns table (
  user_id uuid,
  display_name text,
  full_name text,
  bio text,
  avatar_url text,
  location text,
  posts_count integer,
  places_count integer,
  badges_count integer,
  friend_request_id uuid,
  friendship_status text,
  friendship_direction text,
  friend_since timestamptz
)
language sql
security definer
set search_path = public
as $$
  with current_user_id as (
    select auth.uid() as id
  ),
  matching_profiles as (
    select p.*
    from public.profiles p, current_user_id cu
    where cu.id is not null
      and p.id <> cu.id
      and coalesce(p.is_profile_complete, false) = true
      and (
        nullif(trim(p_query), '') is null
        or p.display_name ilike '%' || trim(p_query) || '%'
        or p.full_name ilike '%' || trim(p_query) || '%'
      )
    order by coalesce(nullif(p.display_name, ''), p.full_name, 'Traveler')
    limit 20
  )
  select
    p.id as user_id,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), 'Traveler') as display_name,
    p.full_name,
    coalesce(p.bio, '') as bio,
    coalesce(p.avatar_url, '') as avatar_url,
    concat_ws(', ', nullif(p.municipality, ''), nullif(p.region, ''), nullif(p.country, '')) as location,
    coalesce(ps.posts_count, 0)::integer as posts_count,
    coalesce(ps.places_count, 0)::integer as places_count,
    coalesce(ps.badges_count, 0)::integer as badges_count,
    fr.id as friend_request_id,
    coalesce(fr.status, 'none') as friendship_status,
    case
      when fr.id is null then 'none'
      when fr.requester_id = cu.id then 'outgoing'
      when fr.addressee_id = cu.id then 'incoming'
      else 'none'
    end as friendship_direction,
    case when fr.status = 'accepted' then fr.responded_at else null end as friend_since
  from matching_profiles p
  cross join current_user_id cu
  left join public.profile_stats ps on ps.user_id = p.id
  left join public.friend_requests fr
    on (
      (fr.requester_id = cu.id and fr.addressee_id = p.id)
      or (fr.requester_id = p.id and fr.addressee_id = cu.id)
    );
$$;

create or replace function public.get_friend_list()
returns table (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  location text,
  posts_count integer,
  places_count integer,
  badges_count integer,
  friend_request_id uuid,
  friend_since timestamptz
)
language sql
security definer
set search_path = public
as $$
  with current_user_id as (
    select auth.uid() as id
  ),
  accepted_friends as (
    select
      fr.id as request_id,
      case
        when fr.requester_id = cu.id then fr.addressee_id
        else fr.requester_id
      end as friend_id,
      fr.responded_at
    from public.friend_requests fr
    cross join current_user_id cu
    where cu.id is not null
      and fr.status = 'accepted'
      and cu.id in (fr.requester_id, fr.addressee_id)
  )
  select
    p.id as user_id,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), 'Traveler') as display_name,
    coalesce(p.bio, '') as bio,
    coalesce(p.avatar_url, '') as avatar_url,
    concat_ws(', ', nullif(p.municipality, ''), nullif(p.region, ''), nullif(p.country, '')) as location,
    coalesce(ps.posts_count, 0)::integer as posts_count,
    coalesce(ps.places_count, 0)::integer as places_count,
    coalesce(ps.badges_count, 0)::integer as badges_count,
    af.request_id as friend_request_id,
    af.responded_at as friend_since
  from accepted_friends af
  join public.profiles p on p.id = af.friend_id
  left join public.profile_stats ps on ps.user_id = p.id
  order by af.responded_at desc nulls last;
$$;

create or replace function public.get_traveler_achievements(p_user_id uuid)
returns table (
  achievement_id uuid,
  name text,
  category text,
  tier text,
  target integer,
  description text,
  grants_authority text,
  progress integer,
  unlocked boolean
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as achievement_id,
    a.name,
    a.category,
    a.tier,
    a.target,
    a.description,
    a.grants_authority,
    coalesce(ua.progress, 0)::integer as progress,
    coalesce(ua.unlocked, false) as unlocked
  from public.achievements a
  left join public.user_achievements ua
    on ua.achievement_id = a.id and ua.user_id = p_user_id
  where auth.uid() = p_user_id
    or exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = auth.uid() and fr.addressee_id = p_user_id)
          or (fr.requester_id = p_user_id and fr.addressee_id = auth.uid())
        )
    )
  order by a.created_at asc;
$$;

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
alter table public.friend_requests enable row level security;
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
drop policy if exists "friend_requests_participants_read" on public.friend_requests;
drop policy if exists "friend_requests_requester_insert" on public.friend_requests;
drop policy if exists "friend_requests_participants_update" on public.friend_requests;
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
create policy "friend_requests_participants_read" on public.friend_requests
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy "friend_requests_requester_insert" on public.friend_requests
  for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);
create policy "friend_requests_participants_update" on public.friend_requests
  for update to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));

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
drop policy if exists "checkin_photos_insert_own" on storage.objects;
drop policy if exists "checkin_photos_update_own" on storage.objects;
drop policy if exists "checkin_photos_delete_own" on storage.objects;

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
  for select to authenticated using (bucket_id = 'checkin-photos');
create policy "checkin_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  );
create policy "checkin_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  )
  with check (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  );
create policy "checkin_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
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
  ('first-checkin', 'First Check-In', 'Hiking', 'Beginner', 1, 'Complete your first verified destination check-in.', null),
  ('trail-starter', 'Trail Starter', 'Hiking', 'Beginner', 1, 'Complete 1 verified hiking destination.', null),
  ('trail-regular', 'Trail Regular', 'Hiking', 'Beginner', 2, 'Complete 2 verified hiking destinations.', null),
  ('ridge-runner', 'Ridge Runner', 'Hiking', 'Advanced', 3, 'Complete 3 verified hiking destinations.', null),
  ('summit-keeper', 'Summit Keeper', 'Hiking', 'Expert', 5, 'Complete 5 verified hiking destinations.', null),
  ('trail-expert', 'Trail Expert', 'Hiking', 'Expert', 10, 'Complete 10 verified hiking destinations.', null),
  ('hike-master', 'Hike Master', 'Authority', 'Advanced', 3, 'Unlock hiking event hosting after 3 verified hiking completions.', 'Hiking'),
  ('waterfall-finder', 'Waterfall Finder', 'Falls', 'Beginner', 1, 'Complete 1 verified falls destination.', null),
  ('falls-explorer', 'Falls Explorer', 'Falls', 'Beginner', 2, 'Complete 2 verified falls destinations.', null),
  ('cascade-chaser', 'Cascade Chaser', 'Falls', 'Advanced', 3, 'Complete 3 verified falls destinations.', null),
  ('mist-master', 'Mist Master', 'Falls', 'Expert', 5, 'Complete 5 verified falls destinations.', null),
  ('waterfall-expertise', 'Waterfall Expertise', 'Authority', 'Advanced', 3, 'Unlock falls event hosting after 3 verified falls completions.', 'Falls'),
  ('beach-day', 'Beach Day', 'Beach', 'Beginner', 1, 'Complete 1 verified beach destination.', null),
  ('coastal-wanderer', 'Coastal Wanderer', 'Beach', 'Beginner', 2, 'Complete 2 verified beach destinations.', null),
  ('shoreline-regular', 'Shoreline Regular', 'Beach', 'Advanced', 3, 'Complete 3 verified beach destinations.', null),
  ('coast-legend', 'Coast Legend', 'Beach', 'Expert', 5, 'Complete 5 verified beach destinations.', null),
  ('beach-explorer', 'Beach Explorer', 'Authority', 'Advanced', 3, 'Unlock beach event hosting after 3 verified beach completions.', 'Beach'),
  ('island-scout', 'Island Scout', 'Island', 'Beginner', 1, 'Complete 1 verified island destination.', null),
  ('island-hopper', 'Island Hopper', 'Island', 'Beginner', 3, 'Visit 3 verified islands.', null),
  ('archipelago-guide', 'Archipelago Guide', 'Island', 'Advanced', 4, 'Complete 4 verified island destinations.', null),
  ('island-legend', 'Island Legend', 'Island', 'Expert', 6, 'Complete 6 verified island destinations.', null),
  ('island-specialist', 'Island Specialist', 'Authority', 'Advanced', 3, 'Unlock island event hosting after 3 verified island completions.', 'Island')
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  tier = excluded.tier,
  target = excluded.target,
  description = excluded.description,
  grants_authority = excluded.grants_authority,
  updated_at = now();

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
