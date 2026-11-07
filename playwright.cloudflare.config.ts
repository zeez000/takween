import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const liveURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  ...base,
  outputDir: "test-results/cloudflare",
  use: { ...base.use, baseURL: liveURL || "http://127.0.0.1:8787" },
  webServer: liveURL ? undefined : {
    command: "npm run preview:cloudflare",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: false,
    timeout: 180000
  }
});
