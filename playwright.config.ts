import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/browser",timeout:60000,workers:2,fullyParallel:true,retries:0,reporter:"list",
 use:{baseURL:"http://127.0.0.1:3100",trace:"retain-on-failure"},
 webServer:{command:"npm run start -- --port 3100",url:"http://127.0.0.1:3100",reuseExistingServer:false,timeout:120000},
 projects:[{name:"desktop",use:{...devices["Desktop Chrome"],launchOptions:{args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]}}},{name:"iphone",use:{...devices["iPhone 13"]}}]
});
