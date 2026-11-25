-- READ ONLY: aggregate counts/configuration; no emails, UUIDs, names or filenames.
begin transaction read only;
set local statement_timeout='20s';
set local lock_timeout='2s';
with result as (
 select 'auth_counts' section,jsonb_build_object(
  'users',(select count(*) from auth.users),
  'identity_rows',(select count(*) from auth.identities),
  'mfa_factors',(select count(*) from auth.mfa_factors),
  'verified_totp_factors',(select count(*) from auth.mfa_factors where factor_type='totp' and status='verified')
 ) metadata
 union all
 select 'storage_counts',jsonb_build_object(
  'buckets',(select count(*) from storage.buckets),
  'public_buckets',(select count(*) from storage.buckets where public),
  'object_metadata_rows',(select count(*) from storage.objects)
 )
 union all
 select 'bucket_configuration',coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) from (
  select md5(id) as bucket_key,public,
   to_jsonb(x)->'file_size_limit' as configured_file_size_limit,
   to_jsonb(x)->'allowed_mime_types' as allowed_mime_types,
   (select count(*) from storage.objects o where o.bucket_id=x.id) as object_count
  from storage.buckets x order by md5(id)
 ) b
)
select section,metadata from result order by section;
commit;
