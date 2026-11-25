-- Execute ONLY after separately approved 001-011 apply. Metadata only, READ ONLY.
begin transaction read only;
set local statement_timeout='20s';
with
expected_tables(name) as (values ('admin_roles'),('customers'),('enquiries'),
 ('enquiry_events'),('notification_outbox'),('audit_events'),('enquiry_notes'),
 ('quotations'),('quotation_items'),('commercial_events'),('commercial_requests'),
 ('orders'),('order_events'),('production_entries')),
tables as (select e.name,to_regclass('takween.'||e.name) as id,c.relrowsecurity as rls
 from expected_tables e left join pg_class c on c.oid=to_regclass('takween.'||e.name)),
rpc(signature,allowed_role) as (values
 ('public.takween_submit_enquiry(uuid,jsonb)','service_role'),
 ('public.takween_claim_notification()','service_role'),
 ('public.takween_finish_notification(uuid,uuid,text,text)','service_role'),
 ('public.takween_owner_authorized()','authenticated'),
 ('public.takween_owner_provisioning_allowed()','authenticated'),
 ('public.takween_owner_inbox(text,text,integer)','authenticated'),
 ('public.takween_owner_add_note(uuid,uuid,text)','authenticated'),
 ('public.takween_quote_command(uuid,jsonb)','authenticated'),
 ('public.takween_order_command(uuid,jsonb)','authenticated'),
 ('public.takween_commercial_list(text,text,text,integer,uuid)','authenticated')),
checks as (
 select 'tables_present_and_rls' check_name,bool_and(id is not null and coalesce(rls,false)) passed from tables
 union all
 select 'exactly_14_private_tables',(select count(*)=14 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='takween' and c.relkind in ('r','p'))
 union all
 select 'no_direct_client_mutation_grants',not exists(
  select 1 from tables t cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
  cross join (values('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
  where t.id is null or coalesce(has_table_privilege(r.role_name,t.id,p.privilege),true))
 union all
 select 'private_select_grants_exact',bool_and(t.id is not null and
  coalesce(has_table_privilege(r.role_name,t.id,'SELECT'),false)=
  (r.role_name='authenticated' and t.name<>'commercial_requests'))
 from tables t cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
 union all
 select 'rpc_execute_grants_exact',bool_and(to_regprocedure(p.signature) is not null and
  coalesce(has_function_privilege(r.role_name,to_regprocedure(p.signature),'EXECUTE'),false)=(r.role_name=p.allowed_role))
 from rpc p cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
 union all
 select 'private_schema_usage_exact',case when to_regnamespace('takween') is null then false else
  not has_schema_privilege('anon','takween','USAGE') and
  has_schema_privilege('authenticated','takween','USAGE') and
  not has_schema_privilege('service_role','takween','USAGE') end
 union all
 select 'command_ledger_has_no_client_policy',not exists(select 1 from pg_policies where schemaname='takween' and tablename='commercial_requests')
 union all
 select 'owner_read_policies_exact',bool_and((select count(*)=1 and bool_and(
  p.polcmd='r' and p.polpermissive and
  p.polroles=array[(select oid from pg_roles where rolname='authenticated')] and
  regexp_replace(pg_get_expr(p.polqual,p.polrelid),'\s','','g') in
   ('takween.owner_authorized()','owner_authorized()') and p.polwithcheck is null)
  from pg_policy p where p.polrelid=t.id))
 from tables t where t.name<>'commercial_requests'
 union all
 select 'rpc_search_paths_empty',bool_and(p.oid is not null and
  exists(select 1 from unnest(p.proconfig) s where s in ('search_path=','search_path=""')))
 from rpc r left join pg_proc p on p.oid=to_regprocedure(r.signature)
)
select check_name,case when coalesce(passed,false) then 'PASS' else 'FAIL' end as result
from checks order by check_name;
commit;
-- PASS is catalog verification, not a substitute for real Auth/AAL2 or data-isolation tests.
-- Keep takween out of the API exposed schema list; confirm this in Dashboard separately.
