import {test,expect} from "@playwright/test";
test("viewport, keyboard, route, network and layout audit",async({page},info)=>{
 await page.addInitScript(()=>sessionStorage.setItem("takween-entry-seen","1"));
 await page.emulateMedia({reducedMotion:"reduce"});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 const failures:string[]=[];page.on("requestfailed",r=>{if(!r.failure()?.errorText.includes("ABORT"))failures.push(r.url());});
 for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  // WebKit default link-tabbing follows Safari keyboard preferences; verify focus/activation explicitly there.
  if(info.project.name==="webkit")await page.getByRole("link",{name:"Skip to content"}).focus();else await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
  const menu=page.getByRole("button",{name:"Open menu"});if(await menu.isVisible()){await menu.click();await expect(page.getByRole("navigation")).toBeVisible();await page.screenshot({path:info.outputPath(`${width}-navigation.png`)});await page.keyboard.press("Escape");}
  await page.screenshot({path:info.outputPath(`${width}-home.png`)});
  await page.locator("#quote").scrollIntoViewIfNeeded();await expect(page.getByLabel("Your name",{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`${width}-quote.png`)});
  expect(await page.locator("img").evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
 }
 for(const route of ["/admin","/track"]){await page.goto(route);await expect(page.getByRole("heading",{level:2})).toBeVisible();await page.screenshot({path:info.outputPath(route.slice(1)+".png")});}
 expect(errors).toEqual([]);expect(failures).toEqual([]);
 const timing=await page.evaluate(()=>({navigation:performance.getEntriesByType("navigation").map(e=>e.toJSON()),resources:performance.getEntriesByType("resource").map(e=>({name:e.name,duration:e.duration,transferSize:(e as PerformanceResourceTiming).transferSize}))}));
 await info.attach("browser-timing",{body:JSON.stringify(timing,null,2),contentType:"application/json"});
});