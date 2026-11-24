import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {handlePersistentEnquiry} from '../src/lib/operations/intake.ts';

// Real embedded PostgreSQL/RLS execution. Auth functions below are test stand-ins,
// NOT a Supabase Auth, PostgREST, MFA or multi-connection integration test.
const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const ordinary = '10000000-0000-4000-8000-000000000002';
const disabled = '10000000-0000-4000-8000-000000000003';
const requestId = 'a1234567-1234-4234-8234-123456789abc';
const payload = {name:'Synthetic Customer',email:'customer@example.invalid',description:'Synthetic test project',
  quantity:1,material:'PLA',category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'test-notice-v1'};
async function asRole<T>(role: string, sub: string | null, aal: string, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub,aal})]);
  try { return await run(); } finally { await db.exec('reset role'); }
}
async function submit(id = requestId, body: unknown = payload) {
  return db.query<{reference:string;notification_status:string}>(
    'select * from public.takween_submit_enquiry($1::uuid,$2::jsonb)',[id,JSON.stringify(body)]);
}
before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    grant usage on schema auth to authenticated;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    insert into auth.users values ('${owner}'),('${ordinary}'),('${disabled}');
  `);
  for (const migration of ['202611230001_operational_core.sql','202611230002_persistent_intake.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`,import.meta.url),'utf8'));
  }
  await db.query('insert into takween.admin_roles(user_id,enabled) values ($1,true),($2,false)',[owner,disabled]);
});
after(async () => { await db.close(); });

test('service intake atomically stores contact, enquiry, history, audit and pending notification', async () => {
  const result = await asRole('service_role',null,'aal1', () => submit());
  assert.match(result.rows[0].reference,/^TK-[0-9a-f]{32}$/);
  assert.equal(result.rows[0].notification_status,'pending');
  for (const table of ['customers','enquiries','enquiry_events','audit_events','notification_outbox']) {
    assert.equal((await db.query<{n:number}>(`select count(*)::int as n from takween.${table}`)).rows[0].n,1);
  }
});
test('same canonical payload and request ID retries do not create duplicate records', async () => {
  const first = await submit();
  const reordered = Object.fromEntries(Object.entries(payload).reverse());
  const retry = await submit(requestId,reordered);
  assert.equal(first.rows[0].reference,retry.rows[0].reference);
  await assert.rejects(submit(requestId,{...payload,quantity:2}), /Submission identifier conflict/);
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from takween.enquiries')).rows[0].n,1);
});
test('constraint failure rolls back contacts and all request side effects', async () => {
  const badId = 'b1234567-1234-4234-8234-123456789abc';
  for (const quantity of [0,10001,1.5]) await assert.rejects(submit(badId,{...payload,quantity}));
  for (const mutation of [{contactConsent:null},{email:'spoof\n@example.invalid'},{file:'upload'},
    {category:'fateen_machining',process:'turning',referralConsent:false},{material:'unsupported'}, {name:'x'.repeat(101)}]) {
    await assert.rejects(submit(badId,{...payload,...mutation}));
  }
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from takween.customers')).rows[0].n,1);
});
test('all private tables have RLS, no anonymous grants, no authenticated mutations', async () => {
  const tables = await db.query<{relname:string;relrowsecurity:boolean}>("select relname,relrowsecurity from pg_class where relnamespace='takween'::regnamespace and relkind='r'");
  assert.equal(tables.rows.length,6);
  for (const table of tables.rows) {
    assert.equal(table.relrowsecurity,true);
    assert.equal((await db.query<{v:boolean}>('select has_table_privilege($1,$2,$3) as v',['anon',`takween.${table.relname}`,'SELECT'])).rows[0].v,false);
    for (const permission of ['INSERT','UPDATE','DELETE']) assert.equal((await db.query<{v:boolean}>('select has_table_privilege($1,$2,$3) as v',['authenticated',`takween.${table.relname}`,permission])).rows[0].v,false);
  }
});
test('anonymous and ordinary authenticated clients cannot execute privileged intake', async () => {
  for (const role of ['anon','authenticated']) await asRole(role,ordinary,'aal2',async () => {
    await assert.rejects(submit(),/permission denied/);
  });
  await asRole('service_role',null,'aal1',async () => {
    await assert.rejects(db.query('select * from takween.enquiries'), /permission denied/);
  });
});
test('ordinary, forged-owner metadata, AAL1 owner and disabled owner cannot read customer records', async () => {
  for (const [user,aal] of [[ordinary,'aal2'],[owner,'aal1'],[disabled,'aal2']]) {
    await asRole('authenticated',user,aal,async () => {
      await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,aal,user_metadata:{role:'owner',is_admin:true}})]);
      assert.equal((await db.query<{v:boolean}>('select public.takween_owner_authorized() as v')).rows[0].v,false);
      for (const table of ['customers','enquiries','enquiry_events','admin_roles','audit_events','notification_outbox']) {
        assert.equal((await db.query(`select * from takween.${table}`)).rows.length,0);
      }
    });
  }
});
test('allowlisted AAL2 owner can read but cannot edit membership, history or data', async () => {
  await asRole('authenticated',owner,'aal2',async () => {
    assert.equal((await db.query<{v:boolean}>('select public.takween_owner_authorized() as v')).rows[0].v,true);
    assert.equal((await db.query('select * from takween.enquiries')).rows.length,1);
    await assert.rejects(db.query('delete from takween.audit_events'),/permission denied/);
    await assert.rejects(db.query('update takween.admin_roles set enabled = true'),/permission denied/);
  });
});
test('reused email never merges an unverified guest and Fateen consent does not forward data', async () => {
  const result = await submit('c1234567-1234-4234-8234-123456789abc',{
    ...payload,category:'fateen_machining',process:'turning',referralConsent:true,
  });
  assert.equal(result.rows[0].notification_status,'pending');
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from takween.customers')).rows[0].n,2);
});
test('notification cannot be accepted without provider ID or leased without expiry', async () => {
  await assert.rejects(db.query("update takween.notification_outbox set state='accepted'"),/check constraint/);
  await assert.rejects(db.query("update takween.notification_outbox set state='leased'"),/check constraint/);
});
test('HTTP handler to real SQL persists a retry across independent requests without duplicate side effects',async()=>{
  const body={...payload,requestId:'d1234567-1234-4234-8234-123456789abc',website:''};
  const makeRequest=()=>new Request('https://site.invalid/api/operational/enquiries',{method:'POST',
    headers:{origin:'https://site.invalid','content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify(body)});
  const env={PERSISTENT_ENQUIRIES_ENABLED:'true',ENQUIRY_PRIVACY_VERSION:'test-notice-v1',SITE_URL:'https://site.invalid',
    ENQUIRY_IP_LIMITER:{limit:async()=>({success:true})},ENQUIRY_SITE_LIMITER:{limit:async()=>({success:true})}};
  const references=[];
  for(let i=0;i<2;i++){
    const response=await handlePersistentEnquiry(makeRequest(),env,async(id,p)=>{
      const r=await asRole('service_role',null,'aal1',()=>submit(id,p));return r.rows[0];
    });
    assert.equal(response.status,201);references.push((await response.json()).reference);
  }
  assert.equal(references[0],references[1]);
  for(const table of ['customers','enquiries','enquiry_events','notification_outbox','audit_events']){
    assert.equal((await db.query<{n:number}>(`select count(*)::int as n from takween.${table}`)).rows[0].n,3);
  }
});
test('a conflicting existing schema stops migration transaction without changing stored data',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/202611230001_operational_core.sql',import.meta.url),'utf8');
  await assert.rejects(db.exec(sql),/already exists/);
  await db.exec('rollback');
  assert.equal((await db.query<{n:number}>('select count(*)::int as n from takween.enquiries')).rows[0].n,3);
});
