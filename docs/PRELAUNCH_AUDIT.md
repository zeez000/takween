# TAKWEEN LABS pre-launch audit — 7 November 2026

## Decision

Prepared for an owner-approved **public foundation preview**, not a production customer-intake platform. No deployment, push, merge, paid service, migration, storage bucket or authentication setting was performed or changed. Original OneDrive checkout and port 3000 were not restarted or edited.

Repository: https://github.com/zeez000/takween. Audit branch: `codex/pre-launch-audit`, based on `codex/cloudflare-preview` at `b3c01ea`. Latest existing commit at inspection: `b3c01ea Prepare tested Cloudflare Workers preview with OpenNext`. Checkout was initially clean. Audit changes are local and uncommitted for review.

Other inspected local refs: master/origin master `f0d27a8`; Supabase client setup `18712b0`; database preparation `25e4f86`; audit-worktree/origin full-stack-audit `b8d30ea`. These are local ref observations, not a fresh remote synchronization. The database-preparation and earlier audit branches have not been merged here. In particular, this branch has no GitHub Actions workflow; earlier audit work must be reviewed separately before incorporating it.

## Findings by priority

| Priority | Finding | Disposition |
|---|---|---|
| Critical | No exploitable critical vulnerability was established by the executed checks. | This is not a penetration-test guarantee or validation of uninspected live policies. |
| Important | Quotes, uploads, authentication, orders and tracking are not implemented. | Public outlines/drafts remain explicitly inactive. Do not advertise online booking or intake. |
| Important | WhatsApp number and other business contact details are unconfirmed. | No WhatsApp URL is exposed. Owner must confirm a genuine contact channel before a business launch. |
| Important | Public origin/account subdomain is unknown; Wrangler is unauthenticated. | Owner login, confirmed origin and explicit publication approval required. No guessed canonical URL. |
| Important | Indexing is deliberately disabled until launch settings are supplied. | Set approved SITE_URL and SITE_INDEXING_ENABLED=true at build time, rebuild and inspect rendered crawl metadata before launch. |
| Important | 12 moderate dependency advisories; 5 remain with --omit=dev. | The five are OpenNext/AWS/minifier/glob/minimatch tooling, not merely dev-labelled dependencies. No application endpoint accepts glob patterns, and no customer files reach these tools. No high/critical advisories. Do not run untrusted builds with credentials. Review compatible upstream fixes separately; no forced major upgrades. |
| Important | Live Supabase RLS/storage/auth workflows remain unverified. | Auth settings GET succeeds, but this does not establish table or storage security. Do not enable backend features. |
| Important | Deployed CPU, startup, edge latency and field Core Web Vitals are unavailable before publication. | Local runtime/bundle results cannot establish these production metrics. Physical iPhone/Windows GPU testing remains separate from software-rendered automation. |
| Important | Mobile Lighthouse performance is 51; software-rendered 3D samples are slow. | Profile a typical Windows GPU and physical phone before claiming smooth commercial-launch performance. Do not infer 60 FPS from functional tests. Working animation code was preserved; performance recommendations were not implemented. |
| Optional | Dedicated social sharing image, real portfolio, approved capabilities and printer specifications are missing. | No fabricated content added. Text Open Graph/Twitter metadata is present; custom social artwork can be approved later. |
| Optional | CSP and real-user performance monitoring are not configured. | A CSP needs nonce/hash testing with Next inline scripts and WebGL; do not add a blanket policy that breaks the site. No paid analytics added. |

## Actual functional scope

Working and tested: server-rendered homepage content; black/red TAKWEEN identity; original procedural mechanical assembly; deterministic reversible scroll sequence; assembled drag, reset and zoom; touch scrolling; entry skip/remember/direct-link bypass; static and reduced-motion fallbacks; responsive navigation; local enquiry draft and extension/size selection checks; Fateen section with availability explicitly unconfirmed; feature outlines and 404 navigation. The visible brand remains TAKWEEN; TAKWEEN LABS is used in page/social metadata per the owner's launch brief.

Incomplete by design: real enquiries, file transfer, STL processing/customer model preview, compressed archive inspection, quotes/pricing, customer login, administrator login/MFA, customer-isolated records, private file access, order management/tracking, inventory and payments. No operational APIs/server actions exist. Existing Supabase helpers are lazy and are not called by pages. Current schema.proposed.sql is unapplied design, not production security evidence. Prepared migrations exist on a separate local branch and were not applied or merged.

The existing draft picker allows STL/3MF/STEP/STP by filename and uses a 25 MiB UX limit (labelled 25 MB). It never reads or uploads the file. ZIP is rejected. This is not content validation. The approved future 30 MiB/file, 3 files/enquiry, 50 MiB total and structural 3MF validation remain backend preparation requirements. No private storage, rate limiting, spam prevention or archive validation is claimed to exist today. Those become mandatory before intake activation, together with authorization, privacy/retention policy and isolated processing. The procedural sculpture never parses customer STL content.

## Safe local fixes

- Added build-time SEO configuration validation. No automatic deployment-host inference or fabricated hostname.
- Added robots.txt and sitemap.xml using Next metadata routes. Default preview blocks indexing and has no sitemap entries; approved indexed mode lists only the homepage.
- Added homepage-only canonical and Organization JSON-LD; no address, phone, hours, ratings, reviews, prices or unverified offerings.
- Added Open Graph/Twitter text metadata and distinct private-outline titles/descriptions; /admin and /track always retain noindex, nofollow, independent of the launch flag.
- Added SEO unit tests and browser tests for rendered metadata, security headers, local links, 404, image attributes, browser errors, exact viewport sizes and keyboard navigation. Added an explicit ZIP-rejection assertion to the existing local-picker unit test.
- Added documented SITE_URL and SITE_INDEXING_ENABLED placeholders to .env.example. No credentials copied or changed.
- Fixed the Lighthouse-confirmed favicon.ico 404 with a static ICO and SVG using the existing TAKWEEN text wordmark. No new logo identity or page redesign. Added a browser regression asserting the favicon response.

Modified files: .env.example; package.json (test script only); src/app/layout.tsx; src/app/page.tsx (metadata and a nonvisual JSON-LD script only); src/app/admin/page.tsx and src/app/track/page.tsx (metadata only); tests/enquiry.test.ts. New files: src/lib/seo.ts; src/app/robots.ts; src/app/sitemap.ts; src/app/icon.svg; src/app/favicon.ico; tests/seo.test.ts; tests/browser/launch.spec.ts; this report. No components, stylesheets, animation/timeline code, site configuration, Supabase code/schema, lockfile or hosting configuration were modified.

## Executed verification

| Check | Actual result / evidence |
|---|---|
| Installed compatibility | npm ls --depth=0 passed; Node 24.20.0, Next 16.4.5, React 19.3.1, OpenNext 1.20.16, Wrangler 4.158.0. |
| Lint | Passed. |
| TypeScript | Passed, including new browser tests. |
| Unit tests | 7 passed; timeline, local draft/file/WhatsApp logic and safe SEO configuration. |
| npm run build | Passed; homepage, outlines, robots.txt and sitemap.xml prerendered. |
| npm run build:cloudflare | Passed. Native-Windows compatibility warning remains upstream. |
| Wrangler deploy --dry-run | Passed; no upload. Final: 5107.95 KiB uncompressed, 1088.16 KiB gzip. Only ASSETS and WORKER_SELF_REFERENCE bindings. |
| Local Workers browser suite | 27 passed, 3 intentional skips, 4.6 minutes. Skips: Chromium WebGL choreography/CDP tests in WebKit, and duplicate exact viewport matrix in WebKit. |
| Viewport coverage | 1920x1080, 1366x768, 768x1024, 390x844, 320x640. Keyboard skip link/menu Escape and overflow assertions passed. Chromium and iPhone-emulated WebKit; not physical devices. |
| Browser regressions | Scroll/reverse/reassembly, drag/reset/zoom, touch, reduced motion, WebGL failure, entry, navigation, drafts, placeholders passed. No browser error/failed-request assertions failed in covered cases. |
| Final fix regression | After the favicon and generic URL-error guard: lint, types, 7 unit tests, Next build, Worker build and dry run all passed again; 4 targeted Chromium/WebKit metadata/link/browser-diagnostic tests passed (24.5 seconds), including HTTP 200 image response for favicon.ico. |
| SEO and headers | Browser tests confirm titles/description, text social metadata, safe JSON-LD, private-route noindex, default crawl blocking/empty sitemap, 404 status and nosniff/frame/referrer/permissions headers. Indexed configuration validated by unit tests; production-origin rendered build requires confirmed hostname. |
| Secrets | Zero tracked credential-pattern matches; zero generated Worker/asset credential-pattern matches; .env.local/.dev.vars ignored. Only .env.example is tracked. Pattern scans are not a proof of absence of all secrets. |
| Supabase connection | Fresh read-only GET /auth/v1/settings returned HTTP 200 using ignored configuration in the original checkout, without logging values/bodies. No records/sessions created. |
| Supabase policies/storage | Not verified. No privileged credentials used and no policies or bucket permissions changed. |
| Cloudflare account | wrangler whoami: not authenticated. No login, temporary account, tunnel or public preview created. |
| Dependency audit | Fresh npm audit: 12 moderate, 0 high/critical. --omit=dev: 5 moderate in adapter/tooling chain. JSON evidence in artifacts/prelaunch-*-audit.json. |

The initial restricted build failed with `TurbopackInternalError: Failed to write app endpoint /page`, CSS child process exiting before connection. An elevated retry inherited the stale generated cache. Removing only that generated cache allowed the unchanged Turbopack build to succeed; no Defender exclusions or source workaround were introduced. Intermediate test-harness typing/cache relocation errors were corrected before the successful checks above.

Screenshots: test-results/prelaunch/ contains desktop/mobile assembled/exploded views, homepage and exact launch viewport screenshots. Raw results and temporary measurement tools live under ignored artifacts/ and test-results/; they are not website assets or public endpoints.

## Hosting and URL

Keep the existing OpenNext Workers deployment. `npm run build` alone does not create the Worker; the correct build command is `npm run build:cloudflare`. Deploy command, **only after separate explicit approval**, is `npx wrangler deploy`. Root: repository root. Install: npm ci. Build Node: NODE_VERSION=22 (22.19+ if running the optional cached Lighthouse version; use a maintained Node 22 patch).

Current Worker name is takween-labs-preview. Its eventual free URL has the form `https://takween-labs-preview.<account-subdomain>.workers.dev`. The exact account subdomain was not obtained because this machine is not authenticated. Renaming is optional; it would require matching Worker name and WORKER_SELF_REFERENCE. No rename was made.

`takweenlabs.pages.dev` belongs to a Cloudflare Pages project, not an OpenNext Worker. Using it would require a separate Pages static-export architecture or a separate redirect site; name availability is not verified. Neither is necessary for the current preview and neither was created. Workers is retained so future approved server-side functionality is possible.

Current configuration: nodejs_compat, global_fetch_strictly_public, compatibility date 2026-11-04, .open-next/worker.js, .open-next/assets, self-service binding, workers_dev=true, observability disabled. No account ID, paid resources, R2/KV/Images binding, database migration hook or Supabase secret. No Supabase values are needed for this preview.

Free fit: final bundle is below the current 64 MiB uncompressed limit; 27 filesystem assets (Wrangler reports 32 entries), largest 954341 bytes, below 20000 assets/25 MiB each. Free has 100000 Worker requests/day, 10 ms invocation CPU, 128 MB memory and 1-second startup limit. Those runtime/traffic limits are not proven by a local dry run. Cloudflare recommends a custom domain for business-critical production; workers.dev is suitable for this initial non-critical preview, without purchasing anything now.

Sources checked 7 November 2026:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- https://developers.cloudflare.com/pages/framework-guides/nextjs/
- https://developers.cloudflare.com/workers/platform/limits/

## SEO launch settings and owner actions

1. Approve a public foundation preview separately from backend/customer-intake readiness. Confirm a real contact channel and factual service availability if this is intended as a business launch.
2. Authorize Cloudflare login later (`npx wrangler login` locally, not passwords/tokens in chat) or use the authorized dashboard integration. Confirm the account subdomain and final Worker hostname.
3. Set SITE_URL to that exact HTTPS origin in Cloudflare **build** variables. Set SITE_INDEXING_ENABLED=true only when indexing is approved. These are nonsecret build settings. Rebuild: metadata routes are prerendered; changing runtime variables alone cannot update them.
4. Before publication, inspect the built canonical, robots.txt and sitemap.xml for that real origin. Private outlines remain noindex and excluded. Crawler directives do not secure data; future real admin/data/file endpoints require authentication and private storage separately.
5. Review this local diff and earlier audit/CI work. No branch has been pushed or merged by this task. Approve the specific branch/commit to publish and the hosting action explicitly.
6. After approved deployment, smoke-test the real HTTPS hostname, security headers, mobile interaction and edge CPU/startup/errors. Then verify ownership in Google Search Console and submit /sitemap.xml if desired. Google indexing/rankings cannot be guaranteed. No Search Console submission has been made.

SEO targets are expressed honestly through Bengaluru/Bangalore location, custom FDM printing, prototype/practical/personal categories, STL and PLA/PETG context. No keyword-stuffed hidden text, new service claims, customer reviews, address or hours were added. A richer approved portfolio/social image and distinct service pages remain optional future content work.

## Accessibility and performance measurements

Cached Lighthouse 13.6.0 and axe-core were used without adding dependencies. Local Workers runtime, headless Playwright Chromium, software SwiftShader. These are **lab results**, not field Core Web Vitals or a guarantee of real-device frame rate.

| Mobile Lighthouse, first visit including entry screen | Measured result |
|---|---|
| Performance | 51/100 |
| Accessibility | 100/100 |
| Best practices | 96/100 |
| SEO | 60/100; noindex/robots disallow deliberately reduce this score |
| FCP | 1.8 seconds |
| LCP | 4.0 seconds |
| Total blocking time | 1610 ms (not INP) |
| CLS | 0.013 |
| Speed index | 10.5 seconds |

Evidence: artifacts/prelaunch-lighthouse-mobile.report.html and .report.json. Lighthouse flagged one console network error: favicon.ico 404. That asset has since been fixed and targeted browser verification passed on the final build; the above Lighthouse scores were **not** remeasured after that fix. Do not relabel best practices as 100. Unused JavaScript estimate was 58 KiB, with main-thread/bootup and forced-reflow observations. No unrelated optimization was made.

Desktop Lighthouse (entry-bypassed) was attempted but did not produce a report in the prolonged run and was stopped. Desktop performance score is unavailable; do not claim a desktop Lighthouse pass. Neither desktop nor mobile has real-user INP or field p75 LCP/CLS data before publication. A future approved deployment needs edge and real-device measurements, not just localhost timing.

Settled axe WCAG 2/2.1/2.2 A/AA scans: **zero detected violations in 13 route/viewport states**: home/admin/track/404 at desktop, tablet and mobile, plus the entry dialog. An initial scan during the hero's finite opacity animation reported contrast; after waiting for animations and fonts to settle, it did not recur. No colors or animation timing were changed. Automated scans are not a full manual accessibility certification. Keyboard skip/menu Escape behavior passed across the exact viewport matrix; modal skip/escape are covered by the existing browser suite.

Synthetic clipboard checks passed for successful copy and permission-denied fallback; no enquiry was sent. Screenshot: artifacts/prelaunch-quote.png.

Software WebGL frame sample after settled audit: 33 frames over roughly 3 seconds; mean interval 91.38 ms, p95 316.6 ms. Initial busy-environment sample mean 101.83 ms, p95 516.6 ms. These are slow and do **not** demonstrate a smooth hardware-rendered experience. JS heap dropped from 20996892 to 14728840 bytes during the short settled sample; garbage collection and that short interval cannot establish absence of memory leaks. Code inspection confirms observer/listener cleanup, demand rendering, capped DPR, shared geometry and disposal; a long-session hardware profile remains outstanding. Evidence: artifacts/prelaunch-measurements.json and prelaunch-measurements-initial.json.
