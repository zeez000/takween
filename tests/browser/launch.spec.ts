import {test,expect} from "@playwright/test";
import {getSeoConfig} from "../../src/lib/seo";

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem("takween-entry-seen","1"));
});

test("rendered SEO, crawl controls and private-route exclusions",async({page,request})=>{
  const seo=getSeoConfig();
  const response=await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response?.headers()["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  expect(response?.headers()["x-powered-by"]).toBeUndefined();
  const favicon=await request.get("/favicon.ico");expect(favicon.status()).toBe(200);
  expect(favicon.headers()["content-type"]).toContain("image/");
  await expect(page).toHaveTitle("TAKWEEN LABS | Custom 3D Printing in Bengaluru");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content",/planned custom plastic FDM/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content",/TAKWEEN LABS/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content","summary");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",seo.indexable?"index, follow":"noindex, nofollow");
  const canonical=page.locator('link[rel="canonical"]');
  if(seo.url){
    await expect(canonical).toHaveCount(1);
    // Next normalizes root canonicals; URL parsing compares equivalent root forms.
    expect(new URL((await canonical.getAttribute("href"))??"").href).toBe(new URL(seo.url).href);
  } else await expect(canonical).toHaveCount(0);
  const organization=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()??"{}");
  expect(organization["@type"]).toBe("Organization");
  expect(organization.name).toBe("TAKWEEN LABS");
  for(const field of ["address","openingHours","aggregateRating","review","telephone"]) expect(organization[field]).toBeUndefined();
  const robots=await request.get("/robots.txt");expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(seo.indexable?"Disallow: /admin":"Disallow: /");
  const sitemap=await request.get("/sitemap.xml");expect(sitemap.status()).toBe(200);
  const xml=await sitemap.text();expect(xml).not.toMatch(/\/admin|\/track/);
  if(seo.indexable) expect(xml).toContain(`<loc>${seo.url}/</loc>`);else expect(xml).not.toContain("<loc>");
  for(const route of ["/admin","/track"]){
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, nofollow");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  }
  expect((await request.get("/not-a-real-page")).status()).toBe(404);
});

test("internal links, images and browser diagnostics",async({page,request})=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  page.on("requestfailed",r=>errors.push(`${r.method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`));
  await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  const hrefs=await page.locator("a[href]").evaluateAll(links=>links.map(a=>a.getAttribute("href")!));
  for(const href of new Set(hrefs)){
    if(href.startsWith("#")) expect(await page.locator(`[id="${href.slice(1)}"]`).count(),href).toBe(1);
    else if(href.startsWith("/")) expect((await request.get(href)).ok(),href).toBe(true);
  }
  expect(hrefs.filter(href=>href.startsWith("mailto:"))).toEqual(["mailto:takweenlabs.in@gmail.com"]);
  expect(hrefs.filter(href=>/^(tel:|https?:)/.test(href))).toEqual([]);
  expect(await page.locator("img").evaluateAll(images=>images.filter(i=>!(i instanceof HTMLImageElement)||!i.hasAttribute("alt")||!i.complete||i.naturalWidth===0).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("exact launch viewport matrix and keyboard navigation",async({page},info)=>{
  test.skip(info.project.name!=="desktop","Exact viewport matrix uses Chromium; iPhone WebKit has separate coverage.");
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[768,1024],[1024,768],[360,800],[390,844],[430,932],[844,390]]){
    await page.setViewportSize({width,height});await page.goto("/");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}x${height}`).toBe(true);
    await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
    await page.keyboard.press("Enter");await expect(page).toHaveURL(/#main-content$/);
    const menu=page.getByRole("button",{name:"Open menu"});
    if(await menu.isVisible()){
      await menu.click();await page.getByRole("link",{name:"Materials",exact:true}).focus();
      await page.keyboard.press("Escape");await expect(menu).toBeFocused();await expect(menu).toHaveAttribute("aria-expanded","false");
    }
    await page.screenshot({path:info.outputPath(`launch-${width}x${height}.png`),fullPage:true,animations:"disabled"});
  }
});
