insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do update set public = excluded.public;

alter table public.checkins
add column if not exists photo_url text;

drop policy if exists "checkin_photos_read" on storage.objects;
drop policy if exists "checkin_photos_write_own" on storage.objects;

create policy "checkin_photos_read" on storage.objects
  for select using (bucket_id = 'checkin-photos');

create policy "checkin_photos_write_own" on storage.objects
  for all using (
    bucket_id = 'checkin-photos'
    and name like 'checkins/' || auth.uid()::text || '-%'
  )
  with check (
    bucket_id = 'checkin-photos'
    and name like 'checkins/' || auth.uid()::text || '-%'
  );
