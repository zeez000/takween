import {test,expect} from "@playwright/test";
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem("takween-entry-seen","1"));});
test("homepage has truthful branding, capability labels and no overflow",async({page})=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toContainText("YOU NAME IT.");
 await expect(page.getByRole("heading",{name:/BEYOND PLASTIC/})).toBeVisible();
 await expect(page.getByText("Born from Fateen. Built for what's next.")).toBeVisible();
 await expect(page.getByText("Availability unconfirmed",{exact:true})).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test("mobile menu supports touch navigation",async({page})=>{
 await page.goto("/");const menu=page.getByRole("button",{name:"Open menu"});
 if(await menu.isVisible()){
  await menu.click();await expect(page.getByRole("button",{name:"Close menu"})).toHaveAttribute("aria-expanded","true");
  await page.getByRole("navigation").getByRole("link",{name:"Materials",exact:true}).click();
  await expect(menu).toHaveAttribute("aria-expanded","false");await expect(page).toHaveURL(/#materials$/);
 }
});
test("draft and file selection stay local and never imply an upload",async({page})=>{
 await page.goto("/");await page.getByLabel("Your name",{exact:true}).fill("Preview user");
 await page.getByLabel("Email or phone").fill("preview@example.invalid");
 await page.getByLabel("Tell us about your idea").fill("A concept enclosure for design review.");
 const fileInput=page.getByLabel("Select a design file for local validation");
 await fileInput.setInputFiles({name:"unsupported.txt",mimeType:"text/plain",buffer:Buffer.from("preview")});
 await expect(page.locator("#file-result")).toContainText("Choose an STL");
 await page.getByRole("button",{name:"Prepare enquiry draft"}).click();await expect(page.getByLabel("Your enquiry draft")).toHaveCount(0);
 await fileInput.setInputFiles({name:"concept.stl",mimeType:"application/octet-stream",buffer:Buffer.from("solid preview\nendsolid preview")});
 const writes:string[]=[];page.on("request",request=>{if(["POST","PUT","PATCH","DELETE"].includes(request.method()))writes.push(request.url());});
 await page.getByRole("button",{name:"Prepare enquiry draft"}).click();
 await expect(page.getByLabel("Your enquiry draft")).toHaveValue(/Preview user/);
 await expect(page.getByText("Draft prepared on this device. Nothing has been sent.")).toBeVisible();
 await expect(page.locator("#file-result")).toContainText("Not uploaded");expect(writes).toEqual([]);
 await page.getByLabel("Your name",{exact:true}).fill("Changed name");await expect(page.getByLabel("Your enquiry draft")).toHaveCount(0);
});
test("operations and tracking remain honest placeholders",async({page})=>{
 await page.goto("/admin");await expect(page.getByText(/Authentication and operational data are not implemented/)).toBeVisible();
 await page.goto("/track");await expect(page.getByText(/This preview does not accept order numbers/)).toBeVisible();
});
test("reduced motion disables decorative animation",async({page})=>{
 const errors:string[]=[];page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 expect(await page.locator(".hero .part-stack").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
 expect(errors.filter(message=>/hydrat/i.test(message))).toEqual([]);
});
test("responsive widths and visual capture",async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 if(testInfo.project.name==="desktop"){
  for(const width of [320,375,390,430,768,1440]){
   await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow at ${width}px`).toBe(true);
  }
  await page.setViewportSize({width:1440,height:1000});
 }
 await page.screenshot({path:testInfo.outputPath("homepage.png"),fullPage:true,animations:"disabled"});
});