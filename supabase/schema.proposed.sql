-- DESIGN ONLY. Not applied. No application grants or policies provided.
begin;
create type public.enquiry_status as enum ('new','reviewing','quoted','closed');
create type public.order_status as enum ('approved','queued','printing','inspection','ready','completed','cancelled');
create type public.file_status as enum ('pending','quarantined','ready','rejected');
create type public.quote_status as enum ('draft','sent','accepted','expired','declined');
create table public.admin_users (
 user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id),
 name text not null, email text, phone text, created_at timestamptz not null default now(),
 check(email is not null or phone is not null)
);
create table public.enquiries (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id),
 description text not null,quantity integer not null check(quantity>0),
 material_preference text check(material_preference in ('PLA','PETG')),
 status public.enquiry_status not null default 'new',created_at timestamptz not null default now()
);
create table public.design_files (
 id uuid primary key default gen_random_uuid(),enquiry_id uuid not null references public.enquiries(id),
 object_path text not null unique,original_name text not null,
 extension text not null check(extension in ('stl','3mf','step','stp')),
 size_bytes bigint not null check(size_bytes>0),sha256 text,
 status public.file_status not null default 'pending',created_at timestamptz not null default now()
);
create table public.quotes (
 id uuid primary key default gen_random_uuid(),enquiry_id uuid not null references public.enquiries(id),
 version integer not null check(version>0),status public.quote_status not null default 'draft',
 total_paise bigint not null check(total_paise>=0),currency text not null default 'INR' check(currency='INR'),
 expires_at timestamptz,accepted_at timestamptz,notes text,created_at timestamptz not null default now(),
 unique(enquiry_id,version)
);
create table public.quote_items (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null references public.quotes(id),
 description text not null,quantity integer not null check(quantity>0),unit_paise bigint not null check(unit_paise>=0)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(),quote_id uuid not null unique references public.quotes(id),
 status public.order_status not null default 'approved',created_at timestamptz not null default now()
);
create table public.order_events (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 status public.order_status not null,customer_note text,internal_note text,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.production_jobs (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 planned_minutes integer check(planned_minutes>=0),actual_minutes integer check(actual_minutes>=0),
 estimated_grams numeric(12,3) check(estimated_grams>=0),actual_grams numeric(12,3) check(actual_grams>=0),
 actual_cost_paise bigint check(actual_cost_paise>=0),notes text
);
create table public.filament_spools (
 id uuid primary key default gen_random_uuid(),material text not null check(material in ('PLA','PETG')),
 colour text not null,initial_grams numeric(12,3) not null check(initial_grams>0),
 purchase_cost_paise bigint not null check(purchase_cost_paise>=0),created_at timestamptz not null default now()
);
create table public.inventory_movements (
 id uuid primary key default gen_random_uuid(),spool_id uuid not null references public.filament_spools(id),
 production_job_id uuid references public.production_jobs(id),delta_grams numeric(12,3) not null check(delta_grams<>0),
 reason text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(),slug text not null unique,title text not null,
 description text not null,published boolean not null default false,price_paise bigint check(price_paise>=0),
 created_at timestamptz not null default now()
);
create table public.product_assets (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),
 object_path text not null unique,alt_text text not null,permission_record text not null
);
create table public.payments (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 amount_paise bigint not null check(amount_paise>0),kind text not null check(kind in ('receipt','refund')),
 recorded_at timestamptz not null,reference text
);
create table public.expenses (
 id uuid primary key default gen_random_uuid(),order_id uuid references public.orders(id),category text not null,
 amount_paise bigint not null check(amount_paise>0),incurred_at timestamptz not null,note text
);
create table public.cost_profiles (
 id uuid primary key default gen_random_uuid(),name text not null,settings jsonb not null,
 created_at timestamptz not null default now()
);
create table public.tracking_tokens (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 token_hash text not null unique,expires_at timestamptz not null,revoked_at timestamptz
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),action text not null,
 entity_type text not null,entity_id uuid,created_at timestamptz not null default now()
);
create index on public.enquiries(customer_id);
create index on public.enquiries(status,created_at);
create index on public.design_files(enquiry_id);
create index on public.quotes(enquiry_id);
create index on public.quote_items(quote_id);
create index on public.order_events(order_id,created_at);
create index on public.production_jobs(order_id);
create index on public.inventory_movements(spool_id,created_at);
create index on public.payments(order_id);
create index on public.expenses(incurred_at);
alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.enquiries enable row level security;
alter table public.design_files enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.production_jobs enable row level security;
alter table public.filament_spools enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.products enable row level security;
alter table public.product_assets enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.cost_profiles enable row level security;
alter table public.tracking_tokens enable row level security;
alter table public.audit_events enable row level security;
-- Required before activation: explicit grants/policies, storage rules, intake
-- validation, quote immutability/totals, stock locking/reservations, status
-- transitions, financial reconciliation and retention jobs. See README.md.
commit;