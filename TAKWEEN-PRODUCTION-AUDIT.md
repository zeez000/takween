# TAKWEEN LABS — production-readiness audit

Date: 22 November 2026. Decision: **NO-GO for the requested .com launch with the latest layered T and reliable Resend enquiries.** Further development and release reconciliation are required. A domain alone does not resolve these defects. Existing foundation preview remains online.

## Sources and scope

Inspected local codex/hero-layered-t at base 4be226869043ed8ed7d23ac7494da5eb4573d02e plus preserved uncommitted hero/test changes. Remote refs were read without checkout, fetch, push or merge. Remote codex/resend-enquiry-form is 52a62bcecc667dcdf7f09bd18640acb1bf92043a. Its enquiry handler and form were read through GitHub at that exact SHA. master remains f0d27a8579a96b2312b0a6441ae7d4a34798cdf4. Live content matches the newer email form and older hero, but exact deployed commit identity is not established from public HTML.

No deployment, Google indexing, domain purchase, production mutation or live email was performed. Local application source unchanged in this audit. A test-only regex correction was evaluated in an isolated copy under ignored artifacts; it is not an implemented repository route fix. The current branch does not contain that route, so copying or merging the entire email implementation would risk overwriting unrelated work.

## Findings, ordered by priority

| ID | Class | Finding and evidence | Required action |
|---|---|---|---|
| C1 | Critical | Remote email quantity regex is /^\\d+$/ rather than /^\d+$/. Exact handler mock returns 400 for valid quantity "1", zero Resend calls. In fact matching strings cannot also yield a valid integer. | Correct the route on its owning branch, add valid/boundary/invalid tests, rebuild and verify approved deployment. Critical here means launch-blocking functionality, not a critical security exploit. |
| C2 | Critical | Receipt through Resend to takweenlabs.in@gmail.com is NOT verified. Live claims enquiries are emailed, whereas local branch is draft-only. Provider acceptance and inbox delivery have no evidence. | After C1, verify sender configuration and controlled owner-approved message, Resend delivery event and recipient receipt. Do not equate HTTP 200 or provider acceptance with inbox receipt. |
| C3 | Critical | Requested release is split across branches. Live has one old .part-stack and zero .hero-emblem; local renders the T. Deploying hero branch alone would replace the live email form with a draft form. | Prepare a reviewed release combining only verified changes, with tests for actual sending behavior and T. No merge performed. |
| I1 | Important | Honeypot/elapsedMs filter returns 200 {ok:true} without sending. Client treats any 2xx as sent, clears input. Mocked fast valid request reproduces false success. | Define truthful rejection/acceptance states. Avoid losing legitimate fast/autofill enquiries. Honeypot can remain an anti-bot mechanism, but do not claim verified delivery. |
| I2 | Important | No actual rate limiter in inspected remote route. Origin/Host check and client-supplied elapsedMs/honeypot do not limit scripted same-origin-looking requests. | Add durable rate limits, quota controls, optional challenge verification, idempotency and bounded provider timeout before public sending. No high-volume testing performed. |
| I3 | Important | Body cap trusts Content-Length then calls request.json(). Missing or inaccurate length is not a bounded byte read. | Enforce a streamed byte cap independently of header, validate schema and reject excess fields/files. Preserve text-only email escaping. |
| I4 | Important | Sender hardcoded to onboarding@resend.dev. Official Resend production guidance requires a verified sender domain. Real account/domain/provider status is unknown. | Configure verified From domain and server-only RESEND_API_KEY through Cloudflare secrets. Gmail can remain To; user email stays Reply-To. Never request secrets in chat. |
| I5 | Important | Local OpenNext packaging attempt failed with missing .next/standalone/.next/server/pages-manifest.json using --skipNextBuild. Normal Next build alone lacks packaging prerequisites. | Run the full OpenNext build (which prepares its Next output) in an isolated checkout or maintenance window, preferably supported Linux/WSL, then Wrangler dry run and runtime tests. Do not fake manifests. |
| I6 | Important | Direct-hero performance remains poor despite good intro-entry scores. Saved Lighthouse reports: direct mobile/desktop 56/56, TBT 4430/1790ms. | Profile repeat visits/hash entry and simultaneous scenes, repeat matched benchmarks and test real mobile hardware. Intro-entry score does not certify active WebGL speed. |
| I7 | Important | No confirmed .com domain, active DNS zone, apex/www redirect strategy or TLS binding; canonical currently workers.dev. | Confirm owned hostname, inspect existing DNS/email records, configure approved Worker Custom Domain and canonical at build/runtime, verify HTTPS/redirects/assets. |
| I8 | Important | CI workflow directory absent locally. Current audit reports 11 moderate dependency entries, zero High/Critical, rooted in glob/minimatch tooling advisories. Runtime exploit path unproven. | Add least-privilege CI checks in release branch; assess compatible tooling updates and bundle reachability. Avoid npm audit fix --force downgrades. |
| I9 | Important | No approved privacy/confidential-design/retention process evidenced for public intake. Preparing-to-launch language and unconfirmed Fateen capabilities remain. | Approve truthful service readiness and privacy/retention terms before collecting designs or selling. Keep backend operations inactive until verified. |
| O1 | Optional | CSP absent, while frame DENY, nosniff, referrer and permissions policies are configured. | Test report-only CSP and then enforce without breaking Next/3D. No current XSS was demonstrated. |
| O2 | Optional | Observability disabled; rollback not rehearsed in this audit. | Establish privacy-conscious delivery/runtime monitoring and tested known-good rollback before scaling. |

## Actual homepage and customer experience

Live HTTPS homepage returned 200. Chromium captures at 1440x900, 390x844 and 768x1024 had no horizontal overflow, pageerror events or failed requests in the navigation/capture session. Live hero still uses the old sliced shape. New local hero has genuine extruded original contours, matte crimson layers, reduced depth, frontal lighting, front-centred +/-12-degree idle motion, clamped manual rotation and exact zero-pose reset after easing. Reduced-motion/WebGL fallback is a traced SVG, not the old object. Lower cinematic assembly remains unchanged.

Local production browser suite passed navigation, mobile menu, keyboard navigation, links/images, metadata, active T viewport matrix, visible drag/reset, native touch horizontal rotation/vertical page scroll, reverse assembly scrolling, entry bypass, fallback and draft behavior. Local T fits seven requested viewport sizes. These are emulation tests, not physical iPhone/Android certification. Owner visual approval remains pending. GPU memory soak, battery, field INP and actual low-end phone frame pacing were not measured.

Business copy identifies custom plastic FDM, PLA/PETG and Bengaluru. It says preparing to launch, does not establish a confirmed operational turnaround, build volume, pricing or metal capability. Do not invent those. Fateen capability status remains unconfirmed. Contact destination is correct in remote route and visible live text, but seeing the address is not a delivery test. Quote/order/admin/payment functionality is not operational. The live page explicitly says design uploads are unavailable. Local file selector only validates a file locally and says no upload; its 25 MiB draft limit is not the approved future 30 MiB/file, 3 files, 50 MiB combined contract.

## Enquiry verification

Exact remote POST handler was transpiled in an isolated harness and called with Request objects and a dummy key, replacing global fetch with a mock. No real credential or email transmission occurred.

| Case | HTTP / provider calls | Result |
|---|---|---|
| Exact remote source, otherwise valid quantity 1 | 400 / 0 | Confirmed validation bug |
| Exact remote source, elapsedMs 500 | 200 ok / 0 | Confirmed false success behavior |
| Test-only regex correction, valid input | 200 / 1 mocked call | Proposed correction passes isolated check |
| Corrected copy, mocked Resend 429 | 502 / 1 mocked call | Provider error handled |
| Corrected copy, negative quantity | 400 / 0 | Invalid input rejected |

Live form exposes Send enquiry and a hidden honeypot. A first browser script expected the local draft button and failed on live; that failed comparison uncovered the branch mismatch. No live submit was then attempted. Existing local draft tests therefore cannot certify the deployed Resend implementation. No inbox access, Resend dashboard events, live secret values, verified sender domain, actual key permissions, live rate-limit bindings or production branch hash were verified. No passwords or keys were requested or printed.

## Security and deployment assessment

Only .env.example is tracked among .env files. Ignore rules cover env files, local bindings and generated output. Supabase helpers use publishable credentials; server helper is server-only. No auth/order/upload endpoints in this local App Router. Proposed schema is unapplied, not a security-tested business backend. Historical Git secret scanning and live RLS/storage policies are unverified. Source absence is not proof that a different deployed branch has no endpoints.

The inspected remote route uses plain-text email with a fixed destination and Reply-To, validates lengths/material/email and uses 403/413/415/400/502/503 errors. Provider errors log status only. Its missing sender-domain validation, body streaming cap, real throttling and idempotency are important. An SDK is not required to integrate Resend; this remote code uses direct fetch. Absence of the resend npm dependency alone would not prove no integration.

Current Wrangler targets takween-labs-preview with explicit account, nodejs_compat, self-reference and static assets, no public .com route. Worker Free compatibility cannot be certified from the Node build or this static configuration; validate real bundle size, startup and invocation CPU budget. No billing/account/DNS settings were modified.

Cloudflare Custom Domains support the current architecture and require an active owned Cloudflare zone. Cloudflare creates DNS/certificates for the binding. No Pages migration or forced static export is needed. Inspect existing CNAME/MX/TXT first. Plan a distinct production environment/Worker to preserve preview, align self-reference binding and canonical host, test apex/www redirection and cache behavior. Keep SITE_INDEXING_ENABLED=false until separate explicit authorization. Changing runtime SITE_URL alone does not regenerate prerendered metadata.

## SEO

Fresh live results contain noindex,nofollow, workers.dev canonical, robots Disallow /, empty sitemap. HTTPS loads. Local regression tests verified title, JSON-LD, favicon/social metadata and private-route exclusions. These remain preview settings, not public discovery readiness. For approved .com indexing later: rebuild canonical, Open Graph URLs, robots and sitemap for the chosen origin; keep admin/track excluded. Authentication/private storage, not robots, must secure future records. No indexing enabled.

## Executed checks and limitations

| Check | Result / evidence |
|---|---|
| Lint | Fresh PASS |
| TypeScript | Fresh PASS |
| Unit | Fresh 9 PASS |
| Local desktop/mobile browser | Fresh 33 PASS, 7 intentional skips, ~1.3 minutes; saved artifacts/hero-refinement/results.json |
| Visible rotation/reset | PASS in fresh full suite, pixel and state checks |
| Live browsing | PASS basic rendering/overflow at three sizes; no captured pageerrors/network failures, live-results.json |
| Live layered T | FAIL: oldStack=1, layeredT=0, live-inspection.json |
| Enquiry email delivery | FAIL readiness / actual inbox delivery UNVERIFIED; mocked route bug confirmed |
| Production Next build | Previously passed same application source; fresh rebuild not run because preview interruption rejected |
| OpenNext | FAILED attempted --skipNextBuild packaging with missing standalone manifest |
| Wrangler dry run | NOT RUN because packaging failed |
| Dependencies | Fresh npm audit 11 moderate, zero high/critical, npm-audit.json |
| Performance | Saved production local Lighthouse measurements, not rerun in this audit; no live field CWV |

Saved performance runs from earlier on 22 November: normal intro entry mobile 89, LCP 2.8s, TBT 300ms; desktop 99, LCP .7s, TBT 50ms. Direct-hero entry mobile/desktop 56/56; mobile had a slow-CPU warning. These are single lab runs and different entry paths, not matched before/after regression proof or live-user Core Web Vitals. No fresh live Lighthouse or field CrUX claim.

Automatic approval review rejected stopping port 3100 because the owner had required it remain running. No workaround was used to stop it. A fresh Next rebuild/full OpenNext cycle needs an isolated build directory or approved interruption. Existing public Worker never changed. The --skipNextBuild packaging attempt may refresh ignored .open-next output, so do not deploy that output.

## Prioritized development checklist

1. Correct and test quantity validation on the email branch. Fix silent-success handling; add actual rate limiting, bounded body parsing, timeout/idempotency and verified sender configuration.
2. Perform a controlled end-to-end Resend test with provider event and owner inbox confirmation, including failure path. Configure secrets only in environment/Cloudflare secret settings.
3. Reconcile hero and email changes in a reviewed release without losing either; add tests matching the actual form. Obtain logo screenshot approval.
4. Profile direct-entry/return-visitor WebGL performance and test real devices.
5. Confirm exact .com, canonical host, DNS and rollout strategy. Preserve preview and noindex until separately approved.
6. Run clean production Next + full OpenNext builds, local Worker runtime, Wrangler dry run and release browser tests. Add CI, monitor runtime/email failures and verify rollback.
7. Approve privacy/service wording. Keep file uploads, automatic quotations, admin, order tracking and payments inactive until separately implemented and tested.

## References

- Resend Next.js integration, API key and verified sender domain: https://resend.com/docs/send-with-nextjs
- Worker Custom Domain requirements and certificate/DNS handling: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Remote handler reviewed at immutable commit: https://github.com/zeez000/takween/blob/52a62bcecc667dcdf7f09bd18640acb1bf92043a/src/app/api/enquiry/route.ts

## Artifacts and changes

This audit adds TAKWEEN-PRODUCTION-AUDIT.md and ignored artifacts/final-launch files: live-inspection.json, live-results.json, live-1440.png, live-390.png, live-768.png, remote-enquiry.ts, resend-mock-results.json, proposed-enquiry-regex-fix.patch, npm-audit.json and harness scripts. The handler copy and patch are evidence/proposed remediation, not application integration. Prior source/test work and reports preserved. No application fixes, branch checkout, push, merge or deployment performed during this pass.
