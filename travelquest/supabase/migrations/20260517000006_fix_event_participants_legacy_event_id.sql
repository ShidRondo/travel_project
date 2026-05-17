create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid()
);

alter table public.event_participants
add column if not exists post_id uuid references public.posts(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists joined boolean default true,
add column if not exists verified_start boolean default false,
add column if not exists completed boolean default false,
add column if not exists failed boolean default false,
add column if not exists reward_claimed boolean default false,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_participants'
      and column_name = 'event_id'
  ) then
    alter table public.event_participants
    alter column event_id drop not null;

    execute '
      update public.event_participants
      set post_id = coalesce(post_id, event_id)
      where post_id is null
        and event_id is not null
    ';
  end if;
end;
$$;

update public.event_participants
set
  joined = coalesce(joined, true),
  verified_start = coalesce(verified_start, false),
  completed = coalesce(completed, false),
  failed = coalesce(failed, false),
  reward_claimed = coalesce(reward_claimed, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.event_participants
alter column post_id set not null,
alter column user_id set not null,
alter column joined set not null,
alter column verified_start set not null,
alter column completed set not null,
alter column failed set not null,
alter column reward_claimed set not null;

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
