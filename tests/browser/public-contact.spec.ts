import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('takween-entry-seen','1'));});
test('disabled preview is manual email only, accessible and has no submission or upload controls',async({page},info)=>{
 const writes:string[]=[];page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
 const config=page.waitForResponse('**/api/operational/intake-config');await page.goto('/#quote');expect((await config).ok()).toBe(true);
 const contact=page.locator('#quote');const link=contact.getByRole('link',{name:'Email TAKWEEN LABS'});
 await expect(link).toHaveAttribute('href','mailto:takweenlabs.in@gmail.com');await expect(contact.locator('form,input,textarea')).toHaveCount(0);
 await expect(contact.getByRole('button',{name:/Send enquiry|Prepare enquiry|upload/i})).toHaveCount(0);
 await expect(contact).toContainText('This website does not submit enquiries or upload files');
 await link.focus();await expect(link).toBeFocused();
 await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});
 const violations=await page.evaluate(async()=> (await window.axe.run('#quote',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));expect(violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(writes).toEqual([]);
 await link.evaluate(e=>(e as HTMLElement).blur());await contact.screenshot({path:info.outputPath('manual-contact.png')});
});
test('failed or malformed configuration never enables the operational form',async({page})=>{
 for(const json of [{enabled:false,emailEnabled:false},{enabled:'true',emailEnabled:'true'}]){
  await page.route('**/api/operational/intake-config',r=>r.fulfill({json}));await page.goto('/#quote');
  await expect(page.getByRole('link',{name:'Email TAKWEEN LABS'})).toBeVisible();await expect(page.locator('#quote form')).toHaveCount(0);await page.unroute('**/api/operational/intake-config');
 }
 await page.route('**/api/operational/intake-config',r=>r.abort());await page.goto('/#quote');await expect(page.getByRole('link',{name:'Email TAKWEEN LABS'})).toBeVisible();await expect(page.locator('#quote input')).toHaveCount(0);
});
test('manual email is available without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});try{const page=await context.newPage();await page.goto(baseURL+'/#quote');await expect(page.locator('#quote a[href="mailto:takweenlabs.in@gmail.com"]')).toBeVisible();await expect(page.locator('#quote form,input[type=file]')).toHaveCount(0);}finally{await context.close();}
});
test('social image metadata resolves to a public 1200 by 630 PNG with descriptive alternatives',async({page,request})=>{
 await page.goto('/');const og=page.locator('meta[property="og:image"]');await expect(og).toHaveAttribute('content',/^https:\/\/[^/]+\/takween-social\.png$/);
 await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content','1200');await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content','630');
 await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content',/TAKWEEN LABS red layered T/);await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
 await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content',(await og.getAttribute('content'))!);await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content',/TAKWEEN LABS red layered T/);
 const asset=await request.get('/takween-social.png');expect(asset.status()).toBe(200);expect(asset.headers()['content-type']).toContain('image/png');const bytes=await asset.body();expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(bytes.readUInt32BE(16)).toBe(1200);expect(bytes.readUInt32BE(20)).toBe(630);expect(bytes.length).toBeLessThan(300000);
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
});
