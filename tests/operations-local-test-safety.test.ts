import {test} from 'node:test';import assert from 'node:assert/strict';import {validateLocalInvitationTarget,localInvitation} from './operational-browser/local-invitation.ts';
test('fresh synthetic invitation helper refuses hosted API/database targets and wrong protocols',()=>{
 const local={runtime:'native',env:{API_URL:'http://127.0.0.1:54321',DB_URL:'postgresql://localhost:54322/postgres'}};assert.doesNotThrow(()=>validateLocalInvitationTarget(local));
 for(const patch of [{API_URL:'https://example.supabase.co'},{DB_URL:'postgresql://example.invalid/postgres'},{API_URL:'file://localhost/test'},{DB_URL:'https://localhost/test'}])assert.throws(()=>validateLocalInvitationTarget({...local,env:{...local.env,...patch}}));assert.throws(()=>validateLocalInvitationTarget({...local,runtime:'hosted'}));
});
test('synthetic invitation creation requires explicit local integration opt-in',async()=>{const before=process.env.TAKWEEN_LOCAL_INTEGRATION;try{delete process.env.TAKWEEN_LOCAL_INTEGRATION;await assert.rejects(localInvitation(),/opt-in/);}finally{if(before===undefined)delete process.env.TAKWEEN_LOCAL_INTEGRATION;else process.env.TAKWEEN_LOCAL_INTEGRATION=before;}});
