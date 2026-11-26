import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';import {createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
import {localInvitation} from './local-invitation';
declare global{interface Window{axe:typeof import('axe-core')}}
async function audit(page:import('@playwright/test').Page){
  await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
  expect(violations).toEqual([]);
}
function totp(secret:string){let bits='';for(const c of secret){bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');}const key=Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',key).update(counter).digest();return ((h.readUInt32BE(h[h.length-1]&15)&0x7fffffff)%1000000).toString().padStart(6,'0');}
test('actual local owner sign-in MFA inbox note and logout',async({page})=>{
  const fixture=JSON.parse(await readFile('artifacts/phase2/browser-fixture.json','utf8'));
  await page.goto('/owner');await audit(page);await page.getByLabel('Email',{exact:true}).fill(fixture.email);await page.getByLabel('Password',{exact:true}).fill(fixture.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Authenticator code')).toBeVisible();
  await page.getByLabel('Authenticator code').fill(totp(fixture.totpSecret));await page.getByRole('button',{name:'Verify MFA'}).click();
  await expect(page.getByText('Enquiry inbox',{exact:false})).toBeVisible();
  await page.getByLabel('Search enquiries').fill('Synthetic Local Customer');const search=page.getByRole('button',{name:'Search / refresh'});await search.click();await expect(search).toBeEnabled();
  const enquiry=page.locator('details').first();await expect(enquiry).toBeVisible();await enquiry.locator('summary').click();
  await expect(enquiry.getByText('synthetic@example.invalid')).toBeVisible();
  const note=`Local browser test note ${test.info().project.name} ${Date.now()}`;
  await enquiry.getByLabel('New internal note').fill(note);await enquiry.getByRole('button',{name:'Save note'}).click();
  await expect(enquiry.getByText(note,{exact:true})).toBeVisible();
  await audit(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();});
  await page.screenshot({path:`artifacts/phase2/owner-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await expect(page.getByText('Signed out.',{exact:true})).toBeVisible();
  const denied=await page.request.post('/api/operational/workspace',{headers:{origin:new URL(page.url()).origin},data:{action:'inbox',search:'',category:'',offset:0}});expect(denied.status()).toBe(403);
});
test('real local persistent enquiry stores and never sends email',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('takween-entry-seen','1'));await page.goto('/#quote');
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic local browser customer');
  const consent=page.getByLabel('LOCAL SYNTHETIC TEST ONLY',{exact:false});await expect(consent).toBeVisible();
  await page.getByLabel('Your email').fill('browser@example.invalid');await page.getByLabel('Tell us about your idea').fill('Disposable localhost-only enquiry');await consent.check();
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();await expect(page.getByText('Your enquiry is stored.',{exact:false})).toBeVisible();
  await expect(page.getByText('Email delivery is not confirmed.',{exact:false})).toBeVisible();
  if(test.info().project.name==='desktop'){
    const reference=(await page.getByText('Your enquiry is stored.',{exact:false}).textContent())!.match(/TK-[0-9a-f]{32}/)![0];
    await page.reload();await page.getByLabel('Your name',{exact:true}).fill('Synthetic local browser customer');
    await page.getByLabel('Your email').fill('browser@example.invalid');await page.getByLabel('Tell us about your idea').fill('Disposable localhost-only enquiry');
    await page.getByLabel('LOCAL SYNTHETIC TEST ONLY',{exact:false}).check();await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
    await expect(page.getByText('Your enquiry is stored.',{exact:false})).toContainText(reference);
  }
  await page.getByLabel('Request category').selectOption('fateen_machining');
  await page.getByLabel('I consent to an owner-reviewed referral',{exact:false}).check();
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  await expect(page.getByText('Your enquiry is stored.',{exact:false})).toBeVisible();
  await audit(page);
  await page.screenshot({path:`artifacts/phase2/persistent-${test.info().project.name}.png`,fullPage:false});
});
test('local invitation enables password and TOTP setup without a public signup',async({page})=>{
  const invite=await localInvitation();
  await page.goto('/owner');await page.evaluate(hash=>{const link=document.createElement('a');link.href=`/owner/callback?type=invite&token_hash=${encodeURIComponent(hash)}`;document.body.append(link);link.click();},invite.hash);
  await expect(page.getByLabel('New owner password')).toBeVisible();
  await audit(page);
  await page.getByLabel('New owner password').fill(invite.password);await page.getByRole('button',{name:'Set password',exact:true}).click();
  await expect(page.getByText('Password set.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Set up authenticator'}).click();
  await expect(page.locator('code')).toBeVisible();const secret=await page.locator('code').textContent();expect(secret).toBeTruthy();
  await page.getByLabel('Authenticator code').fill(totp(secret!));await page.getByRole('button',{name:'Verify MFA'}).click();
  await expect(page.getByText('Enquiry inbox',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Log out',exact:true}).click();
});
test('active local endpoints reject anonymous access, malformed bodies and cross-origin mutations',async({request,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  expect((await request.post('/api/operational/workspace',{headers:{origin:'https://other.example.invalid'},data:{action:'inbox'}})).status()).toBe(403);
  expect((await request.post('/api/operational/workspace',{headers:{origin,'content-type':'application/json'},data:'{'})).status()).toBe(400);
  expect((await request.post('/api/operational/workspace',{headers:{origin,'content-type':'application/json'},data:'x'.repeat(8193)})).status()).toBe(413);
  const denied=await request.post('/api/operational/workspace',{headers:{origin},data:{action:'inbox',search:'',category:'',offset:0}});
  expect(denied.status()).toBe(403);expect(denied.headers()['cache-control']).toContain('no-store');expect(Object.keys(await denied.json())).toEqual(['error']);
  expect((await request.post('/api/operational/dispatch',{headers:{origin}})).status()).toBe(503);
  expect((await request.post('/api/enquiry',{headers:{origin},data:{}})).status()).toBe(503);
});
test('owner credentials cannot become native GET query parameters without JavaScript',async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  try{await page.goto(baseURL+'/owner');const form=page.locator('form').first();await expect(form).toHaveAttribute('method','post');
    await expect(page.getByLabel('Password',{exact:true})).not.toHaveAttribute('name');await expect(page.getByLabel('Email',{exact:true})).not.toHaveAttribute('name');
    await page.getByLabel('Email',{exact:true}).fill('nojs@example.invalid');await page.getByLabel('Password',{exact:true}).fill('Synthetic-no-JS-only');
    const submitted=page.waitForRequest(r=>r.isNavigationRequest()&&r.method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    const request=await submitted;expect(request.url()).not.toContain('password');expect(request.postData()??'').not.toContain('Synthetic-no-JS-only');
  }finally{await context.close();}
});
