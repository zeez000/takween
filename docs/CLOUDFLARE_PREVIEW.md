# Cloudflare Workers preview preparation

Prepared 6 November 2026 on codex/cloudflare-preview. Not deployed or pushed.

## Scope and branch

Based on codex/supabase-client-setup (18712b0), including lazy browser/server Supabase helpers. master contains only the original foundation; audit and database-preparation are separate branches. No database-preparation migrations are included or executed here. Application pages, components, styles and animations are unchanged.

/admin and /track remain explicitly labelled public feature outlines without authentication, operational controls or records. Quotation remains a local-only draft: no uploads or customer submissions. No backend is enabled by this configuration.

## Deployment method

Use @opennextjs/cloudflare 1.20.16 with Wrangler 4.158.0. Plain next build does not generate a Worker entrypoint. OpenNext adapts the existing Next build, without a static export or frontend rewrite. Cloudflare currently recommends vinext for new applications; adopting that different build toolchain is outside this preservation-focused change.

Next is pinned to 16.4.5 because this adapter requires >=16.4.5 for Next 16. The existing lockfile had 16.4.4. Scoped glob overrides use the compatible 10.5.0 patch to remove the adapter's high-severity CLI command-injection advisory. No forced major dependency fixes were applied.

wrangler.jsonc defines the entrypoint, static assets, self-reference binding and Node compatibility. Compatibility date 2026-11-04 matches the installed workerd release: 2026-11-06 was rejected by local runtime testing. No account ID, custom domain, R2, KV, database, Images, queue or paid resource is configured.

## Cloudflare dashboard settings — apply only after owner approves publication

- Repository: zeez000/takween; root directory: repository root.
- Build command: npm run build:cloudflare
- Deploy command: npx wrangler deploy
- Install command, if configurable: npm ci
- Build environment variable: NODE_VERSION=22 (Node 22+ required; local validation used Node 24.20.0).
- Worker name: takween-labs-preview, matching WORKER_SELF_REFERENCE. If changed, change both entries in wrangler.jsonc and the dashboard Worker name.
- Keep Workers Free; use the supplied workers.dev hostname after approval. No domain purchase is necessary.
- Do not select master or enable automatic publication until the reviewed branch is approved and available remotely. This local branch is not yet pushed.

Do not put Supabase secrets, a service-role key or customer data into any Cloudflare setting for this preview. No Supabase environment variables are needed: the existing unused helpers are lazy. Do not copy .env.local. NEXT_PUBLIC_ values are compiled into browser code and must never contain privileged keys. A future approved backend needs a separate security/deployment review.

## Local Windows verification

From PowerShell, in this isolated checkout (leaving the original port-3000 checkout alone):

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\takween-audit\takween'
npm ci
npm run check
npm run build:cloudflare
npx wrangler deploy --dry-run --outdir artifacts/cloudflare-dry-run
npm run preview:cloudflare
```

Open http://127.0.0.1:8787/. Stop with Ctrl+C. Preview uses local workerd, not Cloudflare deployment. OpenNext warns native Windows is not fully supported; this build succeeded here. Prefer Linux in Cloudflare Builds; use WSL if native Windows fails on another machine.

Browser regressions, after build: `npx playwright test --config playwright.cloudflare.config.ts`. Install Playwright browsers if missing: `npx playwright install chromium webkit`. This reuses the existing tests, starts its own local runtime, and exits it afterward. Do not run another process on 8787 during tests.

## Free plan fit and limits

Measured dry-run Worker upload: 4449.14 KiB uncompressed / 942.63 KiB gzip. Wrangler read 29 asset entries; filesystem count was 24 files, largest 954341 bytes. These fit current Cloudflare limits: 64 MiB uncompressed Worker, 20,000 static assets, 25 MiB per asset. Current official limits differ from older adapter documentation quoting a 3 MiB compressed cap.

Free allows 100,000 Worker requests/day, 10 ms CPU per invocation and 128 MB memory. The 3D animation runs in the visitor's browser. Local success and bundle size do not prove deployed CPU/startup compliance; those need an approved actual deployment and observed metrics. No paid bindings are required for this read-only preview. Do not add ISR cache services or image optimization bindings without separate review.

## Dependency/security notes

npm audit currently reports 12 moderate, zero high/critical advisories. Eight are the existing ESLint/type-analysis chain; four are OpenNext/build tooling through glob/minimatch. Glob issues involve AbortSignal cancellation and glob-pattern denial of service. Build tooling runs on repository input, not customer uploads or an HTTP glob API; do not build untrusted code in a privileged environment. The adapter is listed as a production dependency per its official setup, but these filesystem-globbing build tools are not an enabled customer feature. No blanket claim that all moderate advisories are fixed is made.

.env*, .dev.vars*, .open-next/ and .wrangler/ are ignored. No live Supabase connection was attempted, no database/bucket/auth settings changed, and no credentials are required for these builds. The generated Worker and assets contain no sb_secret_/sb_publishable_/service_role markers (checked locally); this marker scan does not replace a full secret audit.

## Sources

- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://opennext.js.org/cloudflare/get-started
- https://developers.cloudflare.com/workers/platform/limits/

## Verification results

Executed: npm install; clean npm ci (710 packages installed successfully); npm run check (lint, TypeScript, 5/5 unit tests, production Next build); npm run build:cloudflare; two successful Wrangler dry runs; npx playwright test --config playwright.cloudflare.config.ts (22 passed, 2 intentional Chromium-only skips on iPhone/WebKit); post-build lint and TypeScript checks; after clean install, lint/types/5 unit tests and 2 Workers admin/tracking browser smoke tests passed again; git diff --check; unchanged application-source diff; ignored/untracked environment paths; generated-output credential-marker scan. Browser screenshots are under test-results/cloudflare/ (ignored). Initial runtime startup failed on the unsupported compatibility date; corrected to 2026-11-04 and all browser regressions then passed. Post-build lint initially scanned generated bundles; stopped and excluded only generated output before a successful rerun. Deployment, remote Free-plan CPU/startup metrics and Cloudflare account settings remain unverified by design. No deployment command without --dry-run has been executed.