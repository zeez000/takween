// Build-only guard. This script never uploads or deploys a Worker.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getSeoConfig } from "../src/lib/seo.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--check")) {
  console.error("Only --check is supported. This command cannot deploy.");
  process.exit(1);
}
nextEnv.loadEnvConfig(root, false, { info() {}, warn() {}, error() {} });
process.env.SITE_INDEXING_ENABLED = "false";
try {
  if (!getSeoConfig().url) throw new Error("Set SITE_URL to the confirmed HTTPS workers.dev origin before building the public preview.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Preview settings are invalid.");
  process.exit(1);
}
if (args.includes("--check")) {
  console.log("PASS: canonical origin validated; SITE_INDEXING_ENABLED=false. No build or deployment performed.");
} else {
  const cli = fileURLToPath(new URL("../node_modules/@opennextjs/cloudflare/dist/cli/index.js", import.meta.url));
  const result = spawnSync(process.execPath, [cli, "build"], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) console.error("Unable to start the installed OpenNext builder.");
  process.exitCode = result.status ?? 1;
}
