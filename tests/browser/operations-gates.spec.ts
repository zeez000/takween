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
});
