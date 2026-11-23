import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handlePersistentEnquiry,validateIntake,SubmissionConflict,type IntakeEnvironment} from '../src/lib/operations/intake.ts';
import {verifyOwner} from '../src/lib/operations/owner-access.ts';
const valid = {requestId:'a1234567-1234-4234-8234-123456789abc',website:'',name:'Synthetic Customer',email:'customer@example.invalid',
  description:'Synthetic project description',quantity:1,material:'PLA',category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'test-v1'};
const stored = {reference:'TK-'+'a'.repeat(32),notification_status:'pending'};
const env = (): IntakeEnvironment => ({PERSISTENT_ENQUIRIES_ENABLED:'true',ENQUIRY_PRIVACY_VERSION:'test-v1',SITE_URL:'https://site.invalid',
  ENQUIRY_IP_LIMITER:{limit:async()=>({success:true})},ENQUIRY_SITE_LIMITER:{limit:async()=>({success:true})}});
const request = (body: unknown = valid) => new Request('https://site.invalid/api/operational/enquiries',{method:'POST',
  headers:{origin:'https://site.invalid','content-type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify(body)});
test('persistent intake confirms storage only and never calls an email transport', async () => {
  let calls = 0;
  const response = await handlePersistentEnquiry(request(),env(),async(id,payload)=>{
    calls++; assert.equal(id,valid.requestId);assert.equal(payload.quantity,1);assert.equal('website' in payload,false);return stored;
  });
  assert.equal(calls,1);assert.equal(response.status,201);
  const result = await response.json();assert.equal(result.status,'stored');assert.equal(result.notificationStatus,'pending');
  assert.equal(result.id,undefined);assert.match(result.message,/No email/);
});
test('retry receipts distinguish provider acceptance from inbox delivery',async()=>{
  for(const notification_status of ['accepted','failed','uncertain','leased']){
    const r=await handlePersistentEnquiry(request(),env(),async()=>({...stored,notification_status}));
    assert.equal(r.status,201);const result=await r.json();assert.equal(result.status,'stored');assert.equal(result.notificationStatus,notification_status);assert.match(result.message,/No email delivery/);
  }
});
test('disabled or incompletely configured intake never touches storage', async () => {
  for (const config of [{...env(),PERSISTENT_ENQUIRIES_ENABLED:'false'},{...env(),ENQUIRY_PRIVACY_VERSION:undefined},{...env(),ENQUIRY_IP_LIMITER:undefined}]) {
    assert.equal((await handlePersistentEnquiry(request(),config,async()=>{throw Error('must not run')})).status,503);
  }
});
test('privacy, file, spam, quantity and category validation fails closed', () => {
  for (const mutation of [{contactConsent:false},{contactConsent:'true'},{quantity:0},{quantity:10001},{quantity:1.5},{quantity:'1'},
    {fileData:'x'},{website:'spam'},{privacyVersion:'old'},{email:'x\r\n@example.invalid'},{category:'fateen_machining'},
    {referralConsent:true},{phone:'1'},{preferredDeadline:'2026-02-30'},{description:'short'},{name:'a'.repeat(101)}]) {
    assert.equal(validateIntake({...valid,...mutation},'test-v1'),null);
  }
  for (const quantity of [1,10,10000]) assert.ok(validateIntake({...valid,quantity},'test-v1'));
  assert.ok(validateIntake({...valid,category:'fateen_machining',process:'turning',referralConsent:true},'test-v1'));
});
test('database failure, malformed acknowledgement and conflicting ID never return stored success', async () => {
  for (const [store,status] of [
    [async()=>{throw Error('private connection detail')},503],
    [async()=>{throw new SubmissionConflict()},409],
    [async()=>({...stored,reference:'untrusted'}),503],
  ] as const) {
    const response = await handlePersistentEnquiry(request(),env(),store);
    assert.equal(response.status,status);assert.equal((await response.text()).includes('private connection detail'),false);
  }
});
test('wrong origin, untrusted IP, unavailable limiter and exhausted limits never reach storage', async () => {
  let calls = 0;const store = async()=>{calls++;return stored};
  const wrong = request();wrong.headers.set('origin','https://other.invalid');assert.equal((await handlePersistentEnquiry(wrong,env(),store)).status,403);
  const noIp = request();noIp.headers.delete('cf-connecting-ip');assert.equal((await handlePersistentEnquiry(noIp,env(),store)).status,503);
  for (const key of ['ENQUIRY_IP_LIMITER','ENQUIRY_SITE_LIMITER'] as const) {
    const e = env();e[key]={limit:async()=>({success:false})};const limited=await handlePersistentEnquiry(request(),e,store);
    assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
    e[key]={limit:async()=>{throw Error('limit unavailable')}};assert.equal((await handlePersistentEnquiry(request(),e,store)).status,503);
  }
  assert.equal(calls,0);
});
test('streamed request-size cap holds even with false content length', async () => {
  const r = request({...valid,description:'x'.repeat(17000)});r.headers.set('content-length','1');
  assert.equal((await handlePersistentEnquiry(r,env(),async()=>stored)).status,413);
  const text=request();text.headers.set('content-type','text/plain');assert.equal((await handlePersistentEnquiry(text,env(),async()=>stored)).status,415);
});
test('owner verification requires an authentic identity and exact database authorization', async () => {
  let rpcCalls = 0;
  const client = (user: {id:string} | null, authError:unknown, data:unknown, rpcError:unknown) => ({
    auth:{getUser:async()=>({data:{user},error:authError})},rpc:async()=>{rpcCalls++;return {data,error:rpcError}},
  });
  assert.equal(await verifyOwner(client(null,null,true,null)),false);assert.equal(rpcCalls,0);
  assert.equal(await verifyOwner(client({id:'owner'},Error('expired'),true,null)),false);assert.equal(rpcCalls,0);
  for (const data of [false,'true',null,{}]) assert.equal(await verifyOwner(client({id:'owner'},null,data,null)),false);
  assert.equal(await verifyOwner(client({id:'owner'},null,true,Error('offline'))),false);
  assert.equal(await verifyOwner(client({id:'owner'},null,true,null)),true);
});
