insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "checkin_photos_read" on storage.objects;
drop policy if exists "checkin_photos_write_own" on storage.objects;
drop policy if exists "checkin_photos_insert_own" on storage.objects;
drop policy if exists "checkin_photos_update_own" on storage.objects;
drop policy if exists "checkin_photos_delete_own" on storage.objects;

create policy "checkin_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'checkin-photos');

create policy "checkin_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  );

create policy "checkin_photos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  )
  with check (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  );

create policy "checkin_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (
      name like 'checkins/' || auth.uid()::text || '-%'
      or name like 'checkins/' || auth.uid()::text || '/%'
    )
  );
