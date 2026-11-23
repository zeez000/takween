import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(); const owner=randomUUID(),ordinary=randomUUID();let enquiry:string,quote:string,version=1;
async function identity(sub:string=owner,aal='aal2',role='authenticated'){
 await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub,aal})]);await db.exec(`set role ${role}`);
}
async function command(payload:object,id=randomUUID()){
 return (await db.query<{result:{id:string;version:number;state:string}}>('select public.takween_quote_command($1,$2) result',[id,JSON.stringify(payload)])).rows[0].result;
}
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 grant usage on schema auth,public to authenticated;grant usage on schema public to anon,service_role;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;`);
 await db.query('insert into auth.users values($1),($2)',[owner,ordinary]);
 for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${f}`,'utf8'));
 await db.query('insert into takween.admin_roles(user_id) values($1)',[owner]);
 const p={name:'Local synthetic',email:'test@example.invalid',description:'Synthetic commercial request',quantity:1,material:'PLA',category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'test'};
 await db.query('select public.takween_submit_enquiry($1,$2)',[randomUUID(),JSON.stringify(p)]);
 enquiry=(await db.query<{id:string}>('select id from takween.enquiries')).rows[0].id;
 await identity();
});
after(()=>db.close());
test('quote RPC denies anonymous ordinary and allowlisted AAL1',async()=>{
 for(const [sub,aal,role] of [[ordinary,'aal2','authenticated'],[owner,'aal1','authenticated'],[owner,'aal2','anon']]){
  await identity(sub,aal,role);await assert.rejects(command({action:'create',enquiryId:enquiry}));
 }
 await identity();
});
test('draft creation is retry-idempotent and duplicate revision is rejected',async()=>{
 const id=randomUUID(),payload={action:'create',enquiryId:enquiry};const a=await command(payload,id);assert.deepEqual(await command(payload,id),a);quote=a.id;
 await assert.rejects(command(payload));await assert.rejects(command({...payload,enquiryId:randomUUID()},id));
});
const save=()=>({action:'save',id:quote,version,entity:'Owner-entered synthetic entity',terms:'Synthetic local terms; not commercial policy',notes:'Test only',taxBps:125,validUntil:'2099-12-31',items:[{description:'Synthetic part',material:'PLA',quantity:3,unitPaise:101}]});
test('integer paise rounding and rollback are authoritative in SQL',async()=>{
 const r=await command(save());version=r.version;
 await db.exec('reset role');const q=(await db.query<{subtotal_paise:number;tax_paise:number;total_paise:number}>('select subtotal_paise,tax_paise,total_paise from takween.quotations')).rows[0];assert.equal(Number(q.subtotal_paise),303);assert.equal(Number(q.tax_paise),4);assert.equal(Number(q.total_paise),307);await identity();
 await assert.rejects(command({...save(),items:[{description:'Invalid',material:'PLA',quantity:-1,unitPaise:100}]}));
 await db.exec('reset role');assert.equal((await db.query<{description:string}>('select description from takween.quotation_items')).rows[0].description,'Synthetic part');await identity();
 await assert.rejects(command({...save(),version:1}));
});
test('owner lifecycle is evidenced and issued content cannot be edited',async()=>{
 for(const state of ['approved','sent','accepted']){const r=await command({action:'transition',id:quote,version,state,evidence:'Synthetic manual confirmation'});version=r.version;}
 await assert.rejects(command(save()));await assert.rejects(command({action:'create',enquiryId:enquiry}));
 await assert.rejects(db.query('update takween.quotations set state=\'draft\''));
});
let order:string,orderVersion=1;
async function orderCommand(payload:object,id=randomUUID()){
 return (await db.query<{result:{id:string;version:number;state:string}}>('select public.takween_order_command($1,$2) result',[id,JSON.stringify(payload)])).rows[0].result;
}
test('accepted quote converts once and the retry returns the same order',async()=>{
 const payload={action:'create',quotationId:quote,note:'Synthetic owner approval'},id=randomUUID();
 const a=await orderCommand(payload,id);order=a.id;assert.deepEqual(await orderCommand(payload,id),a);await assert.rejects(orderCommand(payload));
 const listed=await db.query<{result:unknown[]}>('select public.takween_commercial_list($1,$2) result',['quotations','synthetic']);assert.equal(listed.rows[0].result.length,1);
});
test('production entries and status events are private, versioned and retry safe',async()=>{
 const payload={action:'production',id:order,version:orderVersion,note:'Synthetic material observation',material:'PLA',materialMg:123000,printMinutes:40,estimatedCostPaise:100,actualCostPaise:110};
 const nonce=randomUUID(),a=await orderCommand(payload,nonce);orderVersion=a.version;assert.deepEqual(await orderCommand(payload,nonce),a);
 await assert.rejects(orderCommand(payload));
 await assert.rejects(orderCommand({action:'transition',id:order,version:orderVersion,state:'machining',note:'Wrong category'}));
 await assert.rejects(orderCommand({action:'transition',id:order,version:orderVersion,state:'completed',note:'Invalid jump'}));
 for(const state of ['designing','printing','quality_check','ready','completed']){const r=await orderCommand({action:'transition',id:order,version:orderVersion,state,note:'Synthetic progress'});orderVersion=r.version;}
 await assert.rejects(orderCommand({...payload,version:orderVersion}));
 const listed=(await db.query<{result:{production:unknown[];history:unknown[]}[]}>('select public.takween_commercial_list($1) result',['orders'])).rows[0].result;assert.equal(listed[0].production.length,1);assert.equal(listed[0].history.length,6);
 for(const aal of ['aal1','aal2']){await identity(ordinary,aal);assert.equal((await db.query('select * from takween.orders')).rows.length,0);await assert.rejects(db.query('select public.takween_commercial_list($1)',['orders']));await assert.rejects(orderCommand(payload));}
 await identity();await assert.rejects(db.query('update takween.production_entries set material=\'changed\''));
});
test('draft approval requires explicit tax terms entity and validity; revisions supersede safely',async()=>{
 await db.exec('reset role');const request=randomUUID();await db.query('select public.takween_submit_enquiry($1,$2)',[request,JSON.stringify({name:'Revision synthetic',email:'test@example.invalid',description:'Synthetic revision request',quantity:1,material:'PETG',category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'test'})]);
 const id=(await db.query<{id:string}>('select id from takween.enquiries where request_id=$1',[request])).rows[0].id;await identity();
 const nonce=randomUUID(),payload={action:'create',enquiryId:id};const q=await command(payload,nonce);
 await assert.rejects(orderCommand(payload,nonce));await assert.rejects(db.query('select takween.takween_quote_command($1,$2)',[randomUUID(),JSON.stringify(payload)]));
 const transition=(state:string,v:number)=>command({action:'transition',id:q.id,version:v,state,evidence:'Synthetic lifecycle evidence'});
 await assert.rejects(transition('approved',1));
 const data={...save(),id:q.id,version:1,taxBps:null};let r=await command(data);await assert.rejects(transition('approved',r.version));
 r=await command({...data,version:r.version,taxBps:0});r=await transition('approved',r.version);r=await transition('sent',r.version);r=await transition('rejected',r.version);
 const revision=await command(payload);assert.notEqual(revision.id,q.id);await assert.rejects(transition('accepted',r.version));
 const rows=(await db.query<{r:{revision:number}[]}>('select public.takween_commercial_list($1,$2) r',['quotations','Revision synthetic'])).rows[0].r;assert.equal(rows.length,2);assert.deepEqual(rows.map(q=>q.revision).sort(),[1,2]);
});
test('every Phase3 table denies anonymous access and private rows at AAL1/non-owner',async()=>{
 const tables=['quotations','quotation_items','commercial_events','orders','order_events','production_entries'];
 for(const [sub,aal,role] of [[owner,'aal1','authenticated'],[ordinary,'aal2','authenticated'],[owner,'aal2','anon']]){
  await identity(sub,aal,role);
  for(const table of tables){if(role==='anon')await assert.rejects(db.query(`select * from takween.${table}`));else assert.equal((await db.query(`select * from takween.${table}`)).rows.length,0);}
 }
 await identity();await assert.rejects(db.query('select * from takween.commercial_requests'));
 for(const table of tables)await assert.rejects(db.query(`delete from takween.${table}`));
});
