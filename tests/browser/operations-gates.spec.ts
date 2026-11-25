import {test,expect} from '@playwright/test';

test('operational preparation routes remain closed and disclose no customer data',async({request})=>{
  const owner=await request.get('/api/operational/owner');
  expect(owner.status()).toBe(503);
  expect(owner.headers()['cache-control']).toContain('no-store');
  expect(await owner.json()).toEqual({error:'Owner operations are unavailable.'});
  const intake=await request.post('/api/operational/enquiries',{data:{name:'Synthetic test'}});
  expect(intake.status()).toBe(503);
  expect(intake.headers()['cache-control']).toContain('no-store');
  expect(Object.keys(await intake.json())).toEqual(['error']);
  const business=await request.post('/api/operational/business',{data:{operation:'list',kind:'customers',search:'',offset:0}});
  expect(business.status()).toBe(503);
  expect(business.headers()['cache-control']).toContain('private, no-store');
  expect(business.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(await business.json()).toEqual({error:'Business operations are not activated.'});
});
