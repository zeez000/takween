begin;
alter table takween.notification_outbox add column lease_token uuid;
alter table takween.notification_outbox add column first_attempt_at timestamptz;
alter table takween.notification_outbox add column last_outcome text check (last_outcome in ('retry','failed','uncertain','accepted'));
alter table takween.notification_outbox add constraint outbox_lease_token check ((state='leased')=(lease_token is not null));

create function public.takween_claim_notification() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job takween.notification_outbox%rowtype; result jsonb;
begin
  -- An expired lease may have sent successfully before a crash. Never blindly resend.
  update takween.notification_outbox set state='uncertain',last_outcome='uncertain',lease_until=null,lease_token=null,updated_at=now()
    where state='leased' and lease_until<=now();
  update takween.notification_outbox set state='uncertain',last_outcome='uncertain',updated_at=now()
    where state='pending' and first_attempt_at<now()-interval '20 hours';
  select * into job from takween.notification_outbox where state='pending' and next_attempt_at<=now() and attempts<5
    order by next_attempt_at,id for update skip locked limit 1;
  if not found then return null; end if;
  update takween.notification_outbox set state='leased',lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds',
    attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now()
    where id=job.id returning * into job;
  select jsonb_build_object('id',job.id,'leaseToken',job.lease_token,'reference',e.reference,'name',c.name,'email',c.email,
    'description',e.description,'quantity',e.quantity,'material',e.material,'category',e.category)
    into result from takween.enquiries e join takween.customers c on c.id=e.customer_id where e.id=job.enquiry_id;
  return result;
end; $$;
create function public.takween_finish_notification(p_id uuid,p_lease_token uuid,p_outcome text,p_provider_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare job takween.notification_outbox%rowtype;
begin
  if p_outcome is null or p_outcome not in ('accepted','retry','failed','uncertain') then raise invalid_parameter_value; end if;
  if p_outcome='accepted' and (p_provider_id is null or length(btrim(p_provider_id)) not between 1 and 200) then raise invalid_parameter_value; end if;
  select * into job from takween.notification_outbox where id=p_id for update;
  if not found or job.state<>'leased' or job.lease_token is distinct from p_lease_token or job.lease_until<=now() then return false; end if;
  update takween.notification_outbox set
    state=case when p_outcome='retry' then case when attempts>=5 then 'failed' else 'pending' end else p_outcome end,
    last_outcome=p_outcome, provider_id=case when p_outcome='accepted' then btrim(p_provider_id) else null end,
    next_attempt_at=now()+least(3600,power(2,attempts)::integer*60)*interval '1 second',
    lease_token=null,lease_until=null,updated_at=now() where id=p_id;
  return true;
end; $$;
revoke all on function public.takween_claim_notification() from public,anon,authenticated,service_role;
revoke all on function public.takween_finish_notification(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.takween_claim_notification() to service_role;
grant execute on function public.takween_finish_notification(uuid,uuid,text,text) to service_role;

-- Replay confirmation reports durable storage, not the current notification outcome.
-- This RPC's existing 'pending' receipt is retained until intake receipt v2 below.
commit;
