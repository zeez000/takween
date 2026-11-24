import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';import {createHmac} from 'node:crypto';
declare global {interface Window {commercialRace:{mode:'hold'|'fresh'|'deny'|'denyHtml'|'superseded';pending:number;release:()=>void;holdInbox:boolean;releaseInbox:()=>void}}}
function totp(secret:string){let bits='';for(const c of secret)bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',key).update(counter).digest();return ((h.readUInt32BE(h[h.length-1]&15)&0x7fffffff)%1000000).toString().padStart(6,'0');}
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const original=window.fetch.bind(window);let release=()=>{},releaseInbox=()=>{};
  window.commercialRace={mode:'hold',pending:0,release:()=>release(),holdInbox:false,releaseInbox:()=>releaseInbox()};
  function quote(name:string){return {id:name==='PRIVATE_OLD_QUOTE'?'10000000-0000-4000-8000-000000000001':'10000000-0000-4000-8000-000000000002',reference:name,revision:1,version:1,isSuperseded:false,latestRevision:1,state:'draft',enquiry_id:'10000000-0000-4000-8000-000000000003',enquiryReference:'TK-LOCAL',customer_snapshot:{name,email:'synthetic@example.invalid'},items:[],history:[],entity:'',terms:'',notes:'',subtotal_paise:0,tax_paise:0,total_paise:0,tax_bps:null,valid_until:null};}
  window.fetch=(input,init)=>{
   if(String(input)==='/api/operational/commercial'&&typeof init?.body==='string'&&window.commercialRace.mode==='superseded'){const q={...quote('PRIVATE_OLD_QUOTE'),state:'approved',isSuperseded:true,latestRevision:2};return Promise.resolve(Response.json(JSON.parse(init.body).operation==='pdf'?{quotation:q}:{rows:[q]}));}
   if(String(input)==='/api/operational/workspace'&&typeof init?.body==='string'&&JSON.parse(init.body).action==='inbox'&&window.commercialRace.holdInbox)return new Promise(resolve=>{releaseInbox=()=>resolve(Response.json({rows:[{id:'10000000-0000-4000-8000-000000000004',reference:'PRIVATE_INBOX_SENTINEL',customer:{name:'PRIVATE_INBOX_SENTINEL',email:'synthetic@example.invalid'},history:[],notes:[]}]}));});
   if(String(input)==='/api/operational/commercial'&&typeof init?.body==='string'&&JSON.parse(init.body).operation==='list'){
    if(window.commercialRace.mode==='denyHtml')return Promise.resolve(new Response('<html>Denied</html>',{status:403,headers:{'Content-Type':'text/html'}}));
    if(window.commercialRace.mode==='deny')return Promise.resolve(Response.json({error:'Synthetic authorization failure'},{status:403}));
    if(window.commercialRace.mode==='fresh')return Promise.resolve(Response.json({rows:[quote('PRIVATE_NEW_QUOTE')]}));
    window.commercialRace.pending++;return new Promise(resolve=>{release=()=>resolve(Response.json({rows:[quote('PRIVATE_OLD_QUOTE')]}));}); // Intentionally ignores AbortSignal.
   }return original(input,init);
  };
 });
 const f=JSON.parse(await readFile('artifacts/phase2/browser-fixture.json','utf8'));await page.goto('/owner');await page.getByLabel('Email',{exact:true}).fill(f.email);await page.getByLabel('Password',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Authenticator code').fill(totp(f.totpSecret));await page.getByRole('button',{name:'Verify MFA'}).click();await expect(page.getByText('Enquiry inbox',{exact:false})).toBeVisible();
});
async function hidden(page:import('@playwright/test').Page,value:boolean){await page.evaluate(v=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>v});document.dispatchEvent(new Event('visibilitychange'));},value);}
async function release(page:import('@playwright/test').Page){await page.evaluate(async()=>{window.commercialRace.release();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});}
test('late commercial response cannot restore records after tab hiding',async({page})=>{
 await page.getByRole('button',{name:'Load commercial records'}).click();await expect.poll(()=>page.evaluate(()=>window.commercialRace.pending)).toBe(1);await hidden(page,true);await hidden(page,false);await release(page);await expect(page.getByText('PRIVATE_OLD_QUOTE',{exact:false})).toHaveCount(0);
});
test('old commercial response cannot overwrite a newer view after returning',async({page})=>{
 const button=page.getByRole('button',{name:'Load commercial records'});await button.click();await expect.poll(()=>page.evaluate(()=>window.commercialRace.pending)).toBe(1);await hidden(page,true);await hidden(page,false);await page.evaluate(()=>{window.commercialRace.mode='fresh'});await expect(button).toBeEnabled();await button.click();await expect(page.locator('summary').filter({hasText:'PRIVATE_NEW_QUOTE'})).toBeVisible();await release(page);await expect(page.getByText('PRIVATE_OLD_QUOTE',{exact:false})).toHaveCount(0);await expect(page.locator('summary').filter({hasText:'PRIVATE_NEW_QUOTE'})).toBeVisible();
});
test('late commercial response cannot restore records during slow logout',async({page})=>{
 await page.route('**/auth/v1/logout*',()=>{});await page.getByRole('button',{name:'Load commercial records'}).click();await expect.poll(()=>page.evaluate(()=>window.commercialRace.pending)).toBe(1);await page.getByRole('button',{name:'Log out',exact:true}).click();await release(page);await expect(page.getByText('PRIVATE_OLD_QUOTE',{exact:false})).toHaveCount(0);await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
});
test('authorization failure clears the full workspace and rejects an older response',async({page})=>{
 const button=page.getByRole('button',{name:'Load commercial records'});await button.click();await expect.poll(()=>page.evaluate(()=>window.commercialRace.pending)).toBe(1);await hidden(page,true);await hidden(page,false);await page.evaluate(()=>{window.commercialRace.mode='deny'});await expect(button).toBeEnabled();await button.click();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await release(page);await expect(page.getByText('PRIVATE_OLD_QUOTE',{exact:false})).toHaveCount(0);
});
test('late enquiry inbox response cannot repopulate private options after hiding',async({page})=>{
 await page.evaluate(()=>{window.commercialRace.holdInbox=true});await page.getByRole('button',{name:'Search / refresh'}).click();await hidden(page,true);await hidden(page,false);await page.evaluate(async()=>{window.commercialRace.releaseInbox();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});await expect(page.getByText('PRIVATE_INBOX_SENTINEL',{exact:false})).toHaveCount(0);
});
test('superseded offer is labelled, has no advancement controls and exports a marked PDF',async({page})=>{
 await page.evaluate(()=>{window.commercialRace.mode='superseded'});await page.getByRole('button',{name:'Load commercial records'}).click();const q=page.locator('details').filter({hasText:'PRIVATE_OLD_QUOTE'});await q.locator('summary').click();await expect(q.getByText('SUPERSEDED - latest revision 2',{exact:true})).toBeVisible();await expect(q.getByRole('button',{name:'Record quotation state'})).toHaveCount(0);await expect(q.getByRole('button',{name:'Create new revision'})).toHaveCount(0);const download=page.waitForEvent('download');await q.getByRole('button',{name:'Download quotation PDF'}).click();await (await download).saveAs(`artifacts/phase3-hardening/superseded-ui-${test.info().project.name}.pdf`);
});
test('non-JSON authorization denial clears previously visible private records',async({page})=>{
 await page.evaluate(()=>{window.commercialRace.mode='fresh'});await page.getByRole('button',{name:'Load commercial records'}).click();await expect(page.locator('summary').filter({hasText:'PRIVATE_NEW_QUOTE'})).toBeVisible();await page.evaluate(()=>{window.commercialRace.mode='denyHtml'});await page.getByRole('button',{name:'Load commercial records'}).click();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await expect(page.getByText('PRIVATE_NEW_QUOTE',{exact:false})).toHaveCount(0);
});
test('non-JSON inbox denial clears the commercial workspace too',async({page})=>{
 await page.evaluate(()=>{window.commercialRace.mode='fresh'});await page.getByRole('button',{name:'Load commercial records'}).click();await expect(page.locator('summary').filter({hasText:'PRIVATE_NEW_QUOTE'})).toBeVisible();await page.route('**/api/operational/workspace',route=>route.fulfill({status:403,contentType:'text/html',body:'<html>Denied</html>'}));await page.getByRole('button',{name:'Search / refresh'}).click();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await expect(page.getByText('PRIVATE_NEW_QUOTE',{exact:false})).toHaveCount(0);
});
