import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('takween-entry-seen','1'));});
test('email acceptance requires the explicit provider-backed contract and safe retry',async({page})=>{
 await page.goto('/');await page.getByLabel('Your name',{exact:true}).fill('Synthetic test');await page.getByLabel('Your email').fill('synthetic@example.invalid');await page.getByLabel('Tell us about your idea').fill('Synthetic browser enquiry only.');
 const ids:string[]=[];
 await page.route('**/api/enquiry',async route=>{ids.push(route.request().postDataJSON().requestId);await route.fulfill({status:200,json:{ok:true}})});
 await page.getByRole('button',{name:'Send enquiry',exact:false}).click();await expect(page.getByText('We could not confirm your enquiry was accepted.',{exact:false})).toBeVisible();
 await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toHaveCount(0);
 await page.unroute('**/api/enquiry');await page.route('**/api/enquiry',async route=>{ids.push(route.request().postDataJSON().requestId);await route.fulfill({status:202,json:{status:'accepted',id:'mock-provider-id'}})});
 await page.getByRole('button',{name:'Send enquiry',exact:false}).click();await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toBeVisible();expect(ids[0]).toBe(ids[1]);
 expect(await page.locator('input[type=file]').count()).toBe(1); // existing local-only selector is retained
});
test('unavailable server retains inputs and offers manual email, never success',async({page})=>{
 await page.goto('/');await page.getByLabel('Your name',{exact:true}).fill('Synthetic test');await page.getByLabel('Your email').fill('synthetic@example.invalid');await page.getByLabel('Tell us about your idea').fill('Synthetic browser enquiry only.');
 await page.route('**/api/enquiry',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
 await expect(page.getByLabel('Your name',{exact:true})).toHaveValue('Synthetic test');await expect(page.getByRole('link',{name:'Open email app'})).toHaveAttribute('href','mailto:takweenlabs.in@gmail.com');await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toHaveCount(0);
});

test('quantity validation blocks invalid input and submits all supported boundaries',async({page})=>{
 await page.goto('/#quote');
 await page.getByLabel('Your name',{exact:true}).fill('Synthetic customer');
 await page.getByLabel('Your email').fill('synthetic@example.invalid');
 await page.getByLabel('Tell us about your idea').fill('A synthetic prototype enquiry, not a real order.');
 const quantities:string[]=[];
 await page.route('**/api/enquiry',async route=>{
  quantities.push(route.request().postDataJSON().quantity);
  await route.fulfill({status:202,json:{status:'accepted',id:'mock-provider-id'}});
 });
 const quantity=page.getByLabel('Quantity',{exact:true});
 for(const value of ['', '0', '-1', '1.5', '10001']){
  await quantity.fill(value);
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  expect(await quantity.evaluate(input=>(input as HTMLInputElement).validity.valid)).toBe(false);
  expect(quantities).toEqual([]);
 }
 for(const value of ['1','10','10000']){
  await quantity.fill(value);
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toBeVisible();
 }
 expect(quantities).toEqual(['1','10','10000']);
});

test('slow submission prevents duplicates and network failure allows an idempotent retry',async({page})=>{
 await page.goto('/#quote');
 await page.getByLabel('Your name',{exact:true}).fill('Synthetic customer');
 await page.getByLabel('Your email').fill('synthetic@example.invalid');
 await page.getByLabel('Tell us about your idea').fill('Synthetic slow connection test only.');
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 const ids:string[]=[];
 await page.route('**/api/enquiry',async route=>{
  ids.push(route.request().postDataJSON().requestId);
  await held;
  await route.abort('failed');
 });
 await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
 await expect(page.getByRole('button',{name:'Sending…',exact:true})).toBeDisabled();
 await expect.poll(()=>ids.length).toBe(1);
 // A second submit event must also be guarded, independently of disabled UI.
 await page.locator('form.quote-form').dispatchEvent('submit');
 expect(ids).toHaveLength(1);
 release();
 await expect(page.getByText('We could not confirm your enquiry was accepted.',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Your name',{exact:true})).toHaveValue('Synthetic customer');
 await page.unroute('**/api/enquiry');
 await page.route('**/api/enquiry',async route=>{
  ids.push(route.request().postDataJSON().requestId);
  await route.fulfill({status:202,json:{status:'accepted',id:'mock-provider-id'}});
 });
 await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
 await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toBeVisible();
 expect(ids).toHaveLength(2);
 expect(ids[1]).toBe(ids[0]);
});
