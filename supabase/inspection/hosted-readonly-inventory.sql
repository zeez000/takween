-- Metadata only. No customer/Auth rows, keys, function bodies or SQL literals.
-- Run the ENTIRE block in the intended project's Supabase SQL Editor.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '2s';

WITH
role_map AS (
  SELECT oid,
    CASE WHEN rolname IN ('postgres','anon','authenticated','service_role',
      'authenticator','supabase_admin','supabase_auth_admin',
      'supabase_storage_admin','dashboard_user','pg_database_owner')
      THEN rolname ELSE 'role_oid_' || oid::text END AS role_key,
    rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
  FROM pg_catalog.pg_roles
),
relations AS (
  SELECT c.*,n.nspname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','takween','supabase_migrations')
    AND c.relkind IN ('r','p','v','m','S')
),
functions AS (
  SELECT p.*,n.nspname
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE p.prokind IN ('f','p') AND (n.nspname='takween'
    OR (n.nspname='public' AND p.proname LIKE 'takween\_%' ESCAPE '\'))
),
sections AS (
 SELECT '01_database' AS section,jsonb_build_object(
   'database',current_database(),'postgres_version',current_setting('server_version'),
   'read_only',current_setting('transaction_read_only'),
   'recovery_mode',pg_is_in_recovery(),
   'takween_schema_exists',to_regnamespace('takween') IS NOT NULL,
   'migration_table_exists',to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
   'cron_catalog_exists',to_regclass('cron.job') IS NOT NULL,
   'storage_catalog_exists',to_regclass('storage.buckets') IS NOT NULL
 ) AS metadata
 UNION ALL
 SELECT '02_schemas',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT n.nspname AS schema,r.role_key AS owner
   FROM pg_catalog.pg_namespace n LEFT JOIN role_map r ON r.oid=n.nspowner
   WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'
   ORDER BY n.nspname
 ) x
 UNION ALL
 SELECT '03_relations',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT c.nspname AS schema,c.relname AS relation,c.relkind AS kind,
     r.role_key AS owner,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls
   FROM relations c LEFT JOIN role_map r ON r.oid=c.relowner ORDER BY 1,2
 ) x
 UNION ALL
 SELECT '04_columns',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT table_schema,table_name,column_name,data_type,udt_schema,udt_name,
     is_nullable,ordinal_position
   FROM information_schema.columns
   WHERE table_schema IN ('public','takween','supabase_migrations')
   ORDER BY table_schema,table_name,ordinal_position
 ) x
 UNION ALL
 SELECT '05_constraints',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT c.nspname AS schema,c.relname AS relation,k.conname AS name,
     k.contype AS type,k.convalidated AS validated,
     k.condeferrable AS deferrable,k.condeferred AS initially_deferred,
     k.conkey AS column_numbers,k.confkey AS referenced_column_numbers,
     k.confrelid::regclass::text AS referenced_relation,
     md5(pg_get_constraintdef(k.oid)) AS definition_fingerprint
   FROM pg_catalog.pg_constraint k JOIN relations c ON c.oid=k.conrelid
   ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '06_indexes',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT c.nspname AS schema,c.relname AS relation,ic.relname AS name,
     i.indisunique AS is_unique,i.indisprimary AS is_primary,i.indisvalid AS valid,
     i.indkey::text AS column_numbers,
     i.indexprs IS NOT NULL AS has_expressions,i.indpred IS NOT NULL AS partial,
     md5(pg_get_indexdef(i.indexrelid)) AS definition_fingerprint
   FROM pg_catalog.pg_index i JOIN relations c ON c.oid=i.indrelid
   JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '07_rls_policies',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT c.nspname AS schema,c.relname AS relation,p.polname AS policy,
     p.polpermissive AS permissive,p.polcmd AS command,
     ARRAY(SELECT CASE WHEN v=0 THEN 'PUBLIC' ELSE COALESCE(r.role_key,'unknown_role') END
       FROM unnest(p.polroles) v LEFT JOIN role_map r ON r.oid=v) AS roles,
     p.polqual IS NOT NULL AS has_using,p.polwithcheck IS NOT NULL AS has_with_check,
     md5(pg_get_expr(p.polqual,p.polrelid)) AS using_fingerprint,
     md5(pg_get_expr(p.polwithcheck,p.polrelid)) AS with_check_fingerprint
   FROM pg_catalog.pg_policy p JOIN relations c ON c.oid=p.polrelid ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '08_schema_grants',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT n.nspname AS schema,
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.role_key END AS grantee,
     a.privilege_type,a.is_grantable
   FROM pg_catalog.pg_namespace n
   CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
   LEFT JOIN role_map r ON r.oid=a.grantee
   WHERE n.nspname IN ('public','takween','supabase_migrations') ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '09_relation_grants',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT c.nspname AS schema,c.relname AS relation,
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.role_key END AS grantee,
     a.privilege_type,a.is_grantable
   FROM relations c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,
     acldefault(CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,c.relowner))) a
   LEFT JOIN role_map r ON r.oid=a.grantee ORDER BY 1,2,3,4
 ) x
 UNION ALL
 SELECT '10_default_grants',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT o.role_key AS creating_role,COALESCE(n.nspname,'all_schemas') AS schema,
     d.defaclobjtype AS object_type,
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.role_key END AS grantee,
     a.privilege_type,a.is_grantable
   FROM pg_catalog.pg_default_acl d
   LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace
   LEFT JOIN role_map o ON o.oid=d.defaclrole
   CROSS JOIN LATERAL aclexplode(d.defaclacl) a
   LEFT JOIN role_map r ON r.oid=a.grantee
   WHERE d.defaclnamespace=0 OR n.nspname IN ('public','takween') ORDER BY 1,2,3,4,5
 ) x
 UNION ALL
 SELECT '11_functions',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT p.nspname AS schema,p.proname AS function,
     pg_get_function_identity_arguments(p.oid) AS arguments,r.role_key AS owner,
     p.prosecdef AS security_definer,p.provolatile AS volatility,
     CASE WHEN NOT EXISTS(SELECT 1 FROM unnest(p.proconfig) s WHERE s LIKE 'search_path=%')
       THEN 'unset'
       WHEN EXISTS(SELECT 1 FROM unnest(p.proconfig) s
         WHERE s IN ('search_path=','search_path=""')) THEN 'explicit_empty'
       ELSE 'configured_value_withheld' END AS search_path,
     md5(pg_get_functiondef(p.oid)) AS definition_fingerprint
   FROM functions p LEFT JOIN role_map r ON r.oid=p.proowner ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '12_function_grants',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT p.nspname AS schema,p.proname AS function,
     pg_get_function_identity_arguments(p.oid) AS arguments,
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.role_key END AS grantee,
     a.privilege_type,a.is_grantable
   FROM functions p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
   LEFT JOIN role_map r ON r.oid=a.grantee ORDER BY 1,2,3,4
 ) x
 UNION ALL
 SELECT '13_triggers',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT n.nspname AS schema,c.relname AS relation,t.tgname AS trigger,
     t.tgenabled AS enabled,t.tgfoid::regprocedure::text AS function,
     md5(pg_get_triggerdef(t.oid)) AS definition_fingerprint
   FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE NOT t.tgisinternal AND n.nspname IN ('public','takween','auth','storage')
   ORDER BY 1,2,3
 ) x
 UNION ALL
 SELECT '14_roles',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT role_key,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
   FROM role_map ORDER BY role_key
 ) x
 UNION ALL
 SELECT '15_extensions',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
 FROM (SELECT extname,extversion FROM pg_catalog.pg_extension ORDER BY extname) x
 UNION ALL
 SELECT '16_migration_history',CASE
   WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL
     THEN jsonb_build_object('status','history_table_absent')
   WHEN NOT has_table_privilege(to_regclass('supabase_migrations.schema_migrations'),'SELECT')
     THEN jsonb_build_object('status','history_not_readable')
   ELSE jsonb_build_object('status','readable','versions_xml',
     pg_catalog.query_to_xml(
       'SELECT CASE WHEN to_jsonb(m)->>''version'' ~ ''^[0-9]{1,30}$'' THEN to_jsonb(m)->>''version'' ELSE ''nonstandard_version_withheld'' END AS version FROM supabase_migrations.schema_migrations m ORDER BY 1',
       false,false,'')::text)
   END
 UNION ALL
 SELECT '17_role_memberships',COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) FROM (
   SELECT parent.role_key AS granted_role,child.role_key AS member_role,m.admin_option
   FROM pg_catalog.pg_auth_members m
   JOIN role_map parent ON parent.oid=m.roleid
   JOIN role_map child ON child.oid=m.member ORDER BY 1,2
 ) x
 UNION ALL
 SELECT '18_api_schema_settings',jsonb_build_object(
   'session_setting_present',current_setting('pgrst.db_schemas',true) IS NOT NULL,
   'session_setting_mentions_takween',COALESCE(
     current_setting('pgrst.db_schemas',true) ~ '(^|[^A-Za-z0-9_])takween([^A-Za-z0-9_]|$)',false),
   'role_settings',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
     SELECT s.setdatabase AS database_oid,COALESCE(r.role_key,'all_roles') AS role,
       split_part(v,'=',1) AS setting,
       v ~ '(^|[^A-Za-z0-9_])takween([^A-Za-z0-9_]|$)' AS mentions_takween
     FROM pg_catalog.pg_db_role_setting s LEFT JOIN role_map r ON r.oid=s.setrole
     CROSS JOIN LATERAL unnest(s.setconfig) v
     WHERE v LIKE 'pgrst.db_schemas=%' OR v LIKE 'pgrst.db_extra_search_path=%'
     ORDER BY 1,2,3
   ) x),'[]'::jsonb)
 )
)
SELECT section,metadata FROM sections ORDER BY section;
COMMIT;
