import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPrivateRequestScope,privateRequestSignal,StalePrivateRequest} from '../src/lib/operations/private-requests.ts';
test('hidden/unmounted scopes reject late responses even when abort is ignored',async()=>{
 const scope=createPrivateRequestScope(),ticket=scope.capture();let deliver!:(value:string)=>void;const pending=new Promise<string>(r=>{deliver=r});scope.pause();scope.resume();deliver('private');await pending;
 assert.equal(ticket.isCurrent(),false);assert.ok(ticket.signal.aborted);assert.throws(()=>ticket.assertCurrent(),StalePrivateRequest);assert.ok(scope.capture().isCurrent());
});
test('invalidation rejects old view and session tickets without invalidating a newer view',()=>{
 const view=createPrivateRequestScope(),session=createPrivateRequestScope(),old=view.capture();view.invalidate();const latest=view.capture();assert.equal(old.isCurrent(),false);assert.ok(latest.isCurrent());const auth=session.capture();session.invalidate();assert.equal(auth.isCurrent(),false);assert.ok(latest.isCurrent());
});
test('transport aborts on session invalidation or deadline and disposes listeners',async()=>{
 const view=createPrivateRequestScope(),session=createPrivateRequestScope();const transport=privateRequestSignal([view.capture(),session.capture()],1000);session.pause();assert.ok(transport.signal.aborted);transport.dispose();
 const timed=privateRequestSignal([view.capture()],5);await new Promise(r=>setTimeout(r,15));assert.ok(timed.signal.aborted);timed.dispose();
 const disposed=privateRequestSignal([view.capture()],5);disposed.dispose();await new Promise(r=>setTimeout(r,15));assert.equal(disposed.signal.aborted,false);
});
