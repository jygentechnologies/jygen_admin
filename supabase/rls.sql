-- JYGEN admin authorization. Run after schema.sql.
create or replace function public.jygen_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.admin_profiles p
  where p.id = auth.uid() and p.active = true
  limit 1
$$;
revoke all on function public.jygen_admin_role() from public;
grant execute on function public.jygen_admin_role() to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_activity enable row level security;
alter table public.admin_preferences enable row level security;
alter table public.contacts enable row level security;

-- Drop existing contacts policies so no legacy broad policy can accidentally grant access.
do $$ declare policy_row record; begin
  for policy_row in select policyname from pg_policies where schemaname='public' and tablename='contacts'
  loop execute format('drop policy if exists %I on public.contacts', policy_row.policyname); end loop;
end $$;
drop policy if exists "JYGEN profile self read" on public.admin_profiles;
drop policy if exists "JYGEN team read" on public.admin_profiles;
drop policy if exists "JYGEN super admin profile manage" on public.admin_profiles;
drop policy if exists "JYGEN notes read" on public.lead_notes;
drop policy if exists "JYGEN notes create" on public.lead_notes;
drop policy if exists "JYGEN notes edit" on public.lead_notes;
drop policy if exists "JYGEN notes delete" on public.lead_notes;
drop policy if exists "JYGEN activity read" on public.lead_activity;
drop policy if exists "JYGEN activity create" on public.lead_activity;
drop policy if exists "JYGEN preferences own access" on public.admin_preferences;

-- Public site submissions remain possible. Anonymous clients have no read/update/delete access.
create policy "JYGEN public contact insert" on public.contacts for insert to anon with check (true);
create policy "JYGEN admin contact read" on public.contacts for select to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin','sales','viewer'));
create policy "JYGEN sales contact update" on public.contacts for update to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin','sales'))
  with check (public.jygen_admin_role() in ('super_admin','admin','sales'));
create policy "JYGEN admin contact insert" on public.contacts for insert to authenticated
  with check (public.jygen_admin_role() in ('super_admin','admin'));
create policy "JYGEN admin contact delete" on public.contacts for delete to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin'));

create policy "JYGEN profile self read" on public.admin_profiles for select to authenticated
  using (id = auth.uid() and active = true);
create policy "JYGEN team read" on public.admin_profiles for select to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin','sales','viewer'));
create policy "JYGEN super admin profile manage" on public.admin_profiles for all to authenticated
  using (public.jygen_admin_role() = 'super_admin')
  with check (public.jygen_admin_role() = 'super_admin');

create policy "JYGEN notes read" on public.lead_notes for select to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin','sales','viewer'));
create policy "JYGEN notes create" on public.lead_notes for insert to authenticated
  with check (public.jygen_admin_role() in ('super_admin','admin') or (public.jygen_admin_role() = 'sales' and author_id = auth.uid()));
create policy "JYGEN notes edit" on public.lead_notes for update to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin') or (public.jygen_admin_role() = 'sales' and author_id = auth.uid()))
  with check (public.jygen_admin_role() in ('super_admin','admin') or (public.jygen_admin_role() = 'sales' and author_id = auth.uid()));
create policy "JYGEN notes delete" on public.lead_notes for delete to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin') or (public.jygen_admin_role() = 'sales' and author_id = auth.uid()));

create policy "JYGEN activity read" on public.lead_activity for select to authenticated
  using (public.jygen_admin_role() in ('super_admin','admin','sales','viewer'));
create policy "JYGEN activity create" on public.lead_activity for insert to authenticated
  with check (public.jygen_admin_role() in ('super_admin','admin','sales') and (actor_id is null or actor_id = auth.uid()));

create policy "JYGEN preferences own access" on public.admin_preferences for all to authenticated
  using (admin_id = auth.uid() and public.jygen_admin_role() in ('super_admin','admin','sales','viewer'))
  with check (admin_id = auth.uid() and public.jygen_admin_role() in ('super_admin','admin','sales','viewer'));

-- Explicit grants complement RLS and ensure anon cannot read or mutate contacts.
revoke all on public.contacts from anon, authenticated;
grant insert on public.contacts to anon;
grant select, insert, update, delete on public.contacts to authenticated;
do $$ declare contact_sequence text; begin
  contact_sequence := pg_get_serial_sequence('public.contacts', 'id');
  if contact_sequence is not null then
    execute format('grant usage, select on sequence %s to anon', contact_sequence);
  end if;
end $$;
revoke all on public.admin_profiles, public.lead_notes, public.lead_activity, public.admin_preferences from anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert, update, delete on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.lead_notes to authenticated;
grant select, insert on public.lead_activity to authenticated;
grant select, insert, update, delete on public.admin_preferences to authenticated;
