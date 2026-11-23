import {defineConfig,devices} from '@playwright/test';
const baseURL=process.env.TAKWEEN_LOCAL_WORKER_URL??'http://127.0.0.1:8797';
if(!['127.0.0.1','localhost'].includes(new URL(baseURL).hostname))throw Error('Operational browser tests require localhost');
export default defineConfig({testDir:'./tests/operational-browser',workers:1,retries:0,timeout:60000,
  outputDir:'./artifacts/phase2/operational-test-results',
  use:{baseURL,trace:'retain-on-failure'},reporter:'list',projects:[{name:'desktop',use:{...devices['Desktop Chrome'],channel:'chromium'}},{name:'mobile',use:{...devices['Pixel 7'],channel:'chromium'}}]});
