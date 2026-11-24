begin;
create table takween.quotations (
 id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references takween.enquiries(id),
 reference text not null unique default ('TQ-'||replace(gen_random_uuid()::text,'-','')),
 revision integer not null check(revision>0), version integer not null default 1,
 state text not null default 'draft' check(state in ('draft','approved','sent','accepted','rejected','expired')),
 currency text not null default 'INR' check(currency='INR'),
 entity text not null default '' check(length(entity)<=200),
 terms text not null default '' check(length(terms)<=3000), notes text not null default '' check(length(notes)<=3000),
 valid_until date, tax_bps integer check(tax_bps between 0 and 10000),
 subtotal_paise bigint not null default 0 check(subtotal_paise between 0 and 9000000000000),
 tax_paise bigint not null default 0 check(tax_paise between 0 and 9000000000000),
 total_paise bigint not null default 0 check(total_paise between 0 and 9000000000000),
 customer_snapshot jsonb not null, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(enquiry_id,revision)
);
create unique index quotation_one_accepted on takween.quotations(enquiry_id) where state='accepted';
create index quotations_inbox on takween.quotations(state,created_at desc);
create table takween.quotation_items (
 id uuid primary key default gen_random_uuid(), quotation_id uuid not null references takween.quotations(id),
 position integer not null check(position between 1 and 50), description text not null check(length(btrim(description)) between 1 and 500),
 material text not null check(length(material)<=80), quantity integer not null check(quantity between 1 and 10000),
 unit_paise bigint not null check(unit_paise between 0 and 100000000),
 total_paise bigint generated always as (quantity::bigint*unit_paise) stored,
 unique(quotation_id,position)
);
create table takween.commercial_events (
 id uuid primary key default gen_random_uuid(), quotation_id uuid references takween.quotations(id),
 kind text not null check(length(kind) between 1 and 50), note text not null check(length(btrim(note)) between 1 and 2000),
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index commercial_history on takween.commercial_events(quotation_id,created_at);
create table takween.commercial_requests (
 id uuid primary key, actor_id uuid not null references auth.users(id), payload jsonb not null,
 result jsonb not null, created_at timestamptz not null default now()
);
revoke all on takween.quotations,takween.quotation_items,takween.commercial_events,takween.commercial_requests from public,anon,authenticated,service_role;
alter table takween.quotations enable row level security;
alter table takween.quotation_items enable row level security;
alter table takween.commercial_events enable row level security;
alter table takween.commercial_requests enable row level security;
grant select on takween.quotations,takween.quotation_items,takween.commercial_events to authenticated;
create policy owner_read on takween.quotations for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.quotation_items for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.commercial_events for select to authenticated using(takween.owner_authorized());
-- Request ledger has no client policy/grant, even for owners.
create function public.takween_quote_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q takween.quotations%rowtype; prior takween.commercial_requests%rowtype;
 e takween.enquiries%rowtype; item jsonb; n integer:=0; subtotal bigint:=0; tax bigint; result jsonb; action text:=p_payload->>'action';
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>40000 then raise invalid_parameter_value; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,8));
 select * into prior from takween.commercial_requests where id=p_request_id;
 if found then
  if prior.actor_id<>auth.uid() or prior.payload<>p_payload then raise exception using errcode='23505',message='Request conflict'; end if;
  return prior.result;
 end if;
 if action='create' then
  select * into e from takween.enquiries where id=(p_payload->>'enquiryId')::uuid for update;
  if not found then raise no_data_found; end if;
  if exists(select 1 from takween.quotations where enquiry_id=e.id and state in ('draft','accepted')) then raise exception using errcode='23505',message='Existing draft or accepted quote'; end if;
  insert into takween.quotations(enquiry_id,revision,customer_snapshot,created_by)
   select e.id,coalesce(max(revision),0)+1,jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone),auth.uid()
   from takween.customers c left join takween.quotations old on old.enquiry_id=e.id where c.id=e.customer_id group by c.id
   returning * into q;
 elsif action in ('save','transition') then
  select * into q from takween.quotations where id=(p_payload->>'id')::uuid for update;
  if not found then raise no_data_found; end if;
  -- Lock enquiry too: acceptance and new revision creation must serialize.
  perform 1 from takween.enquiries where id=q.enquiry_id for update;
  if (p_payload->>'version')::integer is distinct from q.version then raise exception using errcode='40001',message='Stale quotation'; end if;
  if q.revision<>(select max(revision) from takween.quotations where enquiry_id=q.enquiry_id) then raise exception using errcode='40001',message='Superseded revision'; end if;
  if action='save' then
   if q.state<>'draft' then raise insufficient_privilege; end if;
   if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 50
    or jsonb_typeof(p_payload->'entity') is distinct from 'string' or jsonb_typeof(p_payload->'terms') is distinct from 'string'
    or jsonb_typeof(p_payload->'notes') is distinct from 'string' then raise invalid_parameter_value; end if;
   if (p_payload->>'taxBps') is not null and (p_payload->>'taxBps') !~ '^[0-9]{1,5}$' then raise invalid_parameter_value; end if;
   delete from takween.quotation_items where quotation_id=q.id;
   for item in select value from jsonb_array_elements(p_payload->'items') loop
    if jsonb_typeof(item->'description') is distinct from 'string' or jsonb_typeof(item->'material') is distinct from 'string'
     or (item->>'quantity') is null or (item->>'quantity') !~ '^[0-9]{1,5}$'
     or (item->>'unitPaise') is null or (item->>'unitPaise') !~ '^[0-9]{1,9}$' then raise invalid_parameter_value; end if;
    n:=n+1;
    insert into takween.quotation_items(quotation_id,position,description,material,quantity,unit_paise)
     values(q.id,n,item->>'description',item->>'material',(item->>'quantity')::integer,(item->>'unitPaise')::bigint);
   end loop;
   select sum(total_paise) into subtotal from takween.quotation_items where quotation_id=q.id;
   tax:=round(subtotal::numeric*coalesce((p_payload->>'taxBps')::integer,0)/10000)::bigint;
   update takween.quotations set entity=btrim(p_payload->>'entity'),terms=p_payload->>'terms',notes=p_payload->>'notes',
    tax_bps=(p_payload->>'taxBps')::integer,valid_until=(p_payload->>'validUntil')::date,
    subtotal_paise=subtotal,tax_paise=tax,total_paise=subtotal+tax,version=version+1,updated_at=now() where id=q.id returning * into q;
  else
   if coalesce(length(btrim(p_payload->>'evidence')),0) not between 1 and 2000 then raise invalid_parameter_value; end if;
   if not ((q.state='draft' and p_payload->>'state'='approved') or (q.state='approved' and p_payload->>'state'='sent')
    or (q.state='sent' and p_payload->>'state' in ('accepted','rejected','expired'))) then raise invalid_parameter_value; end if;
   if p_payload->>'state'='approved' and (q.tax_bps is null or length(q.entity)=0 or length(btrim(q.terms))=0 or q.valid_until is null
     or q.valid_until<current_date or not exists(select 1 from takween.quotation_items where quotation_id=q.id)) then raise invalid_parameter_value; end if;
   if p_payload->>'state' in ('sent','accepted') and q.valid_until<current_date then raise invalid_parameter_value; end if;
   if p_payload->>'state'='expired' and q.valid_until>=current_date then raise invalid_parameter_value; end if;
   update takween.quotations set state=p_payload->>'state',version=version+1,updated_at=now() where id=q.id returning * into q;
  end if;
 else raise invalid_parameter_value;
 end if;
 insert into takween.commercial_events(quotation_id,kind,note,actor_id)
 values(q.id,'quote_'||action,case when action='transition' then p_payload->>'evidence' else 'Owner '||action||' quotation revision '||q.revision end,auth.uid());
 result:=jsonb_build_object('id',q.id,'reference',q.reference,'version',q.version,'state',q.state);
 insert into takween.commercial_requests(id,actor_id,payload,result) values(p_request_id,auth.uid(),p_payload,result);
 return result;
end; $$;
revoke all on function public.takween_quote_command(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.takween_quote_command(uuid,jsonb) to authenticated;
commit;
