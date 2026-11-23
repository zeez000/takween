import {test,expect} from '@playwright/test';
test('persistent form confirms only storage and retains its retry identifier after uncertainty',async({page})=>{
  await page.route('**/api/operational/intake-config',r=>r.fulfill({json:{enabled:true,privacyVersion:'synthetic-test',privacyNotice:'Synthetic test privacy consent'}}));
  await page.goto('/#quote');await page.getByLabel('Your name',{exact:true}).fill('Synthetic persistent browser');
  await expect(page.getByLabel('Synthetic test privacy consent')).toBeVisible();
  await page.getByLabel('Your email').fill('test@example.invalid');await page.getByLabel('Tell us about your idea').fill('Synthetic persistent test details');
  await page.getByLabel('Synthetic test privacy consent').check();
  const ids:string[]=[];
  await page.route('**/api/operational/enquiries',r=>{ids.push(r.request().postDataJSON().requestId);return r.fulfill({status:503,json:{error:'Synthetic database uncertainty'}})});
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  await expect(page.getByText('Storage could not be confirmed.',{exact:false})).toBeVisible();
  await page.unroute('**/api/operational/enquiries');
  await page.route('**/api/operational/enquiries',r=>{const body=r.request().postDataJSON();ids.push(body.requestId);expect(body.quantity).toBe(1);expect(body.contactConsent).toBe(true);return r.fulfill({status:201,json:{status:'stored',reference:'TK-'+'a'.repeat(32),notificationStatus:'pending'}})});
  await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  await expect(page.getByText('Your enquiry is stored.',{exact:false})).toBeVisible();
  await expect(page.getByText('Email delivery is not confirmed.',{exact:false})).toBeVisible();expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);
  await expect(page.getByText('Your enquiry was accepted by our email provider.',{exact:false})).toHaveCount(0);
  await page.reload();await page.getByLabel('Your name',{exact:true}).fill('Synthetic persistent browser');
  await page.getByLabel('Your email').fill('test@example.invalid');await page.getByLabel('Tell us about your idea').fill('Synthetic persistent test details');
  await page.getByLabel('Synthetic test privacy consent').check();await page.getByRole('button',{name:'Send enquiry',exact:false}).click();
  await expect(page.getByText('Your enquiry is stored.',{exact:false})).toBeVisible();expect(ids).toHaveLength(3);expect(ids[2]).toBe(ids[0]);
});
test('owner route and notification dispatcher remain inactive in the default preview',async({page,request})=>{
  await page.goto('/owner');await expect(page.getByText('Owner operations are not enabled.',{exact:false})).toBeVisible();
  const response=await request.post('/api/operational/dispatch');expect(response.status()).toBe(503);
});
