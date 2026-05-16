create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid()
);

alter table public.event_participants
add column if not exists post_id uuid references public.posts(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists joined boolean not null default true,
add column if not exists verified_start boolean not null default false,
add column if not exists completed boolean not null default false,
add column if not exists failed boolean not null default false,
add column if not exists reward_claimed boolean not null default false,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

update public.event_participants
set
  joined = coalesce(joined, true),
  verified_start = coalesce(verified_start, false),
  completed = coalesce(completed, false),
  failed = coalesce(failed, false),
  reward_claimed = coalesce(reward_claimed, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_participants_post_id_user_id_key'
      and conrelid = 'public.event_participants'::regclass
  ) then
    alter table public.event_participants
    add constraint event_participants_post_id_user_id_key unique (post_id, user_id);
  end if;
end;
$$;

alter table public.event_participants enable row level security;

drop policy if exists "event_participants_own" on public.event_participants;
create policy "event_participants_own" on public.event_participants
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
