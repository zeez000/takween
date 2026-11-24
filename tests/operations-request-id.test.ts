import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectRequestId,REQUEST_ID_KEY} from '../src/lib/operations/request-id.ts';
test('persistent retries survive reload while storage contains only an opaque nonce',()=>{
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}};
  const first=selectRequestId(null,'Private name and project',true,storage);
  assert.equal(values.get(REQUEST_ID_KEY),first.id);assert.equal([...values.values()].some(v=>v.includes('Private')),false);
  assert.equal(selectRequestId(null,'Private name and project',true,storage).id,first.id);
  assert.notEqual(selectRequestId(first,'Changed request',true,storage).id,first.id);
});
test('disabled or blocked storage preserves safe in-memory retries',()=>{
  const storage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')},removeItem:()=>{throw Error('blocked')}};
  const first=selectRequestId(null,'test',true,storage);assert.equal(selectRequestId(first,'test',true,storage).id,first.id);
  assert.match(selectRequestId(null,'test',false).id,/^[0-9a-f-]{36}$/);
});
