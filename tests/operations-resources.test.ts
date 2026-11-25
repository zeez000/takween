import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import {calculateCost,parseGrams,type CostInputs} from '../src/lib/operations/cost-estimate.ts';
const db=new PGlite(),owner=randomUUID(),other=randomUUID();const input:CostInputs={materialMg:100000,pricePerKgPaise:100000,wasteBps:1000,watts:200,minutes:120,electricityPaisePerKwh:1000,laborMinutes:30,laborPaisePerHour:20000,overheadPaise:500,marginBps:2000};
async function identity(id:string=owner,aal='aal2',role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,aal})]);await db.exec(`set role ${role}`);}
async function command(p:object,id=randomUUID()){return (await db.query<{v:{id:string;version:number;stockMg:number;calculation:ReturnType<typeof calculateCost>}}>('select public.takween_business_command($1,$2) v',[id,JSON.stringify(p)])).rows[0].v;}
before(async()=>{await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);grant usage on schema auth,public to authenticated;grant usage on schema public to anon,service_role;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;alter default privileges grant all on tables to anon,authenticated,service_role;alter default privileges grant execute on functions to public,anon,authenticated,service_role;`);await db.query('insert into auth.users values($1),($2)',[owner,other]);for(const f of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${f}`,'utf8'));await db.query('insert into takween.admin_roles(user_id) values($1)',[owner]);await identity();});after(()=>db.close());
test('inventory receipts, stock consumption, stale versions and insufficient stock roll back',async()=>{
 const p={action:'material.create',name:'Synthetic spool',material:'PLA',colour:'Crimson',pricePerKgPaise:null,note:'Synthetic private resource'},nonce=randomUUID(),m=await command(p,nonce);assert.deepEqual(await command(p,nonce),m);await assert.rejects(command({...p,name:'Changed'},nonce));
 let r=await command({action:'material.receive',id:m.id,version:1,quantityMg:1000000,note:'Synthetic receipt'});assert.equal(r.stockMg,1000000);
 await assert.rejects(command({action:'material.consume',id:m.id,version:1,quantityMg:1,note:'Stale'}));
 await assert.rejects(command({action:'material.consume',id:m.id,version:r.version,quantityMg:1000001,note:'Overdraw'}));
 const take={action:'material.consume',id:m.id,version:r.version,quantityMg:100000,note:'Synthetic use'},request=randomUUID();r=await command(take,request);assert.deepEqual(await command(take,request),r);assert.equal(r.stockMg,900000);
 const rows=(await db.query<{v:{delta_mg:number}[]}>('select public.takween_business_list($1) v',['movements'])).rows[0].v;assert.equal(rows.length,2);
 await assert.rejects(db.exec('update takween.material_movements set delta_mg=1'));await assert.rejects(command({...take,version:r.version,quantityMg:-1}));
});
test('machine status/maintenance are versioned, append-only and idempotent',async()=>{
 const m=await command({action:'machine.create',name:'Synthetic local machine',category:'printing',status:'maintenance',nextService:null,note:'Not a real machine claim'});
 const p={action:'machine.maintenance',id:m.id,version:1,status:'active',nextService:'2099-01-01',note:'Synthetic observation only'},id=randomUUID();const r=await command(p,id);assert.deepEqual(await command(p,id),r);await assert.rejects(command(p));
 assert.equal((await db.query<{v:unknown[]}>('select public.takween_business_list($1) v',['maintenance'])).rows[0].v.length,1);
 await assert.rejects(command({...p,version:2,status:'invented'}));await assert.rejects(db.exec('delete from takween.machine_maintenance'));
});
test('cost arithmetic uses exact units, waste, labor, electricity and margin with SQL parity',async()=>{
 assert.equal(parseGrams('1.001'),1001);for(const value of ['-1','1e3','1.0001','NaN'])assert.throws(()=>parseGrams(value));
 const expected={materialPaise:11000,electricityPaise:400,laborPaise:10000,basePaise:21900,suggestedPaise:27375,profitPaise:5475};assert.deepEqual(calculateCost(input),expected);
 const a=await command({action:'estimate.create',inputs:input,note:'Synthetic internal estimate'});assert.deepEqual(a.calculation,expected);
 for(const field of Object.keys(input) as (keyof CostInputs)[]){const p={...input,[field]:-1};assert.throws(()=>calculateCost(p));await assert.rejects(command({action:'estimate.create',inputs:p,note:'Invalid'}));}
 for(const margin of [0,9900]){const p={...input,marginBps:margin};assert.deepEqual((await command({action:'estimate.create',inputs:p,note:'Synthetic boundary'})).calculation,calculateCost(p));}
 await assert.rejects(command({action:'estimate.create',inputs:{...input,watts:1.5},note:'Fraction invalid'}));assert.throws(()=>calculateCost({...input,marginBps:10000}));
});
test('resources deny ordinary, AAL1, anonymous, service-role and raw receipt access',async()=>{
 for(const [id,aal,role] of [[other,'aal2','authenticated'],[owner,'aal1','authenticated'],[owner,'aal2','anon'],[owner,'aal2','service_role']]){await identity(id,aal,role);await assert.rejects(command({action:'material.create',name:'Forbidden',material:'PLA',colour:'',note:'Denied'}));if(role==='authenticated'){assert.equal((await db.query('select * from takween.materials')).rows.length,0);await assert.rejects(db.exec("select public.takween_business_list('materials')"));}else await assert.rejects(db.exec('select * from takween.materials'));}
 await identity();await assert.rejects(db.exec('select * from takween.business_receipts'));await assert.rejects(db.exec("select public.takween_business_list('business_receipts')"));
});
