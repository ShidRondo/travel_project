alter table public.achievements
add column if not exists updated_at timestamptz default now();

create unique index if not exists achievements_code_key
on public.achievements (code);

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
