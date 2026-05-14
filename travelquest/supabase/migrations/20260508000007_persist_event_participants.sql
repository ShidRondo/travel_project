create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined boolean not null default true,
  verified_start boolean not null default false,
  completed boolean not null default false,
  failed boolean not null default false,
  reward_claimed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (post_id, user_id)
);

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
