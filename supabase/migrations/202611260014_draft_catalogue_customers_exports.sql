-- LOCAL ONLY. No public catalogue, uploads or customer accounts.
begin;
create table takween.products (
 id uuid primary key default gen_random_uuid(),name text not null check(length(btrim(name)) between 1 and 100),
 category text not null check(length(btrim(category)) between 1 and 80),
 description text not null check(length(btrim(description)) between 1 and 3000),
 asset_reference text check(length(asset_reference) between 1 and 200),
 rights_note text not null check(length(rights_note)<=2000),
 state text not null default 'draft' check(state='draft'),archived boolean not null default false,
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(asset_reference is null or length(btrim(rights_note))>0)
);
create table takween.product_variants (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references takween.products,
 label text not null check(length(btrim(label)) between 1 and 100),material text not null check(material in ('PLA','PETG')),
 colour text not null check(length(colour)<=80),customization text not null check(length(customization)<=2000),
 active boolean not null,version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index product_variant_parent on takween.product_variants(product_id,created_at);
alter table takween.customers add column version integer not null default 1;
alter table takween.customers add column archived boolean not null default false;
create table takween.customer_notes (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references takween.customers,
 note text not null check(length(btrim(note)) between 1 and 2000),actor_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create index customer_note_history on takween.customer_notes(customer_id,created_at);
revoke all on takween.products,takween.product_variants,takween.customer_notes from public,anon,authenticated,service_role;
alter table takween.products enable row level security;
alter table takween.product_variants enable row level security;
alter table takween.customer_notes enable row level security;
grant select on takween.products,takween.product_variants,takween.customer_notes to authenticated;
create policy owner_read on takween.products for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.product_variants for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.customer_notes for select to authenticated using(takween.owner_authorized());

create function takween.business_catalogue_command(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare product takween.products%rowtype;variant takween.product_variants%rowtype;action text=p->>'action';
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if action in ('product.create','product.update') then
  if p-array['action','id','version','name','category','description','assetReference','rightsNote','archived','note']<>'{}'::jsonb
   or jsonb_typeof(p->'name')<>'string' or jsonb_typeof(p->'category')<>'string' or jsonb_typeof(p->'description')<>'string'
   or jsonb_typeof(p->'rightsNote')<>'string' or jsonb_typeof(p->'archived')<>'boolean'
   or (p->>'assetReference' is not null and jsonb_typeof(p->'assetReference')<>'string') then raise invalid_parameter_value;end if;
  if action='product.create' then
   insert into takween.products(name,category,description,asset_reference,rights_note,archived)
    values(btrim(p->>'name'),btrim(p->>'category'),p->>'description',p->>'assetReference',p->>'rightsNote',(p->>'archived')::boolean) returning * into product;
  else
   select * into product from takween.products where id=(p->>'id')::uuid for update;
   if not found or product.version<>takween.business_integer(p,'version',2147483646) then raise exception using errcode='40001',message='Stale product';end if;
   update takween.products set name=btrim(p->>'name'),category=btrim(p->>'category'),description=p->>'description',
    asset_reference=p->>'assetReference',rights_note=p->>'rightsNote',archived=(p->>'archived')::boolean,version=version+1,updated_at=now()
    where id=product.id returning * into product;
  end if;
  return jsonb_build_object('id',product.id,'version',product.version);
 elsif action in ('variant.create','variant.update') then
  if p-array['action','id','version','productId','label','material','colour','customization','active','note']<>'{}'::jsonb
   or jsonb_typeof(p->'label')<>'string' or jsonb_typeof(p->'colour')<>'string'
   or jsonb_typeof(p->'customization')<>'string' or jsonb_typeof(p->'active')<>'boolean' then raise invalid_parameter_value;end if;
  if action='variant.create' then
   select * into product from takween.products where id=(p->>'productId')::uuid for update;
   if not found or product.archived then raise invalid_parameter_value;end if;
   insert into takween.product_variants(product_id,label,material,colour,customization,active)
    values(product.id,btrim(p->>'label'),p->>'material',p->>'colour',p->>'customization',(p->>'active')::boolean) returning * into variant;
  else
   select * into variant from takween.product_variants where id=(p->>'id')::uuid for update;
   if not found or variant.version<>takween.business_integer(p,'version',2147483646) then raise exception using errcode='40001',message='Stale variant';end if;
   if p->>'productId' is not null and (p->>'productId')::uuid<>variant.product_id then raise invalid_parameter_value;end if;
   update takween.product_variants set label=btrim(p->>'label'),material=p->>'material',colour=p->>'colour',
    customization=p->>'customization',active=(p->>'active')::boolean,version=version+1,updated_at=now() where id=variant.id returning * into variant;
  end if;
  return jsonb_build_object('id',variant.id,'version',variant.version);
 else raise invalid_parameter_value;end if;
end; $$;
revoke all on function takween.business_catalogue_command(jsonb) from public,anon,authenticated,service_role;

create function takween.business_customer_command(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare customer takween.customers%rowtype;action text=p->>'action';
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if action in ('customer.create','customer.update') then
  if p-array['action','id','version','name','email','phone','archived','note']<>'{}'::jsonb
   or jsonb_typeof(p->'name')<>'string' or jsonb_typeof(p->'email')<>'string'
   or (p->>'phone' is not null and jsonb_typeof(p->'phone')<>'string')
   or jsonb_typeof(p->'archived')<>'boolean' or coalesce(p->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise invalid_parameter_value;end if;
  if action='customer.create' then
   insert into takween.customers(name,email,phone,archived) values(btrim(p->>'name'),p->>'email',p->>'phone',(p->>'archived')::boolean) returning * into customer;
  else
   select * into customer from takween.customers where id=(p->>'id')::uuid for update;
   if not found or customer.version<>takween.business_integer(p,'version',2147483646) then raise exception using errcode='40001',message='Stale customer';end if;
   update takween.customers set name=btrim(p->>'name'),email=p->>'email',phone=p->>'phone',archived=(p->>'archived')::boolean,version=version+1 where id=customer.id returning * into customer;
  end if;
 elsif action='customer.note' then
  if p-array['action','id','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  select * into customer from takween.customers where id=(p->>'id')::uuid;
  if not found then raise invalid_parameter_value;end if;
 else raise invalid_parameter_value;end if;
 insert into takween.customer_notes(customer_id,note,actor_id) values(customer.id,p->>'note',auth.uid());
 return jsonb_build_object('id',customer.id,'version',customer.version);
end; $$;
revoke all on function takween.business_customer_command(jsonb) from public,anon,authenticated,service_role;

alter function public.takween_business_command(uuid,jsonb) rename to business_workflow_command;
alter function public.business_workflow_command(uuid,jsonb) set schema takween;
revoke all on function takween.business_workflow_command(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.takween_business_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior takween.business_receipts%rowtype;result jsonb;action text=p_payload->>'action';module text=split_part(action,'.',1);
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16000 then raise invalid_parameter_value;end if;
 if module not in ('product','variant','customer') then return takween.business_workflow_command(p_request_id,p_payload);end if;
 if jsonb_typeof(p_payload->'note')<>'string' or p_payload->>'note' is null or length(btrim(p_payload->>'note')) not between 1 and 2000 then raise invalid_parameter_value;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,12));select * into prior from takween.business_receipts where id=p_request_id;
 if found then if prior.actor_id<>auth.uid() or prior.payload<>p_payload then raise exception using errcode='23505',message='Conflicting retry';end if;return prior.result;end if;
 if module='customer' then result=takween.business_customer_command(p_payload);else result=takween.business_catalogue_command(p_payload);end if;
 insert into takween.business_events(entity_id,action,note,actor_id) values((result->>'id')::uuid,action,p_payload->>'note',auth.uid());
 insert into takween.business_receipts(id,actor_id,payload,result) values(p_request_id,auth.uid(),p_payload,result);
 return result;
end; $$;
revoke all on function public.takween_business_command(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_command(uuid,jsonb) to authenticated;

alter function public.takween_business_list(text,text,integer) rename to business_list_workflow;
alter function public.business_list_workflow(text,text,integer) set schema takween;
revoke all on function takween.business_list_workflow(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function takween.business_list_workflow(text,text,integer) to authenticated;
create function public.takween_business_list(p_kind text,p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;relation text;
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_search is null or length(p_search)>100 or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value;end if;
 if p_kind='choices' then
  result=takween.business_list_workflow(p_kind,p_search,p_offset);
  return jsonb_build_array((result->0)||jsonb_build_object('products',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select id,name from takween.products where not archived order by created_at desc,id limit 100) x)));
 end if;
 if p_kind='reports' then
  result=takween.business_list_workflow(p_kind,p_search,p_offset);
  return jsonb_build_array((result->0)||jsonb_build_object('customerRecords',(select count(*) from takween.customers),'draftProducts',(select count(*) from takween.products where not archived),
   'enquiriesByCategory',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select category,count(*) as count from takween.enquiries group by category) x),
   'notificationsByState',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select state,count(*) as count from takween.notification_outbox group by state) x),
   'overdueServiceRecords',(select count(*) from takween.machines where status<>'retired' and next_service<(current_timestamp at time zone 'Asia/Kolkata')::date)));
 end if;
 if p_kind='variants' then return(select coalesce(jsonb_agg(v),'[]'::jsonb) from(
  select to_jsonb(v)||jsonb_build_object('product_name',p.name) v from takween.product_variants v join takween.products p on p.id=v.product_id
  where p_search='' or strpos(lower(v.label||' '||p.name||' '||v.customization),lower(p_search))>0 order by v.created_at desc,v.id limit 25 offset p_offset
 ) q);end if;
 if p_kind='customer_notes' then return(select coalesce(jsonb_agg(v),'[]'::jsonb) from(
  select to_jsonb(n)||jsonb_build_object('customer_name',c.name) v from takween.customer_notes n join takween.customers c on c.id=n.customer_id
  where p_search='' or strpos(lower(c.name||' '||n.note),lower(p_search))>0 order by n.created_at desc,n.id limit 25 offset p_offset
 ) q);end if;
 relation=case p_kind when 'products' then 'products' when 'variants' then 'product_variants' when 'customers' then 'customers' when 'customer_notes' then 'customer_notes' else null end;
 if relation is null then return takween.business_list_workflow(p_kind,p_search,p_offset);end if;
 execute format('select coalesce(jsonb_agg(v),''[]''::jsonb) from(select to_jsonb(t) v from takween.%I t where $1='''' or strpos(lower(coalesce(to_jsonb(t)->>''name'','''')||'' ''||coalesce(to_jsonb(t)->>''label'','''')||'' ''||coalesce(to_jsonb(t)->>''email'','''')||'' ''||coalesce(to_jsonb(t)->>''note'','''')),lower($1))>0 order by created_at desc,id limit 25 offset $2) q',relation) into result using p_search,p_offset;
 return result;
end; $$;
revoke all on function public.takween_business_list(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_list(text,text,integer) to authenticated;

create function public.takween_business_export(p_request_id uuid,p_kind text,p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare relation text;data jsonb;event_id uuid=gen_random_uuid();payload jsonb;summary jsonb;
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_request_id is null or p_ids is null or cardinality(p_ids) not between 1 and 25 or array_position(p_ids,null) is not null
  or cardinality(p_ids)<>(select count(distinct x) from unnest(p_ids) x) then raise invalid_parameter_value;end if;
 relation=case p_kind when 'customers' then 'customers' when 'finance' then 'finance_entries' when 'materials' then 'materials' when 'orders' then 'orders' else null end;
 if relation is null then raise invalid_parameter_value;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,12));
 if exists(select 1 from takween.business_receipts where id=p_request_id) then raise exception using errcode='23505',message='Export already recorded; use a new explicit export request';end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(t) order by id),''[]''::jsonb) from takween.%I t where id=any($1)',relation) into data using p_ids;
 if jsonb_array_length(data)<>cardinality(p_ids) then raise invalid_parameter_value;end if;
 payload=jsonb_build_object('operation','private_export','kind',p_kind,'ids',to_jsonb(p_ids));summary=jsonb_build_object('id',event_id,'kind',p_kind,'count',cardinality(p_ids));
 insert into takween.business_events(id,entity_id,action,note,actor_id) values(event_id,event_id,'private_export','Owner download requested: '||p_kind||'; rows '||cardinality(p_ids),auth.uid());
 insert into takween.business_receipts(id,actor_id,payload,result) values(p_request_id,auth.uid(),payload,summary);
 return summary||jsonb_build_object('recordedAt',now(),'rows',data);
end; $$;
revoke all on function public.takween_business_export(uuid,text,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_export(uuid,text,uuid[]) to authenticated;
commit;
