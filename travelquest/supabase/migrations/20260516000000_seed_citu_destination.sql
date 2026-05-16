create unique index if not exists destinations_name_key on public.destinations (name);

insert into public.destinations
  (name, category, location, difficulty, reward_points, requires_qr, description, hero, image_url, start_lat, start_lng, dest_lat, dest_lng)
values
  (
    'CIT-U Main Campus',
    'Hiking',
    'N. Bacalso Avenue, Cebu City',
    'Easy',
    1000,
    false,
    'Demo campus destination for testing live GPS, camera proof, and geofence check-in around Cebu Institute of Technology - University.',
    'Campus proof run',
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    10.29508,
    123.88022,
    10.29578,
    123.88044
  )
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
