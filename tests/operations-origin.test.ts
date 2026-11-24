import {test} from 'node:test';import assert from 'node:assert/strict';
import {operationsOrigin} from '../src/lib/operations/runtime.ts';
test('request origin may be loopback without changing the HTTPS canonical URL',()=>{
  const config={SITE_URL:'https://preview.example.invalid',REQUEST_ORIGIN:'http://127.0.0.1:8797'};
  assert.equal(operationsOrigin(config),'http://127.0.0.1:8797');assert.equal(config.SITE_URL,'https://preview.example.invalid');
});
test('empty override falls back to public site origin',()=>{
  assert.equal(operationsOrigin({SITE_URL:'https://preview.example.invalid',REQUEST_ORIGIN:''}),'https://preview.example.invalid');
});
test('untrusted origin shapes and public cleartext origins fail closed',()=>{
  for(const REQUEST_ORIGIN of ['http://public.example.invalid','https://user:pass@public.example.invalid','https://public.example.invalid/path','https://public.example.invalid?x=1','https://public.example.invalid/#hash','javascript:alert(1)'])assert.throws(()=>operationsOrigin({REQUEST_ORIGIN}));
});
