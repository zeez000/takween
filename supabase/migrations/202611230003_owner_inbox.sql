begin;
alter table takween.audit_events drop constraint audit_events_action_check;
alter table takween.audit_events add constraint audit_events_action_check check (action in ('enquiry_created','owner_note'));
alter table takween.enquiry_events drop constraint enquiry_events_kind_check;
alter table takween.enquiry_events add constraint enquiry_events_kind_check check (kind in ('created','note_added'));
create table takween.enquiry_notes (
  id uuid primary key,
  enquiry_id uuid not null references takween.enquiries(id),
  body text not null check (length(btrim(body)) between 1 and 2000),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index enquiry_notes_history on takween.enquiry_notes(enquiry_id,created_at);
revoke all on takween.enquiry_notes from public,anon,authenticated,service_role;
alter table takween.enquiry_notes enable row level security;
grant select on takween.enquiry_notes to authenticated;
create policy owner_read on takween.enquiry_notes for select to authenticated using (takween.owner_authorized());

create function public.takween_owner_inbox(p_search text default '',p_category text default '',p_offset integer default 0)
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
      'preferredDeadline',e.preferred_deadline,'createdAt',e.created_at,
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
create function public.takween_owner_add_note(p_enquiry_id uuid,p_note_id uuid,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare existing takween.enquiry_notes%rowtype;
begin
  if not takween.owner_authorized() then raise insufficient_privilege; end if;
  if p_note_id is null or p_enquiry_id is null or p_body is null or length(btrim(p_body)) not between 1 and 2000 then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_note_id::text,0));
  select * into existing from takween.enquiry_notes where id=p_note_id;
  if found then
    if existing.enquiry_id<>p_enquiry_id or existing.body<>btrim(p_body) or existing.actor_id<>auth.uid() then
      raise exception using errcode='23505',message='Note identifier conflict';
    end if;
    return;
  end if;
  if not exists(select 1 from takween.enquiries where id=p_enquiry_id) then raise no_data_found; end if;
  insert into takween.enquiry_notes(id,enquiry_id,body,actor_id) values(p_note_id,p_enquiry_id,btrim(p_body),auth.uid());
  insert into takween.enquiry_events(enquiry_id,kind,actor_id) values(p_enquiry_id,'note_added',auth.uid());
  insert into takween.audit_events(entity_id,action,actor_id) values(p_enquiry_id,'owner_note',auth.uid());
end; $$;
revoke all on function public.takween_owner_inbox(text,text,integer) from public,anon,authenticated,service_role;
revoke all on function public.takween_owner_add_note(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.takween_owner_inbox(text,text,integer) to authenticated;
grant execute on function public.takween_owner_add_note(uuid,uuid,text) to authenticated;
commit;
