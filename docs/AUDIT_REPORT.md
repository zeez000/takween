# Takween engineering audit — 5 November 2026

## Scope and preservation

Audit-only changes: documentation, roadmap, independent Playwright audit config/tests,
GitHub Actions. No src files, package versions, database schemas, RLS policies or
working design/animations/form functionality changed. Work performed in a managed
checkout outside OneDrive; original local development server remains on port 3000.
No saved cloud environment was available. No Defender exception or disabling needed.
Windows process-directory and PowerShell-directory mismatch initially placed new
audit files in the original checkout; verified copies were moved to the isolated
checkout and only the generated originals removed. No application files affected.

## Findings

Critical: no demonstrated critical runtime vulnerability in tested frontend.
Major launch blockers: Supabase integration, secure uploads, admin authentication,
real quotation persistence and order tracking do not exist. /admin and /track are
explicit public feature outlines; they expose no business records or mutation API.
This is not evidence of implemented backend authorisation. Live business launch
must wait for approved implementation and actual access-control integration tests.
Major performance concern: Lighthouse performance 76, below blueprint target 90.
Initial-page LCP 3.2s and TBT 660ms miss the requested targets. CLS 0.013 passes
0.1 target. Recommendations only: review main-thread work (3.7s), unused JS (58KiB
estimated savings), legacy JS (14KiB estimated savings) and forced reflow traces.
No animation or styling optimisation was applied without owner approval.
Minor: README's original Git setup text predates the existing GitHub repository.
Generated next-env.d.ts switches dev/production type paths; do not hand-edit it.

## Dependency advisories

npm audit: eight MODERATE affected development-tool nodes, all tracing to
minimatch denial of service via globparts amplification (GHSA-g3hv-75wg-m249).
Affected: minimatch, @typescript-eslint/typescript-estree, @typescript-eslint/parser,
@typescript-eslint/utils, @typescript-eslint/type-utils,
@typescript-eslint/eslint-plugin, typescript-eslint and eslint-config-next.
npm audit --omit=dev reports ZERO production vulnerabilities. This does not mean
build tooling is risk-free: avoid untrusted lint inputs and review compatible
upstream remediation separately. No npm audit fix --force or version overrides.
ESLint 9 is deprecated upstream; a supported toolchain upgrade is a recommendation.

## Backend/schema inspection

Only supabase/schema.proposed.sql and supabase/README.md exist. No versioned
migrations, SDK, client, API routes, live credentials or actual connection.
All 18 proposed public tables enable RLS, with no policies/grants defined.
This is a deny-by-default design, not a verified application authorisation layer.
No schema applied. Updated timestamps, idempotency, upload validation state,
retention, immutable accepted quotes, stock locking and tracking/session boundaries
need refinement before migration approval. See SUPABASE_PLAN.md.
Files stay local today. Extension/size checks are UX validation only, not secure
content validation. No server upload endpoint exists to attack or test yet.
Commercial rates are absent; no automated quotation formula to validate.

## Executed validation

- Clean npm ci in isolated checkout: PASS; lockfile unchanged.
- npm run check: lint, TypeScript, all 5 unit tests, production build PASS.
- Expanded Playwright audit: 3 passed in Chromium, Firefox and WebKit; each iterates
  1920x1080, 1366x768, 768x1024, 390x844 and 320x640, checks overflow, initial heading,
  focus, navigation, quote form, broken images, runtime console/network errors,
  /admin and /track and captures actual screenshots plus Resource Timing JSON.
- WebKit initial-link Tab behavior depends on Safari keyboard preferences; explicit
  focus is checked there. Chromium/Firefox assert native Tab focus. This limitation
  is documented rather than changing correct application navigation.
- Lighthouse CLI on isolated production port 3210: performance 76, accessibility
  100, FCP 1.2s, LCP 3.2s, TBT 660ms, CLS 0.013, transfer 284KiB. JSON lives in
  artifacts/lighthouse.json. Initial entry-page run, simulated throttling/software
  environment; not a physical-device benchmark or full 3D FPS/memory certificate.
- Original regression-suite outcome recorded below after completion.

## Still blocked or limited

Live Supabase connection, real RLS/storage tests, authenticated admin/customer
cross-access and actual order records: NOT IMPLEMENTED / NOT TESTED. No fake mocks
claimed as live security verification. No environment credentials requested in chat.
Physical iPhone/GPU 60 FPS, long-duration memory leak profiling, INP field data,
archive validation and malicious server upload tests remain unverified.
Basic automated accessibility 100 and keyboard checks are not a full manual WCAG
certification. Browser evidence is generated under ignored test-results/; CI uploads
it even on failure. Do not claim GitHub CI passed until its actual run completes.

## Deployment assessment

Current routes prerender successfully, but no static export configured or tested.
GitHub Pages is at most a static preview candidate; no output:export alteration
was made. Future secure intake/auth requires server logic; preserve Next.js runtime.
A commercially permitted Node.js hosting plan plus approved Supabase project is
a straightforward compatible architecture. Compare actual limits/costs before
selection. Vercel Hobby is restricted to personal non-commercial use, so not a
suitable assumption for this business. No paid service or deployment created.
Sources: https://vercel.com/docs/plans/hobby
https://supabase.com/docs/guides/getting-started/api-keys
https://supabase.com/docs/guides/storage/security/access-control

## Local startup

Original Windows folder remains unchanged in operation:
Set-Location "C:\Users\user\OneDrive\Documents\ChatGPT\takween"
npm.cmd run dev
Open http://127.0.0.1:3000 or http://localhost:3000 (both previously verified HTTP200).
Keep that terminal running; closing it stops the server. npm ci only when installing
or restoring dependencies, not concurrently with an active server.

Audit checkout: C:\Users\user\.codex\worktrees\takween-audit\takween.
Use a separate port when previewing audit checkout; never displace the user's 3000.
Backend work waits for explicit schema/security approval described in SUPABASE_PLAN.md.
Original production regression suite: 22 passed, 2 Chromium-specific scenarios intentionally skipped in WebKit. Real WebGL transforms and CDP native touch gestures passed in Chromium.
