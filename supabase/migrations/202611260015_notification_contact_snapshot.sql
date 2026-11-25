-- LOCAL ONLY. Preserve notification retry content when owner CRM profiles change.
begin;
-- Apply only while dispatch is disabled and no active lease is running.
do $$begin
 if exists(select 1 from takween.notification_outbox where state='leased' and lease_until>now()) then
  raise exception 'Active notification lease: wait for dispatcher shutdown and lease expiry';
 end if;
end $$;
alter table takween.notification_outbox add column payload_snapshot jsonb
 check(payload_snapshot is null or jsonb_typeof(payload_snapshot)='object');
-- Previous attempts did not retain the original content. Never invent it.
update takween.notification_outbox set state='uncertain',last_outcome='uncertain',lease_until=null,lease_token=null,updated_at=now()
 where (state='pending' and first_attempt_at is not null) or state='leased';
create function takween.protect_notification_snapshot() returns trigger
language plpgsql set search_path='' as $$begin
 if old.payload_snapshot is not null and new.payload_snapshot is distinct from old.payload_snapshot then
  raise exception 'Notification content is immutable after first claim';
 end if;
 return new;
end; $$;
revoke all on function takween.protect_notification_snapshot() from public,anon,authenticated,service_role;
create trigger immutable_notification_snapshot before update on takween.notification_outbox
 for each row execute function takween.protect_notification_snapshot();
create or replace function public.takween_claim_notification() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job takween.notification_outbox%rowtype;payload jsonb;
begin
 update takween.notification_outbox set state='uncertain',last_outcome='uncertain',lease_until=null,lease_token=null,updated_at=now()
  where state='leased' and lease_until<=now();
 update takween.notification_outbox set state='uncertain',last_outcome='uncertain',updated_at=now()
  where state='pending' and first_attempt_at<now()-interval '20 hours';
 select * into job from takween.notification_outbox where state='pending' and next_attempt_at<=now() and attempts<5
  order by next_attempt_at,id for update skip locked limit 1;
 if not found then return null;end if;
 payload=job.payload_snapshot;
 if payload is null then
  if job.first_attempt_at is not null then
   update takween.notification_outbox set state='uncertain',last_outcome='uncertain',updated_at=now() where id=job.id;
   return null;
  end if;
  select jsonb_build_object('reference',e.reference,'name',c.name,'email',c.email,'description',e.description,
   'quantity',e.quantity,'material',e.material,'category',e.category) into payload
   from takween.enquiries e join takween.customers c on c.id=e.customer_id where e.id=job.enquiry_id;
  if payload is null then raise exception 'Notification source unavailable';end if;
 end if;
 update takween.notification_outbox set state='leased',lease_token=gen_random_uuid(),lease_until=now()+interval '120 seconds',
  attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),payload_snapshot=payload,updated_at=now()
  where id=job.id returning * into job;
 return payload||jsonb_build_object('id',job.id,'leaseToken',job.lease_token);
end; $$;
revoke all on function public.takween_claim_notification() from public,anon,authenticated,service_role;
grant execute on function public.takween_claim_notification() to service_role;
commit;
