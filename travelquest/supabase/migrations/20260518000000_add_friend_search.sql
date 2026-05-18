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

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_participants_read" on public.friend_requests;
drop policy if exists "friend_requests_requester_insert" on public.friend_requests;
drop policy if exists "friend_requests_participants_update" on public.friend_requests;

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
