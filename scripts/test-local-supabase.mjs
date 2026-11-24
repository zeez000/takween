// Opt-in, disposable localhost ONLY. Never loads application env files.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {randomUUID,randomBytes,createHmac,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
import {dispatchNotification} from '../src/lib/operations/dispatcher.ts';

if(process.env.TAKWEEN_LOCAL_INTEGRATION!=='1') throw Error('Explicit local integration opt-in is required');
const file=resolve(process.env.TAKWEEN_LOCAL_SUPABASE_STATUS??'');
if(!relative(resolve('artifacts'),file) || relative(resolve('artifacts'),file).startsWith('..')) throw Error('Status must be an ignored local artifact');
const status=JSON.parse(await readFile(file,'utf8'));
const env=status.env;
for(const value of [env?.API_URL,env?.DB_URL]){
  const u=new URL(value);
  if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)) throw Error('Refusing non-loopback database or API');
}
if(!['native','docker','podman'].includes(status.runtime)) throw Error('Requires an actual local Supabase status');
const db=new Client({connectionString:env.DB_URL});
const connections=[];
const authClients=[];
const outcomes=[];
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(env.API_URL,env.SECRET_KEY??env.SERVICE_ROLE_KEY,options);
const client=()=>{const c=createClient(env.API_URL,env.PUBLISHABLE_KEY??env.ANON_KEY,options);authClients.push(c);return c;};
async function check(name,run){await run();outcomes.push({name,result:'pass'});console.log('PASS:',name);}
function totp(secret){
  let bits='';for(const c of secret.toUpperCase().replace(/=+$/,'')){const i='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);assert.ok(i>=0);bits+=i.toString(2).padStart(5,'0');}
  const bytes=Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const h=createHmac('sha1',bytes).update(counter).digest();const o=h[h.length-1]&15;
  return ((h.readUInt32BE(o)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
const payload={name:'Synthetic Local Customer',email:'synthetic@example.invalid',description:'Disposable integration project',quantity:1,
  material:'PLA',category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'local-test-only'};
const users=[];
let browserOwner;
try{
  await db.connect();
  await db.query('create schema if not exists takween_local_tests');
  await db.query('create table if not exists takween_local_tests.migrations(name text primary key,hash text not null)');
  for(const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()){
    const sql=await readFile('supabase/migrations/'+name,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
    const found=await db.query('select hash from takween_local_tests.migrations where name=$1',[name]);
    if(found.rows.length){assert.equal(found.rows[0].hash,hash,'Applied local migration changed');continue;}
    await db.query(sql);await db.query('insert into takween_local_tests.migrations values($1,$2)',[name,hash]);
  }
  await db.query("notify pgrst, 'reload schema'");
  await new Promise(r=>setTimeout(r,1000));
  await check('versioned migrations applied to actual disposable PostgreSQL',async()=>{
    assert.ok((await db.query("select count(*)::int n from pg_tables where schemaname='takween'")).rows[0].n>=6);
  });
  const anon=client();
  await check('anonymous Data API cannot invoke privileged intake or expose private schema',async()=>{
    assert.ok((await anon.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:payload})).error);
    assert.ok((await anon.schema('takween').from('enquiries').select('*')).error);
    assert.ok((await anon.rpc('takween_owner_authorized')).error);
  });
  const createIdentity=async()=>{
    const email=`local-${randomUUID()}@example.invalid`;const password=randomBytes(24).toString('base64url');
    const created=await service.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);
    const id=created.data.user.id;users.push(id);
    const c=client();const signed=await c.auth.signInWithPassword({email,password});assert.equal(signed.error,null);
    return {id,c,email,password,async freshAal1(){const fresh=client();assert.equal((await fresh.auth.signInWithPassword({email,password})).error,null);return fresh;}};
  };
  const ordinary=await createIdentity();const owner=await createIdentity();
  await db.query('insert into takween.admin_roles(user_id) values($1)',[owner.id]);
  await check('real Auth identity, ordinary user and allowlisted AAL1 owner remain unauthorized',async()=>{
    for(const c of [ordinary.c,owner.c]){
      assert.ok((await c.auth.getUser()).data.user);
      assert.equal((await c.rpc('takween_owner_authorized')).data,false);
      assert.ok((await c.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:payload})).error);
      assert.ok((await c.schema('takween').from('enquiries').select('*')).error);
    }
  });
  await check('actual TOTP enrolment and challenge yield AAL2 owner authorization',async()=>{
    const enrolled=await owner.c.auth.mfa.enroll({factorType:'totp',friendlyName:'Disposable local test'});assert.equal(enrolled.error,null);
    browserOwner={email:owner.email,password:owner.password,totpSecret:enrolled.data.totp.secret};
    const verified=await owner.c.auth.mfa.challengeAndVerify({factorId:enrolled.data.id,code:totp(enrolled.data.totp.secret)});assert.equal(verified.error,null);
    assert.equal((await owner.c.rpc('takween_owner_authorized')).data,true);
    await db.query('update takween.admin_roles set enabled=false where user_id=$1',[owner.id]);
    assert.equal((await owner.c.rpc('takween_owner_authorized')).data,false);
    await db.query('update takween.admin_roles set enabled=true where user_id=$1',[owner.id]);
  });
  await check('an AAL1 session cannot bypass an existing verified factor by enrolling a replacement',async()=>{
    const aal1=await owner.freshAal1();
    const added=await aal1.auth.mfa.enroll({factorType:'totp',friendlyName:'AAL1 replacement negative test'});
    if(added.error){assert.equal(added.error.status,403);}
    else{
      try{
        const verified=await aal1.auth.mfa.challengeAndVerify({factorId:added.data.id,code:totp(added.data.totp.secret)});
        assert.ok(verified.error,'Existing MFA must protect replacement enrolment');assert.equal(verified.error.status,403);
      }finally{await owner.c.auth.mfa.unenroll({factorId:added.data.id});}
    }
  });
  await check('concurrent actual PostgREST retries create one enquiry and one notification',async()=>{
    const id=randomUUID();
    const results=await Promise.all(Array.from({length:8},()=>service.rpc('takween_submit_enquiry',{p_request_id:id,p_payload:payload})));
    for(const r of results)assert.equal(r.error,null);
    assert.equal(new Set(results.map(r=>r.data[0].reference)).size,1);
    const row=(await db.query('select id from takween.enquiries where request_id=$1',[id])).rows[0];
    for(const table of ['enquiry_events','notification_outbox'])assert.equal((await db.query(`select count(*)::int n from takween.${table} where enquiry_id=$1`,[row.id])).rows[0].n,1);
    const conflict=await service.rpc('takween_submit_enquiry',{p_request_id:id,p_payload:{...payload,quantity:2}});assert.equal(conflict.error.code,'23505');
  });
  await check('actual transaction failure rolls back contact, enquiry, history and outbox',async()=>{
    const before=(await db.query('select count(*)::int n from takween.customers')).rows[0].n;
    const invalid=await service.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:{...payload,quantity:0}});assert.ok(invalid.error);
    assert.equal((await db.query('select count(*)::int n from takween.customers')).rows[0].n,before);
  });
  await check('real signed JWT RLS context denies ordinary/AAL1 reads and mutations',async()=>{
    const aal1=await owner.freshAal1();
    for(const [c,expected] of [[ordinary.c,0],[aal1,0],[owner.c,1]]){
      const {data}=await c.auth.getSession();const token=data.session.access_token;
      const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
      const connection=new Client({connectionString:env.DB_URL});connections.push(connection);await connection.connect();
      await connection.query('begin');await connection.query('set local role authenticated');
      await connection.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(claims)]);
      const count=(await connection.query('select count(*)::int n from takween.enquiries')).rows[0].n;
      assert.ok(expected?count>0:count===0);
      await assert.rejects(connection.query('delete from takween.enquiries'));
      await connection.query('rollback');
    }
  });
  await check('public signup is disabled',async()=>{
    assert.ok((await client().auth.signUp({email:`no-signup-${randomUUID()}@example.invalid`,password:randomBytes(24).toString('hex')})).error);
  });
  await check('owner inbox, literal search, notes and history are guarded by real AAL2 identity',async()=>{
    const denied=await ordinary.c.rpc('takween_owner_inbox',{p_search:'',p_category:'',p_offset:0});assert.ok(denied.error);
    const aal1=await owner.freshAal1();assert.ok((await aal1.rpc('takween_owner_inbox',{p_search:'',p_category:'',p_offset:0})).error);
    const inbox=await owner.c.rpc('takween_owner_inbox',{p_search:'Synthetic Local',p_category:'printing',p_offset:0});assert.equal(inbox.error,null);assert.ok(inbox.data.length>0);
    const id=inbox.data[0].id;const noteId=randomUUID();
    assert.ok((await ordinary.c.rpc('takween_owner_add_note',{p_enquiry_id:id,p_note_id:noteId,p_body:'Unauthorized'})).error);
    for(let i=0;i<2;i++)assert.equal((await owner.c.rpc('takween_owner_add_note',{p_enquiry_id:id,p_note_id:noteId,p_body:'Synthetic internal note'})).error,null);
    assert.equal((await db.query('select count(*)::int n from takween.enquiry_notes where id=$1',[noteId])).rows[0].n,1);
    assert.ok((await owner.c.rpc('takween_owner_add_note',{p_enquiry_id:id,p_note_id:noteId,p_body:'Changed retry'})).error);
  });
  await check('machining category retains its process and explicit referral consent in the owner queue',async()=>{
    const created=await service.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:{...payload,category:'fateen_machining',process:'turning',referralConsent:true}});assert.equal(created.error,null);
    const inbox=await owner.c.rpc('takween_owner_inbox',{p_search:'Synthetic Local Customer',p_category:'fateen_machining',p_offset:0});assert.equal(inbox.error,null);
    const row=inbox.data.find(r=>r.reference===created.data[0].reference);assert.ok(row);assert.equal(row.process,'turning');assert.equal(row.referralConsent,true);
  });
  await check('parallel notification claims are exclusive and stale fencing cannot acknowledge',async()=>{
    const claims=await Promise.all(Array.from({length:8},()=>service.rpc('takween_claim_notification')));
    for(const c of claims)assert.equal(c.error,null);
    const jobs=claims.map(c=>c.data).filter(Boolean);assert.ok(jobs.length>0);assert.equal(new Set(jobs.map(j=>j.id)).size,jobs.length);
    for(const job of jobs){
      assert.equal((await service.rpc('takween_finish_notification',{p_id:job.id,p_lease_token:randomUUID(),p_outcome:'accepted',p_provider_id:'synthetic-provider-id'})).data,false);
      const finished=await service.rpc('takween_finish_notification',{p_id:job.id,p_lease_token:job.leaseToken,p_outcome:'accepted',p_provider_id:'synthetic-provider-id'});assert.equal(finished.error,null);assert.equal(finished.data,true);
      assert.equal((await service.rpc('takween_finish_notification',{p_id:job.id,p_lease_token:job.leaseToken,p_outcome:'accepted',p_provider_id:'synthetic-provider-id'})).data,false);
    }
    assert.ok((await ordinary.c.rpc('takween_claim_notification')).error);
  });
  await check('expired leases and aged retries are held instead of blindly resending',async()=>{
    await service.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:payload});
    const claim=await service.rpc('takween_claim_notification');assert.equal(claim.error,null);const job=claim.data;assert.ok(job);
    await db.query("update takween.notification_outbox set lease_until=now()-interval '1 second' where id=$1",[job.id]);
    const next=await service.rpc('takween_claim_notification');assert.equal(next.error,null);
    assert.equal((await db.query('select state from takween.notification_outbox where id=$1',[job.id])).rows[0].state,'uncertain');
    await service.rpc('takween_submit_enquiry',{p_request_id:randomUUID(),p_payload:payload});
    const retry=(await service.rpc('takween_claim_notification')).data;assert.ok(retry);
    assert.equal((await service.rpc('takween_finish_notification',{p_id:retry.id,p_lease_token:retry.leaseToken,p_outcome:'retry',p_provider_id:null})).data,true);
    assert.equal((await db.query('select next_attempt_at>now() future from takween.notification_outbox where id=$1',[retry.id])).rows[0].future,true);
    await db.query("update takween.notification_outbox set first_attempt_at=now()-interval '21 hours',next_attempt_at=now() where id=$1",[retry.id]);
    await service.rpc('takween_claim_notification');
    assert.equal((await db.query('select state from takween.notification_outbox where id=$1',[retry.id])).rows[0].state,'uncertain');
  });
  await check('dispatcher uses real durable leases with mocked Resend, backoff and stable idempotency',async()=>{
    const id=randomUUID();await service.rpc('takween_submit_enquiry',{p_request_id:id,p_payload:payload});
    let claimed;
    const repo={async claim(){const r=await service.rpc('takween_claim_notification');assert.equal(r.error,null);if(claimed)assert.equal(r.data?.id,claimed.id);else claimed=r.data;return r.data;},
      async finish(job,outcome,providerId){const r=await service.rpc('takween_finish_notification',{p_id:job.id,p_lease_token:job.leaseToken,p_outcome:outcome,p_provider_id:providerId??null});assert.equal(r.error,null);return r.data;}};
    const config={ENQUIRY_NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'synthetic-only-not-a-key',RESEND_FROM_EMAIL:'local@example.invalid'};
    const keys=[];
    assert.equal((await dispatchNotification(config,repo,async(_input,init)=>{keys.push(new Headers(init.headers).get('idempotency-key'));return Response.json({},{status:429});})).status,'retry');
    // Earlier browser runs may leave other synthetic pending jobs. Exercise the
    // job actually claimed, and make that same retry due before other jobs.
    const job=claimed;assert.ok(job);await db.query("update takween.notification_outbox set next_attempt_at='2000-01-01' where id=$1",[job.id]);
    assert.equal((await dispatchNotification(config,repo,async(_input,init)=>{keys.push(new Headers(init.headers).get('idempotency-key'));return Response.json({id:'synthetic-mock-accepted'});})).status,'accepted');
    assert.equal(keys[0],keys[1]);assert.equal((await db.query('select state from takween.notification_outbox where id=$1',[job.id])).rows[0].state,'accepted');
  });
  await check('phase3 real Auth denies commercial data and mutations without owner AAL2',async()=>{
    const aal1=await owner.freshAal1();
    for(const c of [client(),ordinary.c,aal1]){
      for(const rpc of ['takween_quote_command','takween_order_command'])assert.ok((await c.rpc(rpc,{p_request_id:randomUUID(),p_payload:{action:'create'}})).error);
      assert.ok((await c.rpc('takween_commercial_list',{p_kind:'orders'})).error);
    }
  });
  await check('phase3 concurrent quote requests, rollback, revisions and order deduplication use real PostgREST',async()=>{
    const request=randomUUID();assert.equal((await service.rpc('takween_submit_enquiry',{p_request_id:request,p_payload:payload})).error,null);
    const enquiry=(await db.query('select id from takween.enquiries where request_id=$1',[request])).rows[0].id;
    const nonce=randomUUID(),body={action:'create',enquiryId:enquiry};
    const results=await Promise.all(Array.from({length:8},()=>owner.c.rpc('takween_quote_command',{p_request_id:nonce,p_payload:body})));
    for(const r of results)assert.equal(r.error,null);assert.equal(new Set(results.map(r=>r.data.id)).size,1);const id=results[0].data.id;
    let version=1;
    const invoke=async(rpc,payload,id=randomUUID())=>{const r=await owner.c.rpc(rpc,{p_request_id:id,p_payload:payload});assert.equal(r.error,null);return r.data;};
    const saved={action:'save',id,version,entity:'Synthetic local only',terms:'Synthetic terms, no real offer',notes:'Local testing',validUntil:'2099-12-31',taxBps:125,items:[{description:'Synthetic part',material:'PLA',quantity:3,unitPaise:101}]};
    version=(await invoke('takween_quote_command',saved)).version;
    const invalid=await owner.c.rpc('takween_quote_command',{p_request_id:randomUUID(),p_payload:{...saved,version,items:[{description:'Bad',material:'PLA',quantity:-1,unitPaise:10}]}});assert.ok(invalid.error);
    const items=await db.query('select total_paise from takween.quotation_items where quotation_id=$1',[id]);assert.equal(Number(items.rows[0].total_paise),303);
    for(const state of ['approved','sent','accepted'])version=(await invoke('takween_quote_command',{action:'transition',id,version,state,evidence:'Synthetic manual decision'})).version;
    const orderNonce=randomUUID(),orderBody={action:'create',quotationId:id,note:'Synthetic order'};
    const orders=await Promise.all(Array.from({length:8},()=>owner.c.rpc('takween_order_command',{p_request_id:orderNonce,p_payload:orderBody})));
    for(const r of orders)assert.equal(r.error,null);assert.equal(new Set(orders.map(r=>r.data.id)).size,1);
    assert.ok((await owner.c.rpc('takween_order_command',{p_request_id:randomUUID(),p_payload:orderBody})).error);
    const order=orders[0].data;let orderVersion=order.version;
    const observations=await Promise.all(['first','second'].map(note=>owner.c.rpc('takween_order_command',{p_request_id:randomUUID(),p_payload:{action:'production',id:order.id,version:orderVersion,note,material:'PLA',actualCostPaise:100,materialMg:1000,printMinutes:1}})));
    assert.equal(observations.filter(r=>!r.error).length,1);orderVersion++;
    for(const state of ['printing','quality_check','ready','completed'])orderVersion=(await invoke('takween_order_command',{action:'transition',id:order.id,version:orderVersion,state,note:'Synthetic progress'})).version;
    const listed=await owner.c.rpc('takween_commercial_list',{p_kind:'orders',p_id:order.id});assert.equal(listed.error,null);assert.equal(listed.data[0].production.length,1);assert.equal(listed.data[0].state,'completed');
    await db.query('begin');try{await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:ordinary.id,aal:'aal2'})]);assert.equal((await db.query('select * from takween.production_entries')).rowCount,0);}finally{await db.query('rollback');}
  });
  await check('hardening: real concurrent revisions and acceptance never leave accepted plus newer draft',async()=>{
    async function rpc(payload){return owner.c.rpc('takween_quote_command',{p_request_id:randomUUID(),p_payload:payload});}
    async function sentQuote(){const request=randomUUID();assert.equal((await service.rpc('takween_submit_enquiry',{p_request_id:request,p_payload:payload})).error,null);const enquiry=(await db.query('select id from takween.enquiries where request_id=$1',[request])).rows[0].id;const created=await rpc({action:'create',enquiryId:enquiry});assert.equal(created.error,null);let q=created.data;const save=await rpc({action:'save',id:q.id,version:q.version,entity:'Synthetic only',terms:'Synthetic terms',notes:'',taxBps:0,validUntil:'2099-12-31',items:[{description:'Synthetic part',material:'PLA',quantity:1,unitPaise:101}]});assert.equal(save.error,null);q=save.data;for(const state of ['approved','sent']){const r=await rpc({action:'transition',id:q.id,version:q.version,state,evidence:'Synthetic evidence'});assert.equal(r.error,null);q=r.data;}return {enquiry,q};}
    for(let n=0;n<4;n++){
      const {enquiry,q}=await sentQuote();const operations=[{action:'create',enquiryId:enquiry},{action:'transition',id:q.id,version:q.version,state:'accepted',evidence:'Synthetic customer decision'}];if(n%2)operations.reverse();const results=await Promise.all(operations.map(rpc));assert.equal(results.filter(r=>!r.error).length,1);
      const rows=(await db.query('select revision,state from takween.quotations where enquiry_id=$1 order by revision',[enquiry])).rows;const accepted=rows.filter(r=>r.state==='accepted');if(accepted.length){assert.equal(rows.length,1);assert.ok((await rpc({action:'create',enquiryId:enquiry})).error);}else{assert.equal(rows.length,2);assert.equal(rows[1].state,'draft');assert.ok((await rpc({action:'transition',id:q.id,version:q.version,state:'accepted',evidence:'Obsolete'})).error);}
    }
    const {enquiry,q}=await sentQuote();const revisions=await Promise.all(Array.from({length:8},()=>rpc({action:'create',enquiryId:enquiry})));assert.equal(revisions.filter(r=>!r.error).length,1);
    const family=await owner.c.rpc('takween_commercial_list',{p_kind:'quotations',p_id:q.id});assert.equal(family.error,null);assert.equal(family.data[0].isSuperseded,true);assert.equal(family.data[0].latestRevision,2);
    assert.equal(Number((await db.query("select count(*) n from takween.quotations where enquiry_id=$1 and state='draft'",[enquiry])).rows[0].n),1);
  });
  await check('hardening: real held-job retries, category restrictions and terminal history are consistent',async()=>{
    for(const category of ['printing','fateen_machining']){
      const request=randomUUID();const body=category==='printing'?payload:{...payload,category,material:'Owner review',process:'turning',referralConsent:true};assert.equal((await service.rpc('takween_submit_enquiry',{p_request_id:request,p_payload:body})).error,null);
      const enquiry=(await db.query('select id from takween.enquiries where request_id=$1',[request])).rows[0].id;
      async function quote(p){const r=await owner.c.rpc('takween_quote_command',{p_request_id:randomUUID(),p_payload:p});assert.equal(r.error,null);return r.data;}
      let q=await quote({action:'create',enquiryId:enquiry});q=await quote({action:'save',id:q.id,version:q.version,entity:'Synthetic only',terms:'Synthetic local terms',notes:'',taxBps:0,validUntil:'2099-12-31',items:[{description:'Synthetic service',material:'Review',quantity:1,unitPaise:100}]});for(const state of ['approved','sent','accepted'])q=await quote({action:'transition',id:q.id,version:q.version,state,evidence:'Synthetic evidence'});
      async function order(p,id=randomUUID()){return owner.c.rpc('takween_order_command',{p_request_id:id,p_payload:p});}
      const created=await order({action:'create',quotationId:q.id,note:'Synthetic order'});assert.equal(created.error,null);let o=created.data;
      const held={action:'transition',id:o.id,version:o.version,state:'on_hold',note:'Synthetic hold'},nonce=randomUUID();const hold=await order(held,nonce);assert.equal(hold.error,null);assert.deepEqual((await order(held,nonce)).data,hold.data);o=hold.data;assert.ok((await order({...held,version:o.version})).error);
      const work=category==='printing'?'printing':'machining';assert.ok((await order({action:'transition',id:o.id,version:o.version,state:work,note:'Held must resume queued'})).error);
      for(const state of ['queued','designing',work,'quality_check','ready','completed']){
        if(state===work)assert.ok((await order({action:'transition',id:o.id,version:o.version,state:work==='printing'?'machining':'printing',note:'Wrong category'})).error);
        const r=await order({action:'transition',id:o.id,version:o.version,state,note:'Synthetic progress'});assert.equal(r.error,null);o=r.data;
      }
      assert.ok((await order({action:'transition',id:o.id,version:o.version,state:'queued',note:'Terminal cannot reopen'})).error);
      assert.equal(Number((await db.query('select count(*) n from takween.order_events where order_id=$1',[o.id])).rows[0].n),8);
    }
  });
  await mkdir('artifacts/phase2',{recursive:true});
  browserOwner.invites={};
  for(const project of ['desktop','mobile']){
    const invitation=await service.auth.admin.generateLink({type:'invite',email:`invite-${randomUUID()}@example.invalid`});
    assert.equal(invitation.error,null);
    await db.query('insert into takween.admin_roles(user_id) values($1)',[invitation.data.user.id]);
    browserOwner.invites[project]={hash:invitation.data.properties.hashed_token,password:randomBytes(24).toString('base64url')};
  }
  await writeFile('artifacts/phase2/supabase-integration-results.json',JSON.stringify({runtime:status.runtime,realAuth:true,realPostgREST:true,realMFA:true,outcomes},null,2));
  await writeFile('artifacts/phase2/browser-fixture.json',JSON.stringify(browserOwner),{mode:0o600});
}catch(error){console.error('Local integration failed:',error.name,error.code??'',outcomes.length,'completed checks');process.exitCode=1;}
finally{
  for(const c of authClients){await c.auth.signOut({scope:'local'}).catch(()=>{});}
  // Synthetic users/rows stay in the disposable stack for debugging. No delete
  // operation targets a hosted environment. Destroy the dedicated stack after review.
  await Promise.all(connections.map(c=>c.end().catch(()=>{})));await db.end().catch(()=>{});
}
