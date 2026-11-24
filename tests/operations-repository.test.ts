import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storeEnquiry} from '../src/lib/operations/repository.ts';
import {SubmissionConflict,type EnquiryPayload} from '../src/lib/operations/intake.ts';
const payload: EnquiryPayload = {name:'Test',email:'test@example.invalid',description:'Synthetic test',quantity:1,material:'PLA',
  category:'printing',contactConsent:true,referralConsent:false,privacyVersion:'test'};
const id = 'a1234567-1234-4234-8234-123456789abc';
const env = {SUPABASE_URL:'https://db.example.invalid',SUPABASE_SECRET_KEY:'sb_secret_synthetic_not_a_real_key'};
test('server repository uses only restricted intake RPC and disables browser session persistence',async () => {
  const original = globalThis.fetch;let calls=0;
  globalThis.fetch=async(input,init)=>{
    calls++;
    assert.equal(String(input),'https://db.example.invalid/rest/v1/rpc/takween_submit_enquiry');
    assert.deepEqual(JSON.parse(String(init?.body)),{p_request_id:id,p_payload:payload});
    assert.ok(init?.signal);
    return Response.json([{reference:'TK-'+'a'.repeat(32),notification_status:'pending'}]);
  };
  try {assert.equal((await storeEnquiry(env,id,payload)).notification_status,'pending');assert.equal(calls,1);}
  finally {globalThis.fetch=original;}
});
test('invalid config cannot reach a network or expose credentials',async () => {
  const original = globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected network')};
  try {
    for(const config of [{},{...env,SUPABASE_SECRET_KEY:'sb_publishable_test'},{...env,SUPABASE_URL:'http://db.example.invalid'},
      {...env,SUPABASE_URL:'https://user:password@db.example.invalid'},{...env,SUPABASE_URL:env.SUPABASE_URL+'/path'}]){
      await assert.rejects(storeEnquiry(config,id,payload));
    }
    assert.equal(calls,0);
  } finally {globalThis.fetch=original;}
});
test('database conflicts and malformed provider data are fail-closed without leaking diagnostics',async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>Response.json({code:'23505',message:'private database detail'},{status:409});
    await assert.rejects(storeEnquiry(env,id,payload),SubmissionConflict);
    for(const value of [null,{},[],[{},{}]]){
      globalThis.fetch=async()=>Response.json(value);
      await assert.rejects(storeEnquiry(env,id,payload),/storage was not confirmed/);
    }
    globalThis.fetch=async()=>Response.json({code:'42501',message:'private database detail'},{status:403});
    await assert.rejects(storeEnquiry(env,id,payload),/storage was not confirmed/);
  } finally {globalThis.fetch=original;}
});
