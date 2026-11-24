begin;
-- Read-only owner metadata; original migrations and issued content remain immutable.
create or replace function public.takween_commercial_list(p_kind text,p_search text default '',p_state text default '',p_offset integer default 0,p_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if p_search is null or length(p_search)>100 or p_state is null or length(p_state)>30 or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value; end if;
 if p_kind='quotations' then
  select coalesce(jsonb_agg(item),'[]'::jsonb) into result from(
   select to_jsonb(q)||jsonb_build_object('isSuperseded',exists(select 1 from takween.quotations newer where newer.enquiry_id=q.enquiry_id and newer.revision>q.revision),'latestRevision',(select max(revision) from takween.quotations family where family.enquiry_id=q.enquiry_id),'enquiryReference',e.reference,'category',e.category,'items',
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
revoke all on function public.takween_commercial_list(text,text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.takween_commercial_list(text,text,text,integer,uuid) to authenticated;
commit;
