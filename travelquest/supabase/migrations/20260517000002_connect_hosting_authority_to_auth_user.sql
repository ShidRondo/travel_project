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
    join public.achievements a
      on a.id = ua.achievement_id
    where ua.user_id = u.id
      and ua.unlocked = true
      and a.grants_authority = ra.category
  ) as authorized
from authority_users u
cross join required_authorities ra;
