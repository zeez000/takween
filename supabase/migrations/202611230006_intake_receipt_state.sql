-- Service-only validated intake. No emails are sent by any database function.
begin;
create or replace function public.takween_submit_enquiry(p_request_id uuid, p_payload jsonb)
returns table(reference text, notification_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  v_existing takween.enquiries%rowtype;
  v_customer uuid;
  v_enquiry takween.enquiries%rowtype;
begin
  if p_request_id is null or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 16384 then
    raise exception using errcode = '22023', message = 'Invalid enquiry';
  end if;
  if exists(select 1 from jsonb_object_keys(p_payload) as k where k not in
    ('name','email','phone','description','quantity','material','colour','dimensions','preferredDeadline','category','process','contactConsent','referralConsent','privacyVersion'))
    or not (p_payload ?& array['name','email','description','quantity','material','category','contactConsent','referralConsent','privacyVersion'])
    or exists(select 1 from jsonb_each(p_payload) where key not in ('quantity','contactConsent','referralConsent') and jsonb_typeof(value) <> 'string')
    or jsonb_typeof(p_payload->'quantity') <> 'number'
    or (p_payload->>'quantity') !~ '^[0-9]{1,5}$'
    or p_payload->'contactConsent' is distinct from 'true'::jsonb
    or jsonb_typeof(p_payload->'referralConsent') <> 'boolean'
    or (p_payload->>'email') !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then
    raise exception using errcode = '22023', message = 'Invalid enquiry';
  end if;
  -- Canonical jsonb digest is computed here, never accepted from the caller.
  v_hash := encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_existing from takween.enquiries where request_id = p_request_id;
  if found then
    if v_existing.payload_hash <> v_hash then
      raise exception using errcode = '23505', message = 'Submission identifier conflict';
    end if;
    return query select v_existing.reference, o.state from takween.notification_outbox o where o.enquiry_id=v_existing.id;
    return;
  end if;
  -- Separate contacts per guest request: an unverified matching email is not identity.
  insert into takween.customers(name,email,phone)
    values (p_payload->>'name',p_payload->>'email',p_payload->>'phone') returning id into v_customer;
  insert into takween.enquiries(customer_id,request_id,payload_hash,category,description,quantity,material,colour,dimensions,
    preferred_deadline,process,contact_consent,referral_consent,privacy_version)
    values (v_customer,p_request_id,v_hash,p_payload->>'category',p_payload->>'description',(p_payload->>'quantity')::integer,
      p_payload->>'material',p_payload->>'colour',p_payload->>'dimensions',(p_payload->>'preferredDeadline')::date,
      p_payload->>'process',true,(p_payload->>'referralConsent')::boolean,p_payload->>'privacyVersion') returning * into v_enquiry;
  insert into takween.enquiry_events(enquiry_id,kind) values (v_enquiry.id,'created');
  insert into takween.audit_events(entity_id,action) values (v_enquiry.id,'enquiry_created');
  insert into takween.notification_outbox(enquiry_id) values (v_enquiry.id);
  return query select v_enquiry.reference, 'pending'::text;
end;
$$;
revoke all on function public.takween_submit_enquiry(uuid,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.takween_submit_enquiry(uuid,jsonb) to service_role;
commit;
