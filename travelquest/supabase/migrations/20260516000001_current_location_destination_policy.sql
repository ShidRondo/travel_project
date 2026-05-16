create unique index if not exists destinations_name_key on public.destinations (name);

drop policy if exists "destinations_insert_current_location_demo" on public.destinations;
drop policy if exists "destinations_update_current_location_demo" on public.destinations;

create policy "destinations_insert_current_location_demo" on public.destinations
  for insert to authenticated
  with check (name = 'Current Location Demo');

create policy "destinations_update_current_location_demo" on public.destinations
  for update to authenticated
  using (name = 'Current Location Demo')
  with check (name = 'Current Location Demo');
