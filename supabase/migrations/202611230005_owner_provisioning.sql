begin;
-- Only identity-verified, allowlisted owners may begin MFA setup. This permits
-- no customer-data reads at AAL1; those still require owner_authorized/AAL2.
create function public.takween_owner_provisioning_allowed() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from takween.admin_roles where user_id=auth.uid() and enabled and role='owner');
$$;
revoke all on function public.takween_owner_provisioning_allowed() from public,anon,authenticated,service_role;
grant execute on function public.takween_owner_provisioning_allowed() to authenticated;
commit;
