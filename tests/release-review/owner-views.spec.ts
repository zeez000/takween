import {test,expect} from '@playwright/test';import {writeFile} from 'node:fs/promises';import {login,view,audit} from '../operational-browser/business-helpers';
test('all private business views render accessible stored data with no overflow',async({page})=>{
 const metrics:{view:string;loadMs:number}[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);
 for(const kind of ['materials','movements','machines','maintenance','estimates','scheduling','job_costs','finance','products','variants','customers','customer_notes','reports','events']){
  const start=performance.now();const w=await view(page,kind);metrics.push({view:kind,loadMs:Math.round(performance.now()-start)});await expect(w.getByRole('status')).not.toContainText(/unavailable|not activated|Too many|not confirmed/i);await expect(w).toHaveAttribute('aria-busy','false');
  const first=w.locator('details').first();if(await first.count())await first.locator('summary').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:`artifacts/system-review-${test.info().project.name}-${kind}.png`,fullPage:true});
  await audit(page);await w.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/system-review-${test.info().project.name}-${kind}-viewport.png`});
 }expect(errors).toEqual([]);await writeFile(`artifacts/system-review-${test.info().project.name}-timings.json`,JSON.stringify({note:'Unthrottled Chromium emulation, loopback Worker and synthetic local database; includes UI action/network/render, not hosted CPU or Lighthouse.',metrics},null,2));
});
