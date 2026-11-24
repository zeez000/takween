begin;
create or replace function public.takween_owner_inbox(p_search text default '',p_category text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if not takween.owner_authorized() then raise insufficient_privilege; end if;
  if p_search is null or length(p_search)>100 or p_category not in ('','printing','fateen_machining') or p_category is null
    or p_offset is null or p_offset<0 or p_offset>100000 then raise invalid_parameter_value; end if;
  select coalesce(jsonb_agg(q.item order by q.created_at desc,q.id),'[]'::jsonb) into result from (
    select e.id,e.created_at,jsonb_build_object(
      'id',e.id,'reference',e.reference,'category',e.category,'description',e.description,'status',e.status,
      'quantity',e.quantity,'material',e.material,'colour',e.colour,'dimensions',e.dimensions,
      'preferredDeadline',e.preferred_deadline,'createdAt',e.created_at,'process',e.process,'referralConsent',e.referral_consent,'privacyVersion',e.privacy_version,
      'customer',jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone),
      'history',(select coalesce(jsonb_agg(jsonb_build_object('kind',h.kind,'createdAt',h.created_at) order by h.created_at),'[]'::jsonb) from takween.enquiry_events h where h.enquiry_id=e.id),
      'notes',(select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'createdAt',n.created_at) order by n.created_at),'[]'::jsonb) from takween.enquiry_notes n where n.enquiry_id=e.id)
    ) item from takween.enquiries e join takween.customers c on c.id=e.customer_id
    where (p_category='' or e.category=p_category) and
      (p_search='' or strpos(lower(e.reference||' '||c.name||' '||c.email),lower(btrim(p_search)))>0)
    order by e.created_at desc,e.id limit 25 offset p_offset
  ) q;
  return result;
end; $$;
commit;
