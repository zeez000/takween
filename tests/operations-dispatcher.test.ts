import {test} from 'node:test';import assert from 'node:assert/strict';
import {dispatchNotification,type NotificationOutcome,type NotificationRepository} from '../src/lib/operations/dispatcher.ts';
const job={id:'local-job-id',leaseToken:'local-lease',reference:'TK-local',name:'Synthetic',email:'test@example.invalid',description:'Test only',quantity:1,material:'PLA',category:'printing'};
const env={ENQUIRY_NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'synthetic-not-a-key',RESEND_FROM_EMAIL:'test@example.invalid'};
test('disabled notifications neither claim a job nor reach a provider',async()=>{
  const repository={claim:async()=>{throw Error('must not claim')},finish:async()=>false};
  assert.deepEqual(await dispatchNotification({...env,ENQUIRY_NOTIFICATIONS_ENABLED:'false'},repository,async()=>{throw Error('must not send')}),{status:'disabled'});
});
test('provider acceptance, rate limits, rejection and ambiguity are distinct durable outcomes',async()=>{
  for(const [status,body,expected] of [[200,{id:'resend-synthetic'},'accepted'],[429,{},'retry'],[400,{},'failed'],[503,{},'uncertain'],[200,{id:' '},'uncertain']] as const){
    let recorded:NotificationOutcome|undefined;
    const repository:NotificationRepository={claim:async()=>job,finish:async(_j,outcome,id)=>{recorded=outcome;if(outcome==='accepted')assert.equal(id,'resend-synthetic');return true}};
    const result=await dispatchNotification(env,repository,async(_url,init)=>{
      assert.equal(new Headers(init?.headers).get('Idempotency-Key'),'notification/local-job-id');assert.deepEqual(JSON.parse(String(init?.body)).to,['takweenlabs.in@gmail.com']);return Response.json(body,{status});
    });assert.equal(result.status,expected);assert.equal(recorded,expected);
  }
});
test('network ambiguity is held for review and failed fencing never reports acceptance',async()=>{
  let outcome:NotificationOutcome|undefined;
  const repository:NotificationRepository={claim:async()=>job,finish:async(_j,o)=>{outcome=o;return true}};
  assert.equal((await dispatchNotification(env,repository,async()=>{throw Error('network')})).status,'uncertain');assert.equal(outcome,'uncertain');
  repository.finish=async()=>false;
  assert.equal((await dispatchNotification(env,repository,async()=>Response.json({id:'accepted-id'}))).status,'unconfirmed');
});
