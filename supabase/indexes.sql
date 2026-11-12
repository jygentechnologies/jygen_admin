-- Query support for the JYGEN admin application.
create index if not exists contacts_created_at_admin_idx on public.contacts (created_at desc);
create index if not exists contacts_status_admin_idx on public.contacts (status) where archived = false;
create index if not exists contacts_priority_admin_idx on public.contacts (priority) where archived = false;
create index if not exists contacts_assigned_to_admin_idx on public.contacts (assigned_to) where assigned_to is not null;
create index if not exists lead_notes_contact_created_idx on public.lead_notes (contact_id, created_at desc);
create index if not exists lead_activity_contact_created_idx on public.lead_activity (contact_id, created_at desc);
create index if not exists lead_activity_created_idx on public.lead_activity (created_at desc);
create index if not exists admin_profiles_role_active_idx on public.admin_profiles (role, active);
