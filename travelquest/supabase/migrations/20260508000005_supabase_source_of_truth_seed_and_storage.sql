insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true),
       ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile_images_read" on storage.objects;
drop policy if exists "profile_images_write_own" on storage.objects;
drop policy if exists "event_images_read" on storage.objects;
drop policy if exists "event_images_write_own" on storage.objects;

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

alter table public.wallets
alter column available_balance set default 0;

create or replace view public.profile_stats
with (security_invoker = on) as
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

create or replace view public.user_hosting_authority
with (security_invoker = on) as
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
    join public.achievements a
      on a.id = ua.achievement_id
    where ua.user_id = p.id
      and ua.unlocked = true
      and a.grants_authority = ra.category
  ) as authorized
from public.profiles p
cross join required_authorities ra;

create unique index if not exists destinations_name_key on public.destinations (name);
create unique index if not exists trailheads_trail_id_name_key on public.trailheads (trail_id, name);
create unique index if not exists trail_destinations_trail_id_name_key on public.trail_destinations (trail_id, name);

insert into public.destinations
  (name, category, location, difficulty, reward_points, requires_qr, description, hero, image_url, start_lat, start_lng, dest_lat, dest_lng)
values
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

insert into public.trailheads (trail_id, name, location)
select id, 'Paseo Trailhead', 'Registered initial hiking point'
from public.trails where code = 'paseo-ridge-network'
on conflict (trail_id, name) do update set location = excluded.location;

insert into public.trailheads (trail_id, name, location)
select id, 'Pahamutan Junction Trailhead', 'Connected next trail start'
from public.trails where code = 'pahamutan-extension-trail'
on conflict (trail_id, name) do update set location = excluded.location;

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
on conflict (trail_id, name) do update set
  destination_type = excluded.destination_type,
  difficulty = excluded.difficulty,
  reward = excluded.reward,
  sort_order = excluded.sort_order;
