alter table public.user_destination_visits
add column if not exists destination_id uuid references public.destinations(id) on delete set null,
add column if not exists checkin_id uuid references public.checkins(id) on delete set null;

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
