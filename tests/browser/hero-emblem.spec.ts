import {expect, test, type Page} from "@playwright/test";

// Compare decoded pixels, not PNG encoding bytes. Report both visible change and noise.
async function pixelDifference(page: Page, before: Buffer, after: Buffer) {
  return page.evaluate(async ([first, second]) => {
    async function pixels(base64: string) {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], {type: "image/png"}));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const a = await pixels(first), b = await pixels(second);
    if (a.length !== b.length) throw new Error("Screenshot dimensions changed");
    let changed = 0, delta = 0;
    for (let i = 0; i < a.length; i += 4) {
      const difference = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (difference > 16) changed++;
      delta += difference;
    }
    return {changedRatio: changed / (a.length / 4), meanDelta: delta / (a.length / 4)};
  }, [before.toString("base64"), after.toString("base64")]);
}

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem("takween-entry-seen", "1"));
});

test("original gear loading coexists with the T and remains ready on entering its stage", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "Active WebGL loading is checked in Chromium.");
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto("/#hero-title");
  await expect(page.getByTestId("hero-emblem-view")).toHaveAttribute("data-ready", "true", {timeout: 45000});
  await page.locator(".assembly-stage").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("assembly-view")).toHaveAttribute("data-ready", "true", {timeout: 45000});
});

test("hero emblem supports mouse drag, keyboard rotation and reset", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "Interactive WebGL is tested with Chromium.");
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto("/");
  await expect(page.locator(".hero .part-stack, .hero .part-layer")).toHaveCount(0);
  await expect(page.locator(".hero .hero-emblem")).toHaveCount(1);
  const view = page.getByTestId("hero-emblem-view");
  await expect(view).toHaveAttribute("data-ready", "true", {timeout: 45000});
  const reset = page.getByRole("button", {name: "Reset emblem"});
  await reset.click();
  await page.waitForTimeout(1500);
  const box = (await view.boundingBox())!;
  // Read the compositor directly, without screenshot preparation moving the pointer or focus.
  const compositor = await page.context().newCDPSession(page);
  const capture = async () => Buffer.from((await compositor.send("Page.captureScreenshot", {
    format: "png", clip: {...box, height: box.height - 64, scale: 1},
  })).data, "base64");
  const front = await capture();
  await test.info().attach("front-pose", {body: front, contentType: "image/png"});
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, {steps: 8});
  await page.mouse.up();
  await expect(view).toHaveAttribute("data-yaw", "0.540");
  await page.waitForTimeout(1500);
  const turned = await capture();
  await test.info().attach("drag-pose", {body: turned, contentType: "image/png"});
  expect((await pixelDifference(page, front, turned)).changedRatio).toBeGreaterThan(.03);
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "0.000");
  await page.waitForTimeout(1500);
  let returned = await capture();
  await expect.poll(async () => {
    returned = await capture();
    const difference = await pixelDifference(page, front, returned);
    return difference.changedRatio < .005 && difference.meanDelta < .5;
  }, {timeout: 20000, intervals: [250, 500, 1000]}).toBe(true);
  await test.info().attach("reset-pose", {body: returned, contentType: "image/png"});
  const resetDifference = await pixelDifference(page, front, returned);
  expect(resetDifference.changedRatio).toBeLessThan(.005);
  expect(resetDifference.meanDelta).toBeLessThan(.5);
  await page.getByRole("button", {name: "Rotate emblem right"}).press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "0.200");
  await compositor.detach();
});

test("hero emblem keyboard rotation respects both yaw limits", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "Interactive WebGL is tested with Chromium.");
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto("/");
  const view = page.getByTestId("hero-emblem-view");
  await expect(view).toHaveAttribute("data-ready", "true", {timeout: 45000});
  await page.getByRole("button", {name: "Reset emblem"}).press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "0.000");
  await page.getByRole("button", {name: "Rotate emblem right"}).press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "0.200");
  for (let index = 0; index < 8; index++) await page.getByRole("button", {name: "Rotate emblem right"}).press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "0.600");
  for (let index = 0; index < 12; index++) await page.getByRole("button", {name: "Rotate emblem left"}).press("Enter");
  await expect(view).toHaveAttribute("data-yaw", "-0.600");
});

test("hero emblem accepts horizontal touch drag and yields to vertical swipes", async ({page, context}, info) => {
  test.skip(info.project.name !== "desktop", "Native touch injection uses Chromium CDP.");
  await page.setViewportSize({width: 390, height: 844});
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {enabled: true, maxTouchPoints: 1});
  await page.goto("/");
  const view = page.getByTestId("hero-emblem-view");
  await view.scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute("data-ready", "true", {timeout: 45000});
  await expect(view).toHaveCSS("touch-action", "pan-y");
  const box = (await view.boundingBox())!;
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  async function swipe(dx: number, dy: number) {
    await session.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x, y}]});
    for (let step = 1; step <= 10; step++) {
      await session.send("Input.dispatchTouchEvent", {type: "touchMove",
        touchPoints: [{x: x + dx * step / 10, y: y + dy * step / 10}]});
    }
    await session.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  }
  await swipe(90, 0);
  await expect.poll(async () => Number(await view.getAttribute("data-yaw"))).toBeGreaterThan(.4);
  const before = await page.evaluate(() => scrollY);
  await swipe(0, -180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 50);
  await session.detach();
});

test("hero shows the traced fallback without WebGL", async ({page}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.startsWith("webgl")) return null;
      return Reflect.apply(getContext, this, [kind, ...args]);
    } as typeof getContext;
  });
  await page.goto("/");
  const fallback = page.getByRole("img", {name: "Red layered T monogram"});
  await fallback.scrollIntoViewIfNeeded();
  await expect(fallback.locator("polygon")).toHaveCount(4);
  await expect(page.locator(".hero canvas")).toHaveCount(0);
});

test("hero retains its renderer and pose while paused offscreen or backgrounded",async({page},info)=>{
 test.skip(info.project.name!=="desktop","Renderer lifecycle is exercised in Chromium.");
 await page.goto('/#hero-title');
 const view=page.getByTestId('hero-emblem-view');
 await expect(view).toHaveAttribute('data-ready','true',{timeout:45000});
 const canvas=await page.locator('.hero canvas').elementHandle();
 await canvas!.evaluate(node=>{
  const gl=(node as HTMLCanvasElement).getContext('webgl2')!;
  const draw=gl.drawArrays.bind(gl);Reflect.set(window,'heroDraws',0);
  gl.drawArrays=(mode,first,count)=>{Reflect.set(window,'heroDraws',Reflect.get(window,'heroDraws')+1);draw(mode,first,count);};
 });
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'heroDraws'))).toBeGreaterThan(0);
 await page.locator('#quote').scrollIntoViewIfNeeded();
 await expect(view).toHaveAttribute('data-ready','false');
 await page.waitForTimeout(200);
 const idlePaused=await page.evaluate(()=>Reflect.get(window,'heroDraws'));
 await page.waitForTimeout(200);
 expect(await page.evaluate(()=>Reflect.get(window,'heroDraws'))).toBe(idlePaused);
 await view.scrollIntoViewIfNeeded();
 await expect(view).toHaveAttribute('data-ready','true');
 await page.getByRole('button',{name:'Reset emblem',exact:true}).click();
 await page.getByRole('button',{name:'Rotate emblem right',exact:true}).click();
 for(let index=0;index<3;index++){
  await page.locator('#quote').scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute('data-ready','false');
  expect(await canvas!.evaluate(node=>node.isConnected)).toBe(true);
  await page.waitForTimeout(200);
  const paused=await page.evaluate(()=>Reflect.get(window,'heroDraws'));
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>Reflect.get(window,'heroDraws'))).toBe(paused);
  await view.scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute('data-ready','true');
  await expect(view).toHaveAttribute('data-yaw','0.200');
 }
 // Synthetic visibility events exercise cleanup without claiming a physical
 // browser/OS background test on this headless runner.
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(view).toHaveAttribute('data-ready','false');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:false});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(view).toHaveAttribute('data-ready','true');
 expect(await canvas!.evaluate(node=>node.isConnected)).toBe(true);
 await expect(view).toHaveAttribute('data-yaw','0.200');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.hero canvas')).toHaveCount(0);
 await expect(page.getByRole('img',{name:'Red layered T monogram'})).toBeVisible();
});

test("hero context loss shows its static logo without blocking the enquiry",async({page},info)=>{
 test.skip(info.project.name!=="desktop","Context loss is injected in Chromium.");
 await page.goto('/#hero-title');
 await expect(page.getByTestId('hero-emblem-view')).toHaveAttribute('data-ready','true',{timeout:45000});
 await page.locator('.hero canvas').evaluate(canvas=>{
  (canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
 });
 await expect(page.locator('.hero canvas')).toHaveCount(0);
 await expect(page.getByRole('img',{name:'Red layered T monogram'})).toBeVisible();
 await page.locator('#quote').scrollIntoViewIfNeeded();
 await expect(page.getByLabel('Your name',{exact:true})).toBeVisible();
});

test("high-DPI mobile rendering keeps the approved resolution cap through rotation",async({page,context},info)=>{
 test.skip(info.project.name!=="desktop","High-DPI metrics use Chromium CDP, not a physical phone.");
 const session=await context.newCDPSession(page);
 for(const [width,height]of [[390,844],[844,390]]){
  await session.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:3,mobile:true});
  if(width===390)await page.goto('/#hero-title');
  const view=page.getByTestId('hero-emblem-view');await view.scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute('data-ready','true',{timeout:45000});
  await expect.poll(()=>page.locator('.hero canvas').evaluate(canvas=>{
   const surface=canvas as HTMLCanvasElement,box=canvas.getBoundingClientRect();
   return surface.width>=box.width-1&&surface.height>=box.height-1&&
    surface.width<=box.width*1.25+1&&surface.height<=box.height*1.25+1;
  })).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Reset emblem',exact:true}).click();
  await expect(view).toHaveAttribute('data-yaw','0.000');
 }
 await session.detach();
});

test("hero returns reliably after repeated internal navigation and browser back",async({page},info)=>{
 test.skip(info.project.name!=="desktop","Active route-return WebGL checks use Chromium.");
 await page.goto('/#hero-title');
 const view=page.getByTestId('hero-emblem-view');
 for(let iteration=0;iteration<3;iteration++){
  await view.scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute('data-ready','true',{timeout:45000});
  await page.getByRole('link',{name:'Operations preview',exact:false}).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goBack();
  await view.scrollIntoViewIfNeeded();
  await expect(view).toHaveAttribute('data-ready','true',{timeout:45000});
  // Include deferred renderer teardown, so a transient ready flag cannot hide
  // a context being lost shortly after the cached route returns.
  await page.waitForTimeout(800);
  await expect(view).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Reset emblem',exact:true}).click();
  await expect(view).toHaveAttribute('data-yaw','0.000');
 }
});

test("animated hero emblem fits the seven requested viewports", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "The viewport matrix is run once in Chromium.");
  await page.goto("/");
  for (const [width, height] of [[360,800],[390,844],[430,932],[768,1024],[1366,768],[1440,900],[1920,1080]]) {
    await page.setViewportSize({width, height});
    await page.getByTestId("hero-emblem-view").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("hero-emblem-view")).toHaveAttribute("data-ready", "true", {timeout: 45000});
    const emblem = (await page.locator(".hero-emblem").boundingBox())!;
    const copy = (await page.locator(".hero-copy").boundingBox())!;
    expect(emblem.x).toBeGreaterThanOrEqual(0);
    expect(emblem.x + emblem.width).toBeLessThanOrEqual(width);
    expect(emblem.x >= copy.x + copy.width || emblem.y >= copy.y + copy.height).toBe(true);
    await expect(page.locator(".hero canvas")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
