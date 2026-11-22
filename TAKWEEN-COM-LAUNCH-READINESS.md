# TAKWEEN LABS — .com launch readiness

Review date 22 November 2026. Repository zeez000/takween. Working branch codex/hero-layered-t, base commit 4be226869043ed8ed7d23ac7494da5eb4573d02e. Existing uncommitted source, tests, reports and artifacts preserved. No source modifications were required during this continuation. No push, merge, deploy, DNS change, live database operation or purchase occurred.

## Verdict

Ready for owner visual review of the local foundation preview. NOT yet approved for a .com public launch or full commercial launch. Hero implementation passes functional and rendered-image checks, but direct-entry performance remains unresolved, domain and production routing are unspecified, the final Worker artifact has not been rebuilt/validated during this continuation, and visual approval is pending. Backend business operations remain deliberately unavailable.

## What was already fixed and verified again

The home hero renders HeroEmblem instead of PartVisual. The old part-stack and part-layer nodes are absent from the hero. Original PartVisual source is retained unused; the separate lower scroll-controlled assembly is intentionally retained. Local replacement does not change the deployed website.

The approved contour coordinates remain intact. Genuine extruded meshes use thinner depths, small bevels, matte crimson faces and lighter side illumination. Idle motion is upright, front-centred, about +/-12 degrees over a 24-second cycle. Manual yaw is bounded to +/-0.6 radians and pitch to +/-0.25. Handoff uses the displayed pose, interpolation smooths movements, reset targets zero pitch/yaw, and settled manual mode stops its timer. After interaction the model stays manual until remount, including after reset; automatic resume is not implemented. Reduced motion and WebGL failure use the traced static SVG.

## Visual test root causes and resolution

Earlier forced SwiftShader tests captured slowly or timed out. PNG byte equality was also an unsuitable visual oracle. The saved fix uses full Chromium with its normal graphics backend, direct compositor capture, decoded RGB comparisons and polling for reset convergence. Visible rotation must change more than 3% of pixels above a 16-channel threshold. Reset must return below 0.5% changed pixels and mean channel difference below 0.5. The yaw state must also be zero, and keyboard bounds are tested. This checks rendered output rather than only React state.

The prior full run before the usage block passed 33 tests with 7 intentional skips and no failures in 101.99 seconds. This continuation reran all hero cases: 5 passed, 3 intentional skips, zero failures in 20.8 seconds. One hero case proves the old sliced DOM is absent. Active WebGL checks cover 360x800, 390x844, 430x932, 768x1024, 1366x768, 1440x900 and 1920x1080. Touch rotation, vertical scrolling and no-WebGL fallback passed. iPhone project is emulated WebKit, not physical iPhone Safari. No physical devices, battery benchmarks, long GPU-memory soak or exhaustive assistive-technology audit were performed.

Lint, TypeScript and all 9 unit tests passed again during this continuation. Production Next build passed before interruption on the same application source. No application source changed since that build. OpenNext build, current Worker runtime dry run, Cloudflare authentication, account billing status and .com TLS/DNS are NOT freshly verified. Do not infer these from next build.

## Performance evidence

Single local production-mode Lighthouse runs, not field Core Web Vitals or a controlled regression study.

| Entry | Mobile score / LCP / TBT | Desktop score / LCP / TBT |
|---|---|---|
| Normal homepage /, fresh intro | 89 / 2.8s / 300ms | 99 / 0.7s / 50ms |
| Direct hero /#hero-title, intro bypass | 56 / 3.6s / 4430ms | 56 / 1.8s / 1790ms |

The direct-entry mobile run warned that the CPU was slower than expected. Normal-entry runs had no warnings. Intro measurements do not certify active 3D performance. Direct entry reveals substantial main-thread cost and may expose the lower assembly earlier; the specific contribution of each scene has not been isolated. Before launch, profile repeat visitors and hash entry with one scene at a time, measure on actual mobile hardware, and repeat interleaved runs. Preserve visuals while investigating. No performance fix was applied under this readiness review.

## Current security and operational findings

| Priority | Finding / impact | Required action |
|---|---|---|
| Important | npm audit now reports 11 moderate package entries, zero High/Critical. Two root advisories concern glob cancellation and minimatch amplification. Initial registry request stalled, bounded retry returned valid JSON. Nonzero audit exit reflects advisories. | Assess compatible tooling patches and Worker bundle reachability. No public-input exploit proven; do not force npm downgrade. |
| Important | .github/workflows absent in this checkout. | Add least-privilege checks in a separately approved change, require passing review before merge. |
| Important | .com hostname/ownership, DNS and apex/www strategy are unspecified; current SITE_URL points to workers.dev. | Confirm exact owned domain and canonical host before infrastructure edits. |
| Important | Latest hero is uncommitted and local, no current OpenNext/dry-run evidence. | Review source, rebuild Worker, run dry run and runtime regressions, obtain publication approval. |
| Important | Supabase helpers exist, while schema is proposed only and operations are inactive. | Keep quote submission/uploads/admin/tracking/payments disabled. Do not market them as available. |
| Low | CSP absent; DENY/nosniff/referrer/permissions protections configured. | Design and test a report-only CSP before enforcement. No present XSS exploit demonstrated. |
| Low | Observability disabled and rollback not rehearsed. | Agree privacy-conscious monitoring, retention and known-good Worker rollback procedure. |

Only .env.example is tracked among .env files. Ignore rules cover private env, local Wrangler bindings and generated artifacts. Supabase browser helper requires a publishable key; server helper imports server-only. No privileged credential was printed or introduced. This is not an exhaustive history-secret scan or verification of live Supabase RLS/storage. The proposal enables RLS without application policies; do not apply it as production-ready backend architecture.

The form creates a local draft and opens mailto:takweenlabs.in@gmail.com, not a server submission. Admin and tracking routes are honest public outlines. Owner-approved privacy/file-confidentiality/retention and commercial terms remain necessary before collecting designs or orders. Existing preparing-to-launch and unconfirmed Fateen wording should remain until actual operations are confirmed.

Read-only production checks returned HTTP 200, noindex/nofollow, robots Disallow / and empty sitemap. Google indexing remains disabled. No indexing toggle changed.

## .com deployment path, proposed only

Keep OpenNext + Cloudflare Workers; no Pages migration or static export is required. Cloudflare Custom Domains require an active owned Cloudflare zone and a Worker. Cloudflare creates the DNS record and certificate for that custom-domain binding. Inspect existing CNAME/MX/TXT records before changes and preserve email DNS. Confirm apex or www as canonical and explicitly redirect the alternative after approval. Do not bind or overwrite an occupied hostname.

Prefer separately named production Worker/environment to preserve the current preview. Keep its self-reference binding aligned with the chosen Worker name. Configure SITE_URL=https://<verified-canonical-host> at BUILD time and runtime, since metadata/robots/sitemap are prerendered. Keep SITE_INDEXING_ENABLED=false until separately approved for indexing. Rebuild, verify noindex/canonical, test custom host HTTPS/assets/contact/redirects/security headers and private-route behavior. Never use real secrets in NEXT_PUBLIC settings; inactive frontend preview does not require privileged Supabase credentials.

Workers Free currently lists 100,000 dynamic requests/day and 10ms CPU budget per invocation. Static asset delivery has separate accounting. These limits do not prove this OpenNext bundle meets runtime budgets. Domain registration/renewal has separate cost and is not a free hosting benefit. No domain selected, purchased or configured. Preserve workers.dev preview/noindex during rollout; a domain binding alone does not improve performance or activate business services.

## Sources verified during this review

- Cloudflare Custom Domains, updated 12 Nov 2026: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare limits: https://developers.cloudflare.com/workers/platform/limits/
- Next November security release, 3 Nov 2026: https://nextjs.org/blog/november-2026-security-release . Installed Next 16.4.5 matches the fixed release named by this advisory; do not call it affected solely because the advisory exists.
- glob: https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- minimatch: https://github.com/advisories/GHSA-g3hv-75wg-m249

## Files in the local hero change set

- src/app/page.tsx — swap hero component only.
- src/components/hero-emblem/outline.ts — original traced contours.
- src/components/hero-emblem/emblem-scene.tsx — extrusion, lighting and motion.
- src/components/hero-emblem/hero-emblem.tsx — loading, fallback, bounded input and reset.
- src/components/hero-emblem/hero-emblem.css — existing hero panel controls/presentation.
- tests/browser/hero-emblem.spec.ts — rendered pose, reset, bounds, touch, fallback and viewport checks.
- tests/browser/home.spec.ts — reduced-motion expectation for the T.
- tests/browser/assembly.spec.ts — wait for native touch inertia before scripted position assertion; no assembly application change.
- playwright.config.ts — normal full Chromium backend and matching production environment loader.

Previously created TAKWEEN audit Markdown reports remain untouched. This continuation adds this report and ignored test/performance artifacts. Saved hero test output now represents the focused rerun rather than the earlier full 40-case run.

Review artifacts in artifacts/hero-refinement: desktop-front.png, mobile-front.png, front.png, side-angle.png, idle-drag-reset.webm, results.json, visual-results.json, lighthouse-home-mobile.json, lighthouse-home-desktop.json, lighthouse-mobile.json, lighthouse-desktop.json and npm-audit-launch.json. Desktop/mobile/front/side captures are from the same unchanged application build before interruption.

## Approval gates

1. Owner approves desktop/mobile/default/side logo appearance.
2. Investigate direct-entry performance and confirm acceptable real-device usability.
3. Confirm exact .com ownership, canonical hostname and launch scope (foundation only versus operational business).
4. Validate final OpenNext artifact and runtime, dependency plan, monitoring and rollback.
5. Obtain explicit push/merge/deploy approval. Enable indexing only under separate explicit approval.
