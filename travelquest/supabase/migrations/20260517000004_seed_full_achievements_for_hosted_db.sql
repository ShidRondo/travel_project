alter table public.achievements
add column if not exists updated_at timestamptz default now();

create unique index if not exists achievements_code_key
on public.achievements (code);

alter table public.user_destination_visits
add column if not exists destination_id uuid references public.destinations(id) on delete set null,
add column if not exists checkin_id uuid references public.checkins(id) on delete set null;

delete from public.achievements
where code in ('CHECKIN_STARTER', 'HIKE_STARTER', 'EVENT_FINISHER');

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
