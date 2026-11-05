import {test,expect,type Page} from "@playwright/test";

test.beforeEach(async({page},info)=>{
 if(info.title.includes("entry is skippable"))return;
 await page.addInitScript(()=>sessionStorage.setItem("takween-entry-seen","1"));
});
async function progress(page:Page,value:number){
 await page.evaluate(p=>{
  document.documentElement.style.scrollBehavior="auto";
  const section=document.querySelector<HTMLElement>("#assembly")!;
  const stage=section.querySelector<HTMLElement>(".assembly-stage")!;
  const header=document.querySelector(".header")!.getBoundingClientRect().height;
  window.scrollTo(0,scrollY+section.getBoundingClientRect().top-header+(section.offsetHeight-stage.offsetHeight)*p);
 },value);
 await expect.poll(async()=>Number(await page.getByTestId("assembly-view").getAttribute("data-progress"))).toBeCloseTo(value,2);
}

test("real WebGL assembly reverses scroll, frames parts and supports drag/reset",async({page},info)=>{
 test.setTimeout(90000);
 test.skip(info.project.name!=="desktop","Real WebGL choreography tested in desktop Chromium; mobile fallback and gestures have separate tests.");
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 await page.goto("/#assembly");
 const view=page.getByTestId("assembly-view");
 await expect(view).toHaveAttribute("data-ready","true",{timeout:45000});
 await page.getByRole("button",{name:"Pause motion",exact:true}).click();
 await progress(page,.1);await expect(view).toHaveAttribute("data-explosion","0.0000");
 const initialDistance=Number(await view.getAttribute("data-camera-distance"));
 await page.getByRole("button",{name:"Zoom in",exact:true}).click();
 await expect.poll(async()=>Number(await view.getAttribute("data-camera-distance"))).toBeLessThan(initialDistance-.2);
 await page.getByRole("button",{name:"Reset view",exact:true}).click();
 const box=(await view.boundingBox())!;
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.5+95,box.y+box.height*.5+15,{steps:12});await page.mouse.up();
 await expect.poll(async()=>Math.abs(Number(await view.getAttribute("data-yaw")))).toBeGreaterThan(.2);
 await page.getByRole("button",{name:"Reset view",exact:true}).click();
 await expect.poll(async()=>Math.abs(Number(await view.getAttribute("data-yaw")))).toBeLessThan(.02);
 await progress(page,.45);
 await expect.poll(async()=>Number(await view.getAttribute("data-explosion"))).toBeGreaterThan(.4);
 const mid=Number(await view.getAttribute("data-front-x"));
 await progress(page,.75);await expect(view).toHaveAttribute("data-explosion","1.0000");
 expect(Number(await view.getAttribute("data-front-x"))).toBeGreaterThan(4);
 expect(Number(await view.getAttribute("data-rear-x"))).toBeLessThan(-3.8);
 await expect(page.getByRole("button",{name:"Rotate left"})).toBeDisabled();
 await expect(page.locator(".tech-callout").first()).toHaveCSS("opacity","1");
 await page.screenshot({path:info.outputPath("exploded.png"),animations:"disabled"});
 await progress(page,1);await expect(view).toHaveAttribute("data-explosion","0.0000");
 await progress(page,.45);await expect.poll(async()=>Number(await view.getAttribute("data-front-x"))).toBeCloseTo(mid,2);
 await progress(page,.1);await expect(view).toHaveAttribute("data-explosion","0.0000");
 expect(Number(await view.getAttribute("data-draw-calls"))).toBeLessThan(100);
 await page.screenshot({path:info.outputPath("assembled.png"),animations:"disabled"});
 await page.getByRole("link",{name:"Skip 3D story"}).click();await expect(page).toHaveURL(/#about$/);
 expect(errors).toEqual([]);
});

test("reduced motion stays static with no WebGL scene and quote remains available",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/#assembly");
 await expect(page.getByText("Reduced motion: static illustration.",{exact:false})).toBeVisible();
 await expect(page.locator("#assembly canvas")).toHaveCount(0);
 await page.getByRole("navigation").getByRole("link",{name:"Your project"}).count();
 await page.locator("#quote").scrollIntoViewIfNeeded();await expect(page.getByLabel("Your name",{exact:true})).toBeVisible();
});

test("WebGL failure leaves a usable static story and business content",async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){
   if(String(args[0]).includes("webgl"))return null;
   return original.apply(this,args);
  } as typeof original;
 });
 await page.goto("/#assembly");
 await expect(page.getByText(/3D is unavailable on this device/)).toBeVisible({timeout:20000});
 await expect(page.locator("#assembly canvas")).toHaveCount(0);
 await page.locator("#fateen").scrollIntoViewIfNeeded();await expect(page.getByText("Born from Fateen. Built for what's next.")).toBeVisible();
});

test("entry is skippable, remembered and bypassed by direct links",async({page})=>{
 await page.goto("/");
 const intro=page.getByRole("dialog");await expect(intro).toBeVisible();
 await page.getByRole("button",{name:"ENTER THE EXPERIENCE"}).click();await expect(intro).not.toBeVisible();
 await page.reload();await expect(intro).not.toBeVisible();
 await page.evaluate(()=>sessionStorage.removeItem("takween-entry-seen"));await page.goto("/#quote");await expect(intro).not.toBeVisible();
 await expect(page.getByLabel("Your name",{exact:true})).toBeVisible();
});

test("touch surface reserves vertical scrolling and scene does not overflow",async({page},info)=>{
 await page.goto("/#assembly");
 await expect(page.locator(".assembly-viewport")).toHaveCSS("touch-action","pan-y");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(info.project.name==="iphone")await page.evaluate(()=>window.scrollBy({top:450,behavior:"instant"}));
 else await page.mouse.wheel(0,450);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(700);
 if(info.project.name==="iphone")await page.screenshot({path:info.outputPath("mobile-story.png"),animations:"disabled"});
});

test("native touch drag rotates horizontally and vertical swipe scrolls the page",async({page,context},info)=>{
 test.skip(info.project.name!=="desktop","CDP touch gesture verification uses Chromium; physical Safari testing remains separate.");
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 const session=await context.newCDPSession(page);
 await session.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
 await page.goto("/#assembly");
 const view=page.getByTestId("assembly-view");await expect(view).toHaveAttribute("data-ready","true",{timeout:45000});
 await progress(page,.1);
 await page.getByRole("button",{name:"Pause motion",exact:true}).click();
 async function swipe(x:number,y:number,dx:number,dy:number){
  await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++)await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x+dx*i/10,y:y+dy*i/10}]});
  await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 }
 await swipe(140,330,110,0);
 await expect.poll(async()=>Math.abs(Number(await view.getAttribute("data-yaw")))).toBeGreaterThan(.2);
 await page.screenshot({path:info.outputPath("mobile-assembled.png"),animations:"disabled"});
 const before=await page.evaluate(()=>scrollY);
 await swipe(240,390,0,-200);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+70);
 await progress(page,.75);await expect(view).toHaveAttribute("data-explosion","1.0000");
 await page.screenshot({path:info.outputPath("mobile-exploded.png"),animations:"disabled"});
 await session.detach();
});