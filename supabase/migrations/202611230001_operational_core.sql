-- LOCAL PREPARATION ONLY. Apply to hosted Supabase only after owner approval.
-- New, non-exposed schema avoids collisions with the historical public proposal.
begin;
create schema takween;
revoke all on schema takween from public, anon, authenticated, service_role;
grant usage on schema takween to authenticated;

create table takween.admin_roles (
  user_id uuid primary key references auth.users(id),
  role text not null default 'owner' check (role = 'owner'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table takween.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  email text not null check (length(email) between 3 and 150 and email !~ E'[\r\n]'),
  phone text check (length(phone) between 3 and 32),
  created_at timestamptz not null default now()
);
create table takween.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('TK-' || replace(gen_random_uuid()::text, '-', '')),
  customer_id uuid not null references takween.customers(id),
  request_id uuid not null unique,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  category text not null check (category in ('printing', 'fateen_machining')),
  description text not null check (length(btrim(description)) between 10 and 3000),
  quantity integer not null check (quantity between 1 and 10000),
  material text not null check (length(material) between 1 and 80),
  colour text check (length(colour) between 1 and 80),
  dimensions text check (length(dimensions) between 1 and 200),
  preferred_deadline date,
  process text check (process in ('wire_cut_edm', 'surface_grinding', 'turning', 'unsure')),
  contact_consent boolean not null check (contact_consent),
  referral_consent boolean not null default false,
  privacy_version text not null check (length(privacy_version) between 1 and 50),
  status text not null default 'new' check (status = 'new'),
  created_at timestamptz not null default now(),
  check ((category = 'printing' and process is null and not referral_consent)
    or (category = 'fateen_machining' and process is not null and referral_consent)),
  check (category <> 'printing' or material in ('PLA','PETG','Please advise'))
);
create index enquiries_inbox on takween.enquiries(category, status, created_at desc);
create index enquiries_customer on takween.enquiries(customer_id);
create table takween.enquiry_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references takween.enquiries(id),
  kind text not null check (kind = 'created'),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index enquiry_events_history on takween.enquiry_events(enquiry_id, created_at);
create table takween.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique references takween.enquiries(id),
  kind text not null default 'owner_enquiry' check (kind = 'owner_enquiry'),
  state text not null default 'pending' check (state in ('pending','leased','accepted','failed','uncertain')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  provider_id text check (length(btrim(provider_id)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'accepted' or provider_id is not null),
  check ((state = 'leased') = (lease_until is not null))
);
create index notification_outbox_pending on takween.notification_outbox(next_attempt_at) where state = 'pending';
create table takween.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null check (action = 'enquiry_created'),
  entity_id uuid not null references takween.enquiries(id),
  created_at timestamptz not null default now()
);
create index audit_events_entity on takween.audit_events(entity_id, created_at);

-- Only a verified AAL2 identity on the server-managed allowlist may read records.
-- SECURITY DEFINER avoids recursive membership RLS; role metadata is not trusted.
create function takween.owner_authorized() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2', false)
    and exists(select 1 from takween.admin_roles where user_id = auth.uid() and enabled and role = 'owner');
$$;
revoke all on function takween.owner_authorized() from public, anon, authenticated, service_role;
grant execute on function takween.owner_authorized() to authenticated;

-- Supabase may install default grants; revoke explicitly for each new object.
revoke all on all tables in schema takween from public, anon, authenticated, service_role;
alter table takween.admin_roles enable row level security;
alter table takween.customers enable row level security;
alter table takween.enquiries enable row level security;
alter table takween.enquiry_events enable row level security;
alter table takween.notification_outbox enable row level security;
alter table takween.audit_events enable row level security;
grant select on all tables in schema takween to authenticated;
create policy owner_read on takween.admin_roles for select to authenticated using (takween.owner_authorized());
create policy owner_read on takween.customers for select to authenticated using (takween.owner_authorized());
create policy owner_read on takween.enquiries for select to authenticated using (takween.owner_authorized());
create policy owner_read on takween.enquiry_events for select to authenticated using (takween.owner_authorized());
create policy owner_read on takween.notification_outbox for select to authenticated using (takween.owner_authorized());
create policy owner_read on takween.audit_events for select to authenticated using (takween.owner_authorized());
-- No INSERT/UPDATE/DELETE policies or grants, even for owners, in phase 1.

-- Public RPC façade; private schema need not be added to exposed Data API schemas.
create function public.takween_owner_authorized() returns boolean
language sql stable security invoker set search_path = '' as $$ select takween.owner_authorized(); $$;
revoke all on function public.takween_owner_authorized() from public, anon, authenticated, service_role;
grant execute on function public.takween_owner_authorized() to authenticated;
commit;
