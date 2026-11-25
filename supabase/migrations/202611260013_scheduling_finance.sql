-- LOCAL ONLY. Not included in the frozen hosted 001-011 package.
begin;
create table takween.job_schedule (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references takween.orders,
 machine_id uuid not null references takween.machines,estimate_id uuid references takween.cost_estimates,
 start_at timestamptz not null,end_at timestamptz not null check(end_at>start_at),
 status text not null default 'planned' check(status in ('planned','cancelled','completed')),
 note text not null check(length(btrim(note)) between 1 and 2000),version integer not null default 1,
 actor_id uuid not null references auth.users,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index job_machine_calendar on takween.job_schedule(machine_id,start_at,end_at) where status<>'cancelled';
create index job_order_history on takween.job_schedule(order_id,created_at);
create table takween.finance_entries (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('expense','income')),
 category text not null check(category in ('materials','electricity','labor','maintenance','sale','other')),
 amount_paise bigint not null check(amount_paise<>0 and amount_paise between -9000000000000 and 9000000000000),
 occurred_on date not null,order_id uuid references takween.orders,
 reversal_of uuid unique references takween.finance_entries,
 note text not null check(length(btrim(note)) between 1 and 2000),
 actor_id uuid not null references auth.users,created_at timestamptz not null default now(),
 check((reversal_of is null and amount_paise>0) or (reversal_of is not null and amount_paise<0))
);
create index finance_order_history on takween.finance_entries(order_id,occurred_on);
revoke all on takween.job_schedule,takween.finance_entries from public,anon,authenticated,service_role;
alter table takween.job_schedule enable row level security;
alter table takween.finance_entries enable row level security;
grant select on takween.job_schedule,takween.finance_entries to authenticated;
create policy owner_read on takween.job_schedule for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.finance_entries for select to authenticated using(takween.owner_authorized());

create function takween.business_schedule_command(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare j takween.job_schedule%rowtype;m takween.machines%rowtype;o takween.orders%rowtype;
 start_time timestamptz;end_time timestamptz;action text=p->>'action';
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p-array['action','id','version','orderId','machineId','estimateId','startAt','endAt','status','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
 if action='schedule.create' then
  if p-array['action','orderId','machineId','estimateId','startAt','endAt','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  select * into o from takween.orders where id=(p->>'orderId')::uuid for update;
  if not found or o.state in ('completed','cancelled') then raise invalid_parameter_value;end if;
  select * into m from takween.machines where id=(p->>'machineId')::uuid for update;
  if not found or m.status<>'active' or m.category<>(case when o.category='printing' then 'printing' else 'machining' end) then raise invalid_parameter_value;end if;
  if coalesce(p->>'startAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$'
   or coalesce(p->>'endAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$' then raise invalid_parameter_value;end if;
  start_time=(p->>'startAt')::timestamptz;end_time=(p->>'endAt')::timestamptz;
  if end_time<=start_time or exists(select 1 from takween.job_schedule where machine_id=m.id and status<>'cancelled' and start_at<end_time and end_at>start_time) then raise exception using errcode='23505',message='Invalid or overlapping reservation';end if;
  insert into takween.job_schedule(order_id,machine_id,estimate_id,start_at,end_at,note,actor_id)
   values(o.id,m.id,(p->>'estimateId')::uuid,start_time,end_time,p->>'note',auth.uid()) returning * into j;
 elsif action='schedule.status' then
  if p-array['action','id','version','status','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  select * into j from takween.job_schedule where id=(p->>'id')::uuid for update;
  if not found or j.version<>takween.business_integer(p,'version',2147483646) then raise exception using errcode='40001',message='Stale schedule';end if;
  if j.status<>'planned' or p->>'status' not in ('cancelled','completed') then raise invalid_parameter_value;end if;
  update takween.job_schedule set status=p->>'status',note=p->>'note',version=version+1,updated_at=now() where id=j.id returning * into j;
 else raise invalid_parameter_value;end if;
 return jsonb_build_object('id',j.id,'version',j.version);
end; $$;
revoke all on function takween.business_schedule_command(jsonb) from public,anon,authenticated,service_role;

create function takween.business_finance_command(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare f takween.finance_entries%rowtype;original takween.finance_entries%rowtype;amount bigint;
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p->>'action'='finance.create' then
  if p-array['action','kind','category','amountPaise','occurredOn','orderId','note']<>'{}'::jsonb or coalesce(p->>'occurredOn','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise invalid_parameter_value;end if;
  amount=takween.business_integer(p,'amountPaise',9000000000000);if amount=0 then raise invalid_parameter_value;end if;
  if (p->>'kind'='income' and p->>'category' not in ('sale','other')) or (p->>'kind'='expense' and p->>'category'='sale') then raise invalid_parameter_value;end if;
  insert into takween.finance_entries(kind,category,amount_paise,occurred_on,order_id,note,actor_id)
   values(p->>'kind',p->>'category',amount,(p->>'occurredOn')::date,(p->>'orderId')::uuid,p->>'note',auth.uid()) returning * into f;
 elsif p->>'action'='finance.reverse' then
  if p-array['action','id','note']<>'{}'::jsonb then raise invalid_parameter_value;end if;
  select * into original from takween.finance_entries where id=(p->>'id')::uuid for update;
  if not found or original.reversal_of is not null then raise invalid_parameter_value;end if;
  insert into takween.finance_entries(kind,category,amount_paise,occurred_on,order_id,reversal_of,note,actor_id)
   values(original.kind,original.category,-original.amount_paise,current_date,original.order_id,original.id,p->>'note',auth.uid()) returning * into f;
 else raise invalid_parameter_value;end if;
 return jsonb_build_object('id',f.id);
end; $$;
revoke all on function takween.business_finance_command(jsonb) from public,anon,authenticated,service_role;

-- Retain the tested resources implementation privately; its retry receipts persist.
alter function public.takween_business_command(uuid,jsonb) rename to business_resources_command;
alter function public.business_resources_command(uuid,jsonb) set schema takween;
revoke all on function takween.business_resources_command(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.takween_business_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior takween.business_receipts%rowtype;result jsonb;action text=p_payload->>'action';
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16000 then raise invalid_parameter_value;end if;
 if split_part(action,'.',1) in ('material','machine','estimate') then return takween.business_resources_command(p_request_id,p_payload);end if;
 if jsonb_typeof(p_payload->'note')<>'string' or p_payload->>'note' is null or length(btrim(p_payload->>'note')) not between 1 and 2000 then raise invalid_parameter_value;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,12));
 select * into prior from takween.business_receipts where id=p_request_id;
 if found then if prior.actor_id<>auth.uid() or prior.payload<>p_payload then raise exception using errcode='23505',message='Conflicting retry';end if;return prior.result;end if;
 if split_part(action,'.',1)='schedule' then result=takween.business_schedule_command(p_payload);
 elsif split_part(action,'.',1)='finance' then result=takween.business_finance_command(p_payload);
 else raise invalid_parameter_value;end if;
 insert into takween.business_events(entity_id,action,note,actor_id) values((result->>'id')::uuid,action,p_payload->>'note',auth.uid());
 insert into takween.business_receipts(id,actor_id,payload,result) values(p_request_id,auth.uid(),p_payload,result);
 return result;
end; $$;
revoke all on function public.takween_business_command(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_command(uuid,jsonb) to authenticated;

create or replace function public.takween_business_list(p_kind text,p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;relation text;
begin
 if not takween.owner_authorized() then raise insufficient_privilege;end if;
 if p_search is null or length(p_search)>100 or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value;end if;
 if p_kind='choices' then return jsonb_build_array(jsonb_build_object(
  'orders',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select id,reference,category,state from takween.orders where p_search='' or strpos(lower(reference),lower(p_search))>0 order by created_at desc,id limit 100) x),
  'machines',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select id,name,category,status from takween.machines order by created_at desc,id limit 100) x),
  'estimates',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select id,note from takween.cost_estimates order by created_at desc,id limit 100) x)));end if;
 if p_kind='reports' then return jsonb_build_array(jsonb_build_object(
  'scope','All-time manually recorded values; not tax profit or payment verification',
  'recordedIncomePaise',(select coalesce(sum(amount_paise),0)::text from takween.finance_entries where kind='income'),
  'recordedExpensePaise',(select coalesce(sum(amount_paise),0)::text from takween.finance_entries where kind='expense'),
  'recordedSurplusPaise',(select coalesce(sum(case when kind='income' then amount_paise else -amount_paise end),0)::text from takween.finance_entries),
  'materialStockMg',(select coalesce(sum(stock_mg),0)::text from takween.materials),
  'plannedReservations',(select count(*) from takween.job_schedule where status='planned'),
  'ordersByState',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(select state,count(*) as count from takween.orders group by state) x)));end if;
 if p_kind='finance' then return(select coalesce(jsonb_agg(v),'[]'::jsonb) from(
  select to_jsonb(f)||jsonb_build_object('is_reversed',exists(select 1 from takween.finance_entries r where r.reversal_of=f.id)) v
  from takween.finance_entries f where p_search='' or strpos(lower(f.note),lower(p_search))>0 order by f.created_at desc,f.id limit 25 offset p_offset
 ) q);end if;
 if p_kind='scheduling' then return(select coalesce(jsonb_agg(v),'[]'::jsonb) from(
  select to_jsonb(j)||jsonb_build_object('order_reference',o.reference,'machine_name',m.name,'machine_status',m.status) v
  from takween.job_schedule j join takween.orders o on o.id=j.order_id join takween.machines m on m.id=j.machine_id
  where p_search='' or strpos(lower(j.note||' '||o.reference||' '||m.name),lower(p_search))>0 order by j.created_at desc,j.id limit 25 offset p_offset
 ) q);end if;
 if p_kind='job_costs' then return(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from(
  select o.id,o.reference,o.state,
   o.snapshot->'quotation'->>'total_paise' as quoted_total_paise,
   (select coalesce(sum(amount_paise),0)::text from takween.finance_entries f where f.order_id=o.id and f.kind='income') as recorded_income_paise,
   (select coalesce(sum(amount_paise),0)::text from takween.finance_entries f where f.order_id=o.id and f.kind='expense') as recorded_expense_paise,
   (select coalesce(sum(-delta_mg),0)::text from takween.material_movements m where m.order_id=o.id and m.delta_mg<0) as consumed_material_mg,
   (select coalesce(jsonb_agg(jsonb_build_object('reservationId',j.id,'estimateId',e.id,'basePaise',e.result->'basePaise')),'[]'::jsonb)
    from takween.job_schedule j join takween.cost_estimates e on e.id=j.estimate_id where j.order_id=o.id and j.status<>'cancelled') as estimate_snapshots
  from takween.orders o where p_search='' or strpos(lower(o.reference),lower(p_search))>0 order by o.created_at desc,o.id limit 25 offset p_offset
 ) x);end if;
 relation=case p_kind when 'materials' then 'materials' when 'movements' then 'material_movements' when 'machines' then 'machines' when 'maintenance' then 'machine_maintenance' when 'estimates' then 'cost_estimates' when 'events' then 'business_events' when 'scheduling' then 'job_schedule' when 'finance' then 'finance_entries' else null end;
 if relation is null then raise invalid_parameter_value;end if;
 execute format('select coalesce(jsonb_agg(v),''[]''::jsonb) from(select to_jsonb(t) v from takween.%I t where $1='''' or strpos(lower(coalesce(to_jsonb(t)->>''name'','''')||'' ''||coalesce(to_jsonb(t)->>''note'','''')),lower($1))>0 order by created_at desc,id limit 25 offset $2) q',relation) into result using p_search,p_offset;
 return result;
end; $$;
revoke all on function public.takween_business_list(text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.takween_business_list(text,text,integer) to authenticated;
commit;
