create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  author_name text,
  author_avatar_url text,
  created_at timestamptz default now()
);

alter table public.post_comments
add column if not exists author_name text,
add column if not exists author_avatar_url text;

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "post_likes_read" on public.post_likes;
drop policy if exists "post_comments_read" on public.post_comments;
drop policy if exists "post_comments_insert_own" on public.post_comments;
drop policy if exists "post_comments_delete_own" on public.post_comments;

create policy "post_likes_read" on public.post_likes
  for select to authenticated using (true);

create policy "post_comments_read" on public.post_comments
  for select to authenticated using (true);

create policy "post_comments_insert_own" on public.post_comments
  for insert with check (auth.uid() = user_id);

create policy "post_comments_delete_own" on public.post_comments
  for delete using (auth.uid() = user_id);

create or replace function public.refresh_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    likes_count = (
      select count(*)::int
      from public.post_likes
      where post_id = coalesce(new.post_id, old.post_id)
    ),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set
    comments_count = (
      select count(*)::int
      from public.post_comments
      where post_id = coalesce(new.post_id, old.post_id)
    ),
    updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_post_likes_count_after_change on public.post_likes;
create trigger refresh_post_likes_count_after_change
after insert or delete on public.post_likes
for each row execute function public.refresh_post_likes_count();

drop trigger if exists refresh_post_comments_count_after_change on public.post_comments;
create trigger refresh_post_comments_count_after_change
after insert or delete on public.post_comments
for each row execute function public.refresh_post_comments_count();
