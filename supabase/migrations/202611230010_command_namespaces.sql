begin;
-- Bind the shared idempotency ledger to the operation domain. The same UUID and
-- superficially identical JSON must never replay a quotation result as an order.
alter function public.takween_quote_command(uuid,jsonb) set schema takween;
alter function public.takween_order_command(uuid,jsonb) set schema takween;
revoke all on function takween.takween_quote_command(uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function takween.takween_order_command(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.takween_quote_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise invalid_parameter_value; end if;
 return takween.takween_quote_command(p_request_id,p_payload||jsonb_build_object('_operation','quote'));
end; $$;
create function public.takween_order_command(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not takween.owner_authorized() then raise insufficient_privilege; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise invalid_parameter_value; end if;
 return takween.takween_order_command(p_request_id,p_payload||jsonb_build_object('_operation','order'));
end; $$;
revoke all on function public.takween_quote_command(uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.takween_order_command(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.takween_quote_command(uuid,jsonb) to authenticated;
grant execute on function public.takween_order_command(uuid,jsonb) to authenticated;
commit;
