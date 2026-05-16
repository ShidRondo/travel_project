create unique index if not exists achievements_code_key on public.achievements (code);
create unique index if not exists destinations_name_key on public.destinations (name);

insert into public.achievements
  (code, name, category, tier, target, description, grants_authority)
values
  ('first-checkin', 'First Check-In', 'Hiking', 'Beginner', 1, 'Complete your first verified destination check-in.', null),
  ('trail-starter', 'Trail Starter', 'Hiking', 'Beginner', 1, 'Complete 1 verified hiking destination.', null),
  ('trail-regular', 'Trail Regular', 'Hiking', 'Beginner', 2, 'Complete 2 verified hiking destinations.', null),
  ('cebu-weekender', 'Cebu Weekender', 'Hiking', 'Advanced', 3, 'Complete 3 verified Cebu destinations.', null),
  ('hike-master', 'Hike Master', 'Authority', 'Advanced', 1, 'Unlocks hiking event hosting authority. Hiking events are open for the demo build.', 'Hiking'),
  ('waterfall-finder', 'Waterfall Finder', 'Falls', 'Beginner', 1, 'Complete 1 verified falls destination.', null),
  ('falls-explorer', 'Falls Explorer', 'Falls', 'Beginner', 2, 'Complete 2 verified falls destinations.', null),
  ('waterfall-expertise', 'Waterfall Expertise', 'Authority', 'Advanced', 1, 'Grants authority to create waterfall events.', 'Falls'),
  ('beach-day', 'Beach Day', 'Beach', 'Beginner', 1, 'Complete 1 verified beach destination.', null),
  ('coastal-wanderer', 'Coastal Wanderer', 'Beach', 'Beginner', 2, 'Complete 2 verified beach destinations.', null),
  ('beach-explorer', 'Beach Explorer', 'Authority', 'Beginner', 1, 'Grants authority to create beach events.', 'Beach'),
  ('island-scout', 'Island Scout', 'Island', 'Beginner', 1, 'Complete 1 verified island destination.', null),
  ('island-hopper', 'Island Hopper', 'Island', 'Beginner', 2, 'Complete 2 verified island destinations.', null),
  ('island-specialist', 'Island Specialist', 'Authority', 'Advanced', 1, 'Grants authority to create island events.', 'Island')
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  tier = excluded.tier,
  target = excluded.target,
  description = excluded.description,
  grants_authority = excluded.grants_authority,
  updated_at = now();

insert into public.destinations
  (name, category, location, difficulty, reward_points, requires_qr, description, hero, image_url, start_lat, start_lng, dest_lat, dest_lng)
values
  ('Sirao Garden', 'Hiking', 'Busay, Cebu City', 'Easy', 18, false, 'A hillside garden route with bright flower terraces and quick city-view stops.', 'Flower ridge check-in', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80', 10.36620, 123.86980, 10.36840, 123.87130),
  ('Temple of Leah', 'Hiking', 'Busay, Cebu City', 'Easy', 16, false, 'A scenic uphill landmark with wide terraces overlooking Cebu City.', 'City overlook proof', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 10.36800, 123.87030, 10.36970, 123.87210),
  ('Casino Peak', 'Hiking', 'Lugsangan, Dalaguete, Cebu', 'Moderate', 28, false, 'A short but rewarding ridge climb with sharp green hills and summit views.', 'Ridge summit run', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', 9.81270, 123.51630, 9.81520, 123.51880),
  ('Mount Manunggal', 'Hiking', 'Balamban, Cebu', 'Moderate', 30, false, 'A cool highland hike with historical markers and forested trail sections.', 'Highland heritage trail', 'https://images.unsplash.com/photo-1445307806294-bff7f67ff225?auto=format&fit=crop&w=1200&q=80', 10.45050, 123.74220, 10.45320, 123.74470),
  ('Tumalog Falls', 'Falls', 'Oslob, Cebu', 'Easy', 20, false, 'A curtain-like waterfall with a gentle basin and easy approach path.', 'Mist curtain check-in', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 9.47240, 123.39480, 9.47400, 123.39610),
  ('Dao Falls', 'Falls', 'Samboan, Cebu', 'Moderate', 26, false, 'A canyon-style falls route with a scenic river walk before the main cascade.', 'Canyon falls proof', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80', 9.53720, 123.30620, 9.53920, 123.30810),
  ('Inambakan Falls', 'Falls', 'Ginatilan, Cebu', 'Easy', 22, false, 'A layered waterfall destination with turquoise pools and shaded paths.', 'Blue pool visit', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', 9.57500, 123.32900, 9.57660, 123.33070),
  ('Mantayupan Falls', 'Falls', 'Barili, Cebu', 'Easy', 20, false, 'A tall waterfall stop with a compact walk from the arrival area.', 'Tall falls check-in', 'https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?auto=format&fit=crop&w=1200&q=80', 10.10880, 123.51080, 10.11020, 123.51210),
  ('Lambug Beach', 'Beach', 'Badian, Cebu', 'Easy', 18, false, 'A laid-back white-sand beach stop near Badian with calm shoreline views.', 'White sand proof', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 9.85020, 123.39580, 9.85200, 123.39720),
  ('Hermits Cove', 'Beach', 'Aloguinsan, Cebu', 'Easy', 18, false, 'A small cove beach with clear water, cliffs, and a quieter coastal feel.', 'Hidden cove visit', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80', 10.18760, 123.54820, 10.18930, 123.54970),
  ('Tingko Beach', 'Beach', 'Alcoy, Cebu', 'Easy', 16, false, 'A bright public beach route with shallow water and simple check-in access.', 'South Cebu beach day', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', 9.70920, 123.50800, 9.71070, 123.50930),
  ('Basdaku White Beach', 'Beach', 'Moalboal, Cebu', 'Easy', 18, false, 'A wide white-sand beach destination for coastal proof runs and sunset visits.', 'Moalboal beach proof', 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=1200&q=80', 9.95050, 123.36950, 9.95200, 123.37100),
  ('Nalusuan Island', 'Island', 'Cordova, Cebu', 'Moderate', 30, false, 'A small island destination known for marine sanctuary views and boardwalk photos.', 'Marine island check-in', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 10.17880, 123.95550, 10.18020, 123.95720),
  ('Sumilon Island', 'Island', 'Oslob, Cebu', 'Moderate', 32, false, 'An island sandbar destination with blue water and compact walking routes.', 'Sandbar proof run', 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80', 9.42570, 123.38930, 9.42740, 123.39100),
  ('Malapascua Island', 'Island', 'Daanbantayan, Cebu', 'Moderate', 34, false, 'A northern island destination with beach paths, boat arrivals, and coastal proof spots.', 'Northern island visit', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 11.33080, 124.11690, 11.33260, 124.11850),
  ('Camotes Lake Danao', 'Island', 'San Francisco, Camotes, Cebu', 'Easy', 24, false, 'A calm island lake stop for easy travel proof and scenic route photos.', 'Island lake check-in', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', 10.66140, 124.31680, 10.66320, 124.31840)
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
  dest_lng = excluded.dest_lng,
  updated_at = now();

create or replace view public.user_hosting_authority
with (security_invoker = on) as
with required_authorities as (
  select 'Hiking'::text as category, 'Open Demo Hosting'::text as required_badge
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
  case
    when ra.category = 'Hiking' then true
    else exists (
      select 1
      from public.user_achievements ua
      join public.achievements a
        on a.id = ua.achievement_id
      where ua.user_id = p.id
        and ua.unlocked = true
        and a.grants_authority = ra.category
    )
  end as authorized
from public.profiles p
cross join required_authorities ra;
