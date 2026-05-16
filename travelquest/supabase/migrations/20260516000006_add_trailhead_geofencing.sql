alter table public.trailheads
add column if not exists lat double precision,
add column if not exists lng double precision;

alter table public.trail_destinations
add column if not exists lat double precision,
add column if not exists lng double precision;

alter table public.hike_trailhead_verifications
add column if not exists gps_lat double precision,
add column if not exists gps_lng double precision,
add column if not exists verified_at timestamptz default now();

update public.trailheads th
set
  lat = v.lat,
  lng = v.lng,
  location = v.location
from (
  values
    ('paseo-ridge-network', 'Paseo Trailhead', 'Paseo Arcenas, Banawa, Cebu City', 10.30979::double precision, 123.87455::double precision),
    ('pahamutan-extension-trail', 'Pahamutan Junction Trailhead', 'Connected next trail start', 10.29780::double precision, 123.87820::double precision)
) as v(trail_code, trailhead_name, location, lat, lng)
join public.trails t on t.code = v.trail_code
where th.trail_id = t.id
  and th.name = v.trailhead_name;

update public.trail_destinations td
set
  lat = v.lat,
  lng = v.lng
from (
  values
    ('paseo-ridge-network', 'Starbuk Viewpoint', 10.29360::double precision, 123.87350::double precision),
    ('paseo-ridge-network', 'Pahamutan Peak', 10.29780::double precision, 123.87820::double precision),
    ('pahamutan-extension-trail', 'Cedar Camp Stop', 10.30050::double precision, 123.88100::double precision),
    ('pahamutan-extension-trail', 'Eagle Crest Summit', 10.30400::double precision, 123.88400::double precision)
) as v(trail_code, destination_name, lat, lng)
join public.trails t on t.code = v.trail_code
where td.trail_id = t.id
  and td.name = v.destination_name;
