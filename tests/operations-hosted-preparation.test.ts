import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('001-011 override broad inherited grants without changing global defaults',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 grant usage on schema auth,public to authenticated;grant usage on schema public to anon,service_role;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 alter default privileges grant all on tables to anon,authenticated,service_role;
 alter default privileges grant execute on functions to public,anon,authenticated,service_role;
 alter default privileges grant all on schemas to anon,authenticated,service_role;`);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')&&f<='202611240011_quotation_revision_visibility.sql').sort())await db.exec(await readFile(`supabase/migrations/${f}`,'utf8'));
 const checks=(await db.exec(await readFile('supabase/inspection/post-migration-security.sql','utf8'))).flatMap(r=>r.rows??[]);assert.equal(checks.length,9);assert.deepEqual(checks.filter(r=>r.result!=='PASS'),[]);
 const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';await db.query('insert into auth.users values($1),($2)',[owner,other]);await db.query('insert into takween.admin_roles(user_id) values($1)',[owner]);
 for(const [id,aal,expected] of [[owner,'aal1',0],[other,'aal2',0],[owner,'aal2',1]]){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,aal})]);await db.exec('set role authenticated');assert.equal((await db.query('select * from takween.admin_roles')).rows.length,expected);await assert.rejects(db.exec('insert into takween.admin_roles(user_id) values(gen_random_uuid())'));await db.exec('reset role');}
 assert.ok((await db.query('select * from pg_default_acl')).rows.length>0,'Global defaults were not erased to make the test pass');
 await db.exec('grant insert on takween.customers to anon');const bad=(await db.exec(await readFile('supabase/inspection/post-migration-security.sql','utf8'))).flatMap(r=>r.rows??[]);assert.ok(bad.some(r=>r.check_name==='no_direct_client_mutation_grants'&&r.result==='FAIL'));
 }finally{await db.close();}
});
test('Auth and Storage count export excludes synthetic personal information and credentials',async()=>{
 const db=new PGlite();try{await db.exec(`create schema auth;create table auth.users(email text,password_hash text);insert into auth.users values('PRIVATE_EMAIL_CANARY','PRIVATE_PASSWORD_CANARY');create table auth.identities(secret text);insert into auth.identities values('PRIVATE_IDENTITY_CANARY');create table auth.mfa_factors(factor_type text,status text,secret text);insert into auth.mfa_factors values('totp','verified','PRIVATE_TOTP_CANARY');create schema storage;create table storage.buckets(id text,public boolean,file_size_limit bigint,allowed_mime_types text[]);insert into storage.buckets values('PRIVATE_BUCKET_CANARY',false,30000000,array['model/stl']);create table storage.objects(bucket_id text,name text);insert into storage.objects values('PRIVATE_BUCKET_CANARY','PRIVATE_FILENAME_CANARY');`);
 const rows=(await db.exec(await readFile('supabase/inspection/hosted-auth-storage-counts.sql','utf8'))).flatMap(r=>r.rows??[]);assert.equal(rows.length,3);assert.equal((rows.find(r=>r.section==='auth_counts')!.metadata as {users:number}).users,1);assert.ok(!JSON.stringify(rows).includes('PRIVATE_'));
 }finally{await db.close();}
});
