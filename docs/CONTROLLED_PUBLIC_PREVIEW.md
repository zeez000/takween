# TAKWEEN controlled public foundation preview

Prepared locally on 7 November 2026 on codex/pre-launch-audit. The later approved public deployment is recorded below. The preparation instructions and measurements are retained as historical evidence.

## Public deployment on 7 November 2026

Cloudflare deployed https://takween-labs-preview.abdzeez000.workers.dev as Worker version `610954de-4d69-43dc-9389-99d7bc47d2a4`. Startup took 12 ms. The target name was unused immediately before deployment. The source was `codex/pre-launch-audit` at base `b3c01ea` with the local audit and launch changes. Git branches were neither pushed nor merged.

The footer and local draft both use `mailto:takweenlabs.in@gmail.com`. Customer details stay in the local draft, and the mail link contains only the recipient. The public canonical, noindex metadata, robots crawl block and empty sitemap passed live checks. Favicon and public assets loaded. Tested environment, repository, SQL and unfinished API paths returned 404.

Lint, TypeScript, 9 unit tests, production Next/OpenNext builds and the final Wrangler dry run passed. The live browser suite reported 27 passes, four intentional skips and one WebKit failure caused by an absolute scroll-position assertion. A separate live probe confirmed 450 pixels of movement. The corrected assertion passed three times per browser. That correction changed only the test. The viewport matrix covered all requested desktop and portrait sizes plus 1024×768 and 844×390 landscape. Physical phones were unavailable. Six automated accessibility scans found zero violations.

Production Lighthouse lab results were 77 mobile and 89 desktop for performance, 100 accessibility and best practices on both, and 63 SEO with the intentional crawl block. Mobile LCP was 3.1 s and TBT was 460 ms. Desktop LCP was 1.2 s and TBT was 150 ms. Reports are in `artifacts/go-live-lighthouse-mobile.json` and `artifacts/go-live-lighthouse-desktop.json`. Twelve moderate dependency advisories remain. The current audit found zero high or critical advisories.

## Confirmed target

Expected URL after separately approved deployment:

https://takween-labs-preview.abdzeez000.workers.dev

Wrangler login succeeded. Read-only Cloudflare API GET /workers/subdomain returned HTTP 200 and confirmed the account subdomain abdzeez000. GET /workers/scripts returned HTTP 200: the target Worker takween-labs-preview did not exist at preparation time. This is an expected deployment URL, not a claim that it is already live. Recheck the target before eventual publication if account state changes.

The selected account is pinned locally in wrangler.jsonc to avoid deploying into an unintended account. The account ID and public origin are configuration, not secret keys. No token is stored in this repository.

Workers Free was explicitly confirmed by the owner in the Cloudflare dashboard. The OAuth token's read-only subscriptions query returned HTTP 403, so billing was not independently verified through the API. No upgrade, payment, temporary account, domain, R2, KV, Images or other paid service was created or requested.

## Preview behavior

- Existing pages, black/red styling, fonts, cinematic animation, scrolling, controls and business claims remain unchanged.
- Quotations are local-only drafts. Files remain on the device. No customer submission or upload endpoint is enabled.
- /admin and /track remain clearly labelled inactive feature outlines, with no customer records or administrative operations. Future authentication and private storage are not enabled by this preparation.
- All pages remain noindex; robots.txt disallows crawling; sitemap.xml contains no public entries. These are crawler instructions, not access control: this will be a public preview if publication is later approved. Do not place private data on any public route.
- Homepage canonical and social/Organization URL use the confirmed Workers origin. No made-up address, hours, reviews, availability or contact details were added.
- No Supabase environment variables or secrets are needed for the preview. Do not copy the original .env.local into Cloudflare or GitHub. The existing helpers stay lazy and unused by pages.

## Configuration prepared locally

wrangler.jsonc retains OpenNext's .open-next/worker.js entrypoint, .open-next/assets binding, nodejs_compat, global_fetch_strictly_public, compatibility date 2026-11-04 and WORKER_SELF_REFERENCE matching takween-labs-preview. It now explicitly pins the account and nonsecret vars:

```text
SITE_URL=https://takween-labs-preview.abdzeez000.workers.dev
SITE_INDEXING_ENABLED=false
```

An ignored .env.production.local in this managed checkout contains only those two nonsecret settings. Existing environment files were not overwritten and the original OneDrive checkout was not changed. The ignored local file is not available to a remote build; configure the same values in Cloudflare build settings if using Workers Builds.

New build-only script: `npm run build:preview`. It loads Next's production environment, forces SITE_INDEXING_ENABLED=false even if inherited settings enable indexing, validates SITE_URL and refuses a missing/invalid canonical origin. It then invokes only the installed OpenNext **build** command. It does not deploy, upload, migrate or create resources. `npm run build:preview -- --check` validates without building. Unsupported arguments, including --deploy, are rejected. Existing general build and development scripts remain available.

## Exact local preparation commands (no deployment)

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\takween-audit\takween'
$env:SITE_URL='https://takween-labs-preview.abdzeez000.workers.dev'
$env:SITE_INDEXING_ENABLED='false'
npm ci
npm run lint
npm run typecheck
npm test
npm run build:preview -- --check
npm run build:preview
npx wrangler deploy --dry-run --outdir artifacts/controlled-preview-final
npx playwright test --config playwright.cloudflare.config.ts
```

Use the explicit environment settings for browser tests as well as build: the tests compare rendered metadata with the configured canonical. The ignored production-local file is also sufficient for Next's build, but Playwright does not automatically load Next environment files.

To review locally after building:

```powershell
npm run preview:cloudflare
```

Open http://127.0.0.1:8787/. Stop with Ctrl+C. This local runtime preview creates no public tunnel or deployment. The original port-3000 website is not restarted or edited.

## Final deploy command — DO NOT RUN until explicitly approved

Once the final tested source/build and target are approved:

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\takween-audit\takween'
$env:SITE_URL='https://takween-labs-preview.abdzeez000.workers.dev'
$env:SITE_INDEXING_ENABLED='false'
npm run build:preview
```

Stop after the build. **Only after explicit final deployment approval**, run this separate publication command:

```powershell
npx wrangler deploy
```

Deployment is the first command without --dry-run that publishes anything. It has NOT been executed. Avoid publishing an older .open-next directory after source or canonical settings change; rebuild first. Keep the preview noindex until a separate launch/indexing decision is approved.

## If using Cloudflare dashboard Git builds later

Do not enable automatic deployments or push this branch as part of preparation. The following settings are instructions for a separately approved publication workflow:

| Setting | Value |
|---|---|
| Framework/hosting | Existing OpenNext on Cloudflare Workers |
| Repository/root | zeez000/takween / repository root |
| Source | The reviewed preview branch/commit; do not substitute old master |
| Install | npm ci |
| Build | npm run build:preview |
| Deploy | npx wrangler deploy |
| NODE_VERSION (build) | 22, using a maintained Node 22 patch |
| SITE_URL (build) | https://takween-labs-preview.abdzeez000.workers.dev |
| SITE_INDEXING_ENABLED (build) | false |
| Runtime vars | Same SITE_URL and false flag, already declared in wrangler.jsonc |
| Worker name | takween-labs-preview |
| Workers plan | Keep the owner-confirmed Free plan; do not upgrade |
| Supabase keys/customer data | None required; do not add |

Cloudflare dashboard Git authorization or locally cached Wrangler OAuth handles deployment authentication. Do not paste passwords, OAuth tokens or API tokens into chat or source files. Do not use NEXT_PUBLIC_ variables for privileged secrets. No new application secret is required.

## Free-plan compatibility and limitations

The project uses no paid-resource bindings. The Worker and asset sizes fit the current Free plan. The documented plan includes 100000 Worker requests/day, 10 ms CPU/request, 128 MB memory, 1-second startup, 64 MiB uncompressed Worker size, 20000 static assets and 25 MiB per asset. Daily/CPU/startup behavior on the real edge still needs verification after approved publication; dry runs and local browser performance do not prove those limits. No paid fallback or automatic upgrade is configured here.

workers.dev is Cloudflare's free preview hostname; takweenlabs.pages.dev would require a different Pages project and is not this Worker's address. Cloudflare recommends a custom domain for business-critical production; purchasing one is outside this controlled preview.

Official references checked for preparation:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

## Verification evidence

The fresh baseline with explicit indexing false passed lint, TypeScript, 10 unit tests (including preview build guards), the production Next build, OpenNext Worker build and Wrangler dry run. Browser regressions: 27 passed, 3 intentional skips in Chromium/iPhone WebKit. Screenshots: test-results/controlled-preview/.

The final canonical-specific build used the actual confirmed origin and forced SITE_INDEXING_ENABLED=false. Lint, TypeScript, all 10 unit tests, Next production build (via OpenNext) and Worker build passed. Wrangler dry run passed without uploading: 5108.05 KiB uncompressed / 1088.21 KiB gzip, 27 filesystem assets (32 Wrangler entries), largest 954341 bytes. Final generated-output scan found zero credential-pattern matches. .env.production.local is ignored and untracked.

Rendered homepage HTML was checked directly: canonical is https://takween-labs-preview.abdzeez000.workers.dev and robots is noindex, nofollow. The first canonical-specific browser pass had 4 passes and 2 failures because the test expected a trailing slash that Next normalizes away. The assertion was corrected to compare parsed URL identities, retaining checks for exactly one canonical and the exact approved host/path. No application output or functionality was changed to satisfy the test. Final rerun results are appended below.

Current known pre-launch concerns remain in PRELAUNCH_AUDIT.md: moderate tooling advisories, software-rendered performance limitations and unfinished backend features. This preview does not claim those concerns are resolved. Workers CPU/startup behavior and real HTTPS-edge checks remain post-deployment verification; they were not tested through unauthorized publication.

Final rerun: lint and TypeScript passed; **6/6 canonical/privacy/link/placeholder browser tests passed** in Chromium and iPhone WebKit (26.5 seconds). This verifies the actual canonical origin while indexing remains false, crawl blocking/empty sitemap, private-outline noindex, favicon, security headers, internal links and browser diagnostics. Evidence: test-results/controlled-preview-verified/. git diff --check passed. Components, animation/scrolling code, styles, site capability configuration, Supabase files and dependency lockfile remain unchanged. All changes remain local and unpublished; final deployment approval is still required.
