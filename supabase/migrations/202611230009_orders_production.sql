begin;
create table takween.orders (
 id uuid primary key default gen_random_uuid(), reference text not null unique default ('TO-'||replace(gen_random_uuid()::text,'-','')),
 quotation_id uuid not null unique references takween.quotations(id), enquiry_id uuid not null references takween.enquiries(id),
 category text not null check(category in ('printing','fateen_machining')), snapshot jsonb not null,
 state text not null default 'queued' check(state in ('queued','designing','printing','machining','quality_check','ready','completed','on_hold','cancelled')),
 version integer not null default 1, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index orders_board on takween.orders(state,created_at desc);
create index orders_enquiry on takween.orders(enquiry_id);
create table takween.order_events (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references takween.orders(id),
 from_state text,to_state text not null, note text not null check(length(btrim(note)) between 1 and 2000),
 actor_id uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index order_history on takween.order_events(order_id,created_at);
create table takween.production_entries (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references takween.orders(id),
 note text not null check(length(btrim(note)) between 1 and 2000),material text not null check(length(material)<=80),
 estimated_cost_paise bigint check(estimated_cost_paise between 0 and 9000000000000),
 actual_cost_paise bigint check(actual_cost_paise between 0 and 9000000000000),
 material_mg bigint check(material_mg between 0 and 1000000000),print_minutes integer check(print_minutes between 0 and 525600),
 actor_id uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index production_history on takween.production_entries(order_id,created_at);
alter table takween.commercial_events add column order_id uuid references takween.orders(id);
create index commercial_order_history on takween.commercial_events(order_id,created_at);
revoke all on takween.orders,takween.order_events,takween.production_entries from public,anon,authenticated,service_role;
alter table takween.orders enable row level security;
alter table takween.order_events enable row level security;
alter table takween.production_entries enable row level security;
grant select on takween.orders,takween.order_events,takween.production_entries to authenticated;
create policy owner_read on takween.orders for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.order_events for select to authenticated using(takween.owner_authorized());
create policy owner_read on takween.production_entries for select to authenticated using(takween.owner_authorized());
create function public.takween_order_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o takween.orders%rowtype;q takween.quotations%rowtype;e takween.enquiries%rowtype;prior takween.commercial_requests%rowtype;
 action text:=p_payload->>'action';next_state text:=p_payload->>'state';previous text;result jsonb;k text;
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8000 then raise invalid_parameter_value; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,8));
 select * into prior from takween.commercial_requests where id=p_request_id;
 if found then
  if prior.actor_id<>auth.uid() or prior.payload<>p_payload then raise exception using errcode='23505',message='Request conflict'; end if;
  return prior.result;
 end if;
 if coalesce(length(btrim(p_payload->>'note')),0) not between 1 and 2000 then raise invalid_parameter_value; end if;
 if action='create' then
  select * into q from takween.quotations where id=(p_payload->>'quotationId')::uuid for update;
  if not found or q.state<>'accepted' then raise invalid_parameter_value; end if;
  select * into e from takween.enquiries where id=q.enquiry_id;
  insert into takween.orders(quotation_id,enquiry_id,category,snapshot,created_by)
   values(q.id,q.enquiry_id,e.category,jsonb_build_object('quotation',to_jsonb(q),'items',
    (select jsonb_agg(to_jsonb(i) order by position) from takween.quotation_items i where quotation_id=q.id)),auth.uid()) returning * into o;
  insert into takween.order_events(order_id,to_state,note,actor_id) values(o.id,o.state,p_payload->>'note',auth.uid());
 elsif action in ('transition','production') then
  select * into o from takween.orders where id=(p_payload->>'id')::uuid for update;
  if not found then raise no_data_found; end if;
  if (p_payload->>'version')::integer is distinct from o.version then raise exception using errcode='40001',message='Stale order'; end if;
  if action='transition' then
   if next_state is null or next_state=o.state or o.state in ('completed','cancelled') then raise invalid_parameter_value; end if;
   if not (next_state in ('on_hold','cancelled') or
    (o.state='queued' and next_state in ('designing','printing','machining')) or
    (o.state='designing' and next_state in ('printing','machining')) or
    (o.state in ('printing','machining') and next_state='quality_check') or
    (o.state='quality_check' and next_state in ('printing','machining','ready')) or
    (o.state='ready' and next_state in ('quality_check','completed')) or
    (o.state='on_hold' and next_state='queued')) then raise invalid_parameter_value; end if;
   if (next_state='machining' and o.category<>'fateen_machining') or (next_state='printing' and o.category<>'printing') then raise invalid_parameter_value; end if;
   previous:=o.state;
   update takween.orders set state=next_state,version=version+1,updated_at=now() where id=o.id returning * into o;
   insert into takween.order_events(order_id,from_state,to_state,note,actor_id) values(o.id,previous,o.state,p_payload->>'note',auth.uid());
  else
   if o.state in ('completed','cancelled') or jsonb_typeof(p_payload->'material') is distinct from 'string' then raise invalid_parameter_value; end if;
   foreach k in array array['estimatedCostPaise','actualCostPaise','materialMg','printMinutes'] loop
    if p_payload->>k is not null and (p_payload->>k)!~'^[0-9]{1,13}$' then raise invalid_parameter_value; end if;
   end loop;
   insert into takween.production_entries(order_id,note,material,estimated_cost_paise,actual_cost_paise,material_mg,print_minutes,actor_id)
    values(o.id,p_payload->>'note',p_payload->>'material',(p_payload->>'estimatedCostPaise')::bigint,(p_payload->>'actualCostPaise')::bigint,
     (p_payload->>'materialMg')::bigint,(p_payload->>'printMinutes')::integer,auth.uid());
   update takween.orders set version=version+1,updated_at=now() where id=o.id returning * into o;
  end if;
 else raise invalid_parameter_value;
 end if;
 insert into takween.commercial_events(order_id,kind,note,actor_id) values(o.id,'order_'||action,p_payload->>'note',auth.uid());
 result:=jsonb_build_object('id',o.id,'reference',o.reference,'state',o.state,'version',o.version);
 insert into takween.commercial_requests(id,actor_id,payload,result) values(p_request_id,auth.uid(),p_payload,result);
 return result;
end; $$;
create function public.takween_commercial_list(p_kind text,p_search text default '',p_state text default '',p_offset integer default 0,p_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if p_search is null or length(p_search)>100 or p_state is null or length(p_state)>30 or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value; end if;
 if p_kind='quotations' then
  select coalesce(jsonb_agg(item),'[]'::jsonb) into result from(
   select to_jsonb(q)||jsonb_build_object('enquiryReference',e.reference,'category',e.category,'items',
    (select coalesce(jsonb_agg(to_jsonb(i) order by position),'[]'::jsonb) from takween.quotation_items i where quotation_id=q.id),
    'history',(select coalesce(jsonb_agg(to_jsonb(h) order by created_at),'[]'::jsonb) from takween.commercial_events h where quotation_id=q.id)) item
   from takween.quotations q join takween.enquiries e on e.id=q.enquiry_id
   where (p_id is null or q.id=p_id) and (p_state='' or q.state=p_state)
    and (p_search='' or strpos(lower(q.reference||' '||e.reference||' '||(q.customer_snapshot->>'name')),lower(p_search))>0)
   order by q.created_at desc,q.id limit 25 offset p_offset
  ) s;
 elsif p_kind='orders' then
  select coalesce(jsonb_agg(item),'[]'::jsonb) into result from(
   select to_jsonb(o)||jsonb_build_object('history',
    (select coalesce(jsonb_agg(to_jsonb(h) order by created_at),'[]'::jsonb) from takween.order_events h where order_id=o.id),
    'production',(select coalesce(jsonb_agg(to_jsonb(j) order by created_at),'[]'::jsonb) from takween.production_entries j where order_id=o.id)) item
   from takween.orders o where (p_id is null or o.id=p_id) and (p_state='' or o.state=p_state)
    and (p_search='' or strpos(lower(o.reference||' '||(o.snapshot->'quotation'->'customer_snapshot'->>'name')),lower(p_search))>0)
   order by o.created_at desc,o.id limit 25 offset p_offset
  ) s;
 else raise invalid_parameter_value;
 end if;
 return result;
end; $$;
revoke all on function public.takween_order_command(uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.takween_commercial_list(text,text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.takween_order_command(uuid,jsonb) to authenticated;
grant execute on function public.takween_commercial_list(text,text,text,integer,uuid) to authenticated;
commit;
