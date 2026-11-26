-- LOCAL BUSINESS SPRINT ONLY. Not part of the frozen hosted 001-011 package.
begin;
create table takween.materials (
 id uuid primary key default gen_random_uuid(),name text not null check(length(btrim(name)) between 1 and 100),
 material text not null check(material in ('PLA','PETG')),colour text not null check(length(colour)<=80),
 stock_mg bigint not null default 0 check(stock_mg between 0 and 1000000000000),
 price_per_kg_paise bigint check(price_per_kg_paise between 0 and 9000000000000),
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table takween.material_movements (
 id uuid primary key default gen_random_uuid(),material_id uuid not null references takween.materials,
 order_id uuid references takween.orders,delta_mg bigint not null check(delta_mg<>0),
 note text not null check(length(btrim(note)) between 1 and 2000),actor_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create index material_movement_history on takween.material_movements(material_id,created_at);
create table takween.machines (
 id uuid primary key default gen_random_uuid(),name text not null check(length(btrim(name)) between 1 and 100),
 category text not null check(category in ('printing','machining')),
 status text not null check(status in ('active','maintenance','retired')),next_service date,
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table takween.machine_maintenance (
 id uuid primary key default gen_random_uuid(),machine_id uuid not null references takween.machines,
 note text not null check(length(btrim(note)) between 1 and 2000),actor_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create index machine_maintenance_history on takween.machine_maintenance(machine_id,created_at);
create table takween.cost_estimates (
 id uuid primary key default gen_random_uuid(),inputs jsonb not null,result jsonb not null,
 note text not null check(length(btrim(note)) between 1 and 2000),actor_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create table takween.business_receipts (
 id uuid primary key,actor_id uuid not null references auth.users,payload jsonb not null,result jsonb not null,
 created_at timestamptz not null default now()
);
create table takween.business_events (
 id uuid primary key default gen_random_uuid(),entity_id uuid not null,action text not null,
 note text not null check(length(btrim(note)) between 1 and 2000),actor_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
revoke all on takween.materials,takween.material_movements,takween.machines,
 takween.machine_maintenance,takween.cost_estimates,takween.business_receipts,takween.business_events
 from public,anon,authenticated,service_role;
alter table takween.materials enable row level security;
alter table takween.material_movements enable row level security;
alter table takween.machines enable row level security;
alter table takween.machine_maintenance enable row level security;
alter table takween.cost_estimates enable row level security;
alter table takween.business_receipts enable row level security;
alter table takween.business_events enable row level security;
grant select on takween.materials,takween.material_movements,takween.machines,
 takween.machine_maintenance,takween.cost_estimates,takween.business_events to authenticated;
create policy owner_read on takween.materials for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.material_movements for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.machines for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.machine_maintenance for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.cost_estimates for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.business_events for select to authenticated using(takween.owner_authorized());

create function takween.business_integer(p jsonb,k text,maximum bigint) returns bigint
language plpgsql immutable security invoker set search_path='' as $$
begin
 if jsonb_typeof(p->k)<>'number' or p->>k is null or p->>k !~ '^[0-9]+$'
  or (p->>k)::numeric>maximum then raise invalid_parameter_value; end if;
 return (p->>k)::bigint;
end; $$;
revoke all on function takween.business_integer(jsonb,text,bigint) from public,anon,authenticated,service_role;

-- Integer paise; each cost component rounds UP. Margin means profit / sale price.
create function takween.business_cost(p jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare mg numeric;kg numeric;waste numeric;watts numeric;minutes numeric;energy numeric;
 labor_minutes numeric;labor_rate numeric;overhead numeric;margin numeric;m numeric;e numeric;l numeric;b numeric;s numeric;
begin
 if jsonb_typeof(p)<>'object' or p-array['materialMg','pricePerKgPaise','wasteBps','watts','minutes',
  'electricityPaisePerKwh','laborMinutes','laborPaisePerHour','overheadPaise','marginBps']<>'{}'::jsonb then raise invalid_parameter_value; end if;
 mg=takween.business_integer(p,'materialMg',1000000000000);kg=takween.business_integer(p,'pricePerKgPaise',9000000000000);
 waste=takween.business_integer(p,'wasteBps',10000);watts=takween.business_integer(p,'watts',1000000);
 minutes=takween.business_integer(p,'minutes',525600);energy=takween.business_integer(p,'electricityPaisePerKwh',9000000000000);
 labor_minutes=takween.business_integer(p,'laborMinutes',525600);labor_rate=takween.business_integer(p,'laborPaisePerHour',9000000000000);
 overhead=takween.business_integer(p,'overheadPaise',9000000000000);margin=takween.business_integer(p,'marginBps',9900);
 m=ceil(mg*kg*(10000+waste)/10000000000);e=ceil(watts*minutes*energy/60000);l=ceil(labor_minutes*labor_rate/60);
 b=m+e+l+overhead;s=ceil(b*10000/(10000-margin));
 if s>9000000000000 then raise invalid_parameter_value; end if;
 return jsonb_build_object('materialPaise',m,'electricityPaise',e,'laborPaise',l,'basePaise',b,'suggestedPaise',s,'profitPaise',s-b);
end; $$;
revoke all on function takween.business_cost(jsonb) from public,anon,authenticated,service_role;

create function public.takween_business_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior takween.business_receipts%rowtype;m takween.materials%rowtype;machine takween.machines%rowtype;
 action text;note text;quantity bigint;result jsonb;entity uuid;price bigint;state text;
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16000 then raise invalid_parameter_value; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,12));
 select * into prior from takween.business_receipts where id=p_request_id;
 if found then if prior.actor_id<>auth.uid() or prior.payload<>p_payload then raise exception using errcode='23505',message='Conflicting retry'; end if;return prior.result;end if;
 action=p_payload->>'action';note=btrim(p_payload->>'note');
 if jsonb_typeof(p_payload->'note')<>'string' or note is null or length(note) not between 1 and 2000 then raise invalid_parameter_value; end if;
 if action in ('material.create','machine.create') and jsonb_typeof(p_payload->'name')<>'string' then raise invalid_parameter_value;end if;
 if p_payload ? 'colour' and jsonb_typeof(p_payload->'colour')<>'string' then raise invalid_parameter_value;end if;
 if p_payload->>'nextService' is not null and (jsonb_typeof(p_payload->'nextService')<>'string' or p_payload->>'nextService' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then raise invalid_parameter_value;end if;
 if action='material.create' then
  if p_payload-array['action','name','material','colour','pricePerKgPaise','note']<>'{}'::jsonb then raise invalid_parameter_value; end if;
  if p_payload->>'pricePerKgPaise' is not null then price=takween.business_integer(p_payload,'pricePerKgPaise',9000000000000);end if;
  insert into takween.materials(name,material,colour,price_per_kg_paise)
   values(btrim(p_payload->>'name'),p_payload->>'material',coalesce(p_payload->>'colour',''),price) returning * into m;
  entity=m.id;result=jsonb_build_object('id',m.id,'version',m.version);
 elsif action in ('material.receive','material.consume') then
  if p_payload-array['action','id','version','quantityMg','orderId','note']<>'{}'::jsonb then raise invalid_parameter_value; end if;
  if p_payload->>'orderId' is not null then
   select o.state into state from takween.orders o where o.id=(p_payload->>'orderId')::uuid for update;
   if not found or state in ('completed','cancelled') then raise invalid_parameter_value;end if;
  end if;
  select * into m from takween.materials where id=(p_payload->>'id')::uuid for update;
  if not found or m.version<>takween.business_integer(p_payload,'version',2147483646) then raise exception using errcode='40001',message='Stale material';end if;
  quantity=takween.business_integer(p_payload,'quantityMg',1000000000000);if quantity=0 then raise invalid_parameter_value;end if;
  if action='material.consume' then quantity=-quantity;end if;
  update takween.materials set stock_mg=stock_mg+quantity,version=version+1,updated_at=now() where id=m.id returning * into m;
  insert into takween.material_movements(material_id,order_id,delta_mg,note,actor_id)
   values(m.id,(p_payload->>'orderId')::uuid,quantity,note,auth.uid());
  entity=m.id;result=jsonb_build_object('id',m.id,'version',m.version,'stockMg',m.stock_mg);
 elsif action='machine.create' then
  if p_payload-array['action','name','category','status','nextService','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  insert into takween.machines(name,category,status,next_service)
   values(btrim(p_payload->>'name'),p_payload->>'category',p_payload->>'status',(p_payload->>'nextService')::date) returning * into machine;
  entity=machine.id;result=jsonb_build_object('id',machine.id,'version',machine.version);
 elsif action in ('machine.status','machine.maintenance') then
  if p_payload-array['action','id','version','status','nextService','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  select * into machine from takween.machines where id=(p_payload->>'id')::uuid for update;
  if not found or machine.version<>takween.business_integer(p_payload,'version',2147483646) then raise exception using errcode='40001',message='Stale machine';end if;
  update takween.machines set status=p_payload->>'status',next_service=(p_payload->>'nextService')::date,
   version=version+1,updated_at=now() where id=machine.id returning * into machine;
  if action='machine.maintenance' then insert into takween.machine_maintenance(machine_id,note,actor_id) values(machine.id,note,auth.uid());end if;
  entity=machine.id;result=jsonb_build_object('id',machine.id,'version',machine.version);
 elsif action='estimate.create' then
  if p_payload-array['action','inputs','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  result=takween.business_cost(p_payload->'inputs');
  insert into takween.cost_estimates(inputs,result,note,actor_id) values(p_payload->'inputs',result,note,auth.uid()) returning id into entity;
  result=jsonb_build_object('id',entity,'calculation',result);
 else raise invalid_parameter_value;end if;
 insert into takween.business_events(entity_id,action,note,actor_id) values(entity,action,note,auth.uid());
 insert into takween.business_receipts(id,actor_id,payload,result) values(p_request_id,auth.uid(),p_payload,result);
 return result;
end; $$;
revoke all on function public.takween_business_command(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_command(uuid,jsonb) to authenticated;

create function public.takween_business_list(p_kind text,p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;relation text;
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_search is null or length(p_search)>100 or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value;end if;
 relation=case p_kind when 'materials' then 'materials' when 'movements' then 'material_movements'
  when 'machines' then 'machines' when 'maintenance' then 'machine_maintenance' when 'estimates' then 'cost_estimates' when 'events' then 'business_events' else null end;
 if relation is null then raise invalid_parameter_value;end if;
 execute format('select coalesce(jsonb_agg(v),''[]''::jsonb) from(select to_jsonb(t) v from takween.%I t where $1='''' or strpos(lower(coalesce(to_jsonb(t)->>''name'','''')||'' ''||coalesce(to_jsonb(t)->>''note'','''')),lower($1))>0 order by created_at desc,id limit 25 offset $2) q',relation)
  into result using p_search,p_offset;
 return result;
end; $$;
revoke all on function public.takween_business_list(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_list(text,text,integer) to authenticated;
commit;
