-- JYGEN admin schema. Safe to run against the existing public.contacts table.
-- The public website's existing contact columns and insert flow are preserved.
create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('super_admin','admin','sales','viewer')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add only the requested admin fields to contacts. Existing form columns remain intact.
alter table public.contacts add column if not exists status text not null default 'New';
alter table public.contacts add column if not exists priority text not null default 'Medium';
alter table public.contacts add column if not exists assigned_to uuid references public.admin_profiles(id) on delete set null;
alter table public.contacts add column if not exists archived boolean not null default false;
alter table public.contacts add column if not exists updated_at timestamptz not null default now();
alter table public.contacts add column if not exists last_contacted_at timestamptz;

-- contact_id is text intentionally: the existing contacts.id type is not assumed or changed.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null,
  author_id uuid not null default auth.uid() references public.admin_profiles(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null,
  actor_id uuid default auth.uid() references public.admin_profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_preferences (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_profiles(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (admin_id, preference_key)
);

-- New auth users receive a least-privilege profile. Bootstrap the first super_admin manually (SETUP.md).
create or replace function public.jygen_create_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_profiles (id, email, full_name, role, active)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'viewer', false)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists jygen_auth_user_admin_profile on auth.users;
create trigger jygen_auth_user_admin_profile
  after insert on auth.users
  for each row execute function public.jygen_create_admin_profile();

-- Database-level audit triggers keep the timeline complete and transactional with each change.
create or replace function public.jygen_log_contact_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.lead_activity (contact_id,actor_id,action,details)
    values (new.id::text,auth.uid(),'status_changed',jsonb_build_object('previous',old.status,'value',new.status));
  end if;
  if old.priority is distinct from new.priority then
    insert into public.lead_activity (contact_id,actor_id,action,details)
    values (new.id::text,auth.uid(),'priority_changed',jsonb_build_object('previous',old.priority,'value',new.priority));
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    insert into public.lead_activity (contact_id,actor_id,action,details)
    values (new.id::text,auth.uid(),'assignment_changed',jsonb_build_object('previous',old.assigned_to,'value',new.assigned_to));
  end if;
  if old.archived is distinct from new.archived then
    insert into public.lead_activity (contact_id,actor_id,action,details)
    values (new.id::text,auth.uid(),case when new.archived then 'lead_archived' else 'lead_restored' end,jsonb_build_object('archived',new.archived));
  end if;
  return new;
end;
$$;
drop trigger if exists jygen_contacts_admin_activity on public.contacts;
create trigger jygen_contacts_admin_activity
  after update of status,priority,assigned_to,archived on public.contacts
  for each row execute function public.jygen_log_contact_changes();

create or replace function public.jygen_log_note_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lead_activity (contact_id,actor_id,action,details)
  values (new.contact_id,auth.uid(),'note_added',jsonb_build_object('note_id',new.id,'preview',left(new.body,160)));
  return new;
end;
$$;
drop trigger if exists jygen_note_admin_activity on public.lead_notes;
create trigger jygen_note_admin_activity
  after insert on public.lead_notes
  for each row execute function public.jygen_log_note_created();
