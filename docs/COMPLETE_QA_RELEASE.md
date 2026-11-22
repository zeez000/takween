# TAKWEEN LABS — release QA and CI repair

22 November 2026. Repository zeez000/takween, branch codex/combined-release, draft PR #4 targeting master. This review extends ded0223. No merge, deployment, DNS change, real email, database change or indexing activation was performed.

## Decision

**GO for draft PR and visual review. NO-GO for the public .com launch. Hold the public preview update pending mobile performance and owner visual sign-off.** Functional regressions pass, but direct-hero mobile startup remains slow and actual enquiry delivery has not been verified. Passing CI does not close those gates.

## Findings and disposition

| ID | Priority | Evidence and impact | Action/status |
|---|---|---|---|
| CI-01 | Important | Run 45002097690 combined repeated key actions and visual comparisons inside 60s. Captures took 653–715ms; visible drag and strict reset assertions passed before the eventual cumulative timeout. | Fixed in ded0223 by separating independent keyboard-limit coverage. No assertion weakened. |
| CI-02 | Important | Parallel push run 45011693059 passed the hero cases but failed native wheel scrolling. Trace showed scrollY 593 → 601 → 621 while initial hash navigation was still moving. | Fixed test preconditions: fonts ready, instant initial story positioning, desktop renderer ready, pointer on story. Same native wheel and >200px assertion. |
| PERF-01 | Critical for current .com sign-off | Three direct-hero mobile samples: scores 45/46/47, LCP 6.8–7.4s, TBT 3.7–4.7s. Shared 3D startup and first render are expensive. | Open. No unsupported claim of optimization or 90+ performance. Do not remove either approved animation to improve a score. |
| EMAIL-01 | Critical before advertising automatic delivery | Mocked provider-backed acceptance, errors and retries pass. Sender/credentials and Gmail inbox receipt were not verified. Local deployed-style configuration returns 503. | Sending remains disabled. Manual mailto contact works. Follow the controlled real-delivery procedure in COMBINED_RELEASE.md before enabling. |
| DEP-01 | Important | Fresh npm audit: 11 moderate entries, 0 high/critical. Two underlying advisories propagate through lint/build chains. | Open dependency maintenance; no force upgrade/downgrade. No remotely exploitable production path confirmed. |
| REVIEW-01 | Important | Browser emulation and screenshots pass; no physical phone, hardware GPU, battery, thermal or extended memory-soak evidence. | Owner visual review and representative Android/iPhone tests remain required. |
| DOMAIN-01 | Important | Public preview is deliberately noindex; no .com hostname/configuration was approved or connected. | Confirm owned hostname, canonical/redirect/TLS plan and separately approve indexing/publication. |
| UX-01 | Optional for foundation preview; important before commercial launch | Services/materials and unconfirmed capabilities are truthful, but printer dimensions, turnaround, prices, portfolio and formal customer-data policy are not finalized. | Do not invent these details. Confirm owner data and privacy/retention terms before collecting real enquiries. |

No additional application-source defect was reproduced in the customer journeys below. Working source, approved T and original gear were left unchanged. This is not a guarantee that no undiscovered defects exist.

## Checks actually executed

| Check | Actual result |
|---|---|
| ESLint / TypeScript | Passed after new test changes |
| Unit suite | 28 passed, including the real configured 10s provider abort with mocked transport |
| Repeated affected browser tests | 15/15 passed: five runs each of hero visual drag/reset, keyboard limits, story wheel |
| Full Next production browser suite | 43 passed, 9 existing project-specific skips, zero failures |
| Fresh Next production build | Passed, Next 16.4.5 Turbopack, 10 generated pages including dynamic /api/enquiry |
| Clean isolated Linux npm ci | Passed; official Node 24.11.1 archive SHA-256 checked |
| OpenNext production build | Passed, @opennextjs/cloudflare 1.20.16 |
| Wrangler dry run | Passed, 4938.08 KiB raw / 1046.28 KiB gzip; no upload/deployment |
| Native local workerd test | Passed on Windows and Linux: mocked provider, five 202s then two 429s |
| Full suite against fresh local OpenNext Worker | 43 passed, 9 existing skips, zero failures |
| Firefox applicable suite against local Worker | 17 passed, 9 Chromium-specific/duplicate matrix skips |
| Axe WCAG 2 A/AA + 2.1 AA | Zero automated violations in 9 combinations: Chromium/Firefox/WebKit × desktop/mobile/landscape, reduced motion |
| Common private paths on local Worker | /.env.local and /.git/config 404; /api/upload 404 |
| Disabled enquiry on local Worker | POST with correct configured Origin returns 503, not accepted |
| Git ignore / tracked secret-pattern scan | .env.local, .env.production.local, .dev.vars ignored; only .env.example tracked; no high-confidence private-key/provider-token pattern found in tracked files scanned |
| Public preview, read-only | Three GETs: homepage/robots/sitemap 200 over HTTPS; noindex,nofollow, Disallow: /, empty sitemap |

The complete viewport matrix covers 1920×1080, 1440×900, 1366×768, 1280×720, 390×844, 375×667, 360×800, 430×932, 768×1024, 1024×768 and 844×390. Separate active-Chromium hero checks cover seven requested viewports. Landscape checks require every gear control fully in view and operate Reset.

The nine existing skips cover Chromium-only CDP/active-WebGL checks and duplicate viewport matrices in the other project. They were not introduced to hide a failure. Native touch events are injected in Chromium; the WebKit story scroll check uses programmatic scrolling. Do not describe that WebKit check as a real swipe. WebKit automation is not a physical iPhone/Safari certification. Axe does not substitute for manual screen-reader, contrast and usability review.

## Customer journeys

- Navigation, skip link, keyboard focus, mobile menu open/close, Escape focus return, service/process/material anchors and internal route targets pass. No horizontal overflow in the matrix; diagnostic test finds no page/console/request failures on its checked routes.
- Form quantities 1, 10 and 10000 submit to mocked acceptance. Empty/zero/negative/fraction/10001 are blocked by browser validity; server tests also reject malformed numeric strings including NaN and exponent notation.
- A delayed request disables submission. A second submit event cannot issue another request. Simulated network failure keeps inputs and offers a draft/mailto fallback; retry reuses the idempotency UUID. A fake 200 {ok:true} cannot show acceptance; only 202 with accepted status and provider ID does.
- Provider rejection, malformed result, failed network, actual configured abort, filled honeypot, incorrect origin/content type, invalid JSON, unsupported fields and streamed size bypass are covered. Native bindings enforce the tested local request limit. Cloudflare limits are approximate/per-location, not a global quota or billing cap.
- File selection explicitly says local only. Invalid extension and empty/oversized selection are rejected in local validation; no file bytes are uploaded. This is not secure file-content inspection and must not be reused as the future upload security boundary. Generic ZIP, uploads, authentication, tracking, payments and database writes remain inactive. Admin/tracking pages are public explanatory placeholders, not authenticated operational screens.
- The active contact is mailto:takweenlabs.in@gmail.com. The browser can verify the link, not guarantee that the customer's operating system has an email app configured.

## Preserved animations

Git diff against original f0d27a8 is empty for assembly-experience.tsx, mechanical-scene.tsx and assembly-timeline.ts. The separately approved narrow landscape CSS accommodation remains. The T outline, material, depth, lights, layer gaps, drag, reset and motion source have no changes in this QA stage.

Chromium tests exercise visible hero pixel change after dragging, exact reset within unchanged pixel tolerances, native touch/scroll separation, keyboard increments/clamps, gear forward/reverse explosion, framing, zoom, drag/reset and fallback/reduced motion. These checks do not measure long-term GPU memory leakage or physical-device frame rate.

## Performance evidence

Lighthouse 13.6.0, fresh Windows Next production build at /#hero-title, headless Chromium, three sequential samples per preset. No physical device or field INP/CWV measurement. No before/after improvement is claimed: application rendering was not changed in this repair. Earlier scores from different Worker/build/host conditions are not an equivalent baseline.

| Preset | Scores | LCP | TBT | CLS |
|---|---|---|---|---|
| Mobile | 47, 45, 46 | 6.80, 7.36, 6.83s | 3866, 4749, 3719ms | .0118 |
| Desktop | 73, 75, 77 | 1.34, 1.38, 1.20s | 544, 487, 437ms | .00053 |

The first mobile bootup audit attributes ~2.55s scripting to the 881KB uncompressed shared Three/R3F chunk, ~1.46s to the 229KB React chunk and ~1.54s to the 37KB application scene/control chunk (Lighthouse's simulated timing). The trace's largest actual FunctionCall is the R3F render scheduler (~538ms); another is the original assembly's WebGL capability probe (~381ms). An additional 4× CPU-throttled profiler diagnostic observes two canvases on direct-hero entry and zero with reduced motion. That diagnostic is not an equivalent Lighthouse before/after test or a GPU execution benchmark.

Evidence narrows the problem to startup/runtime evaluation and early graphics initialization/rendering; it does not isolate one safe code change that would guarantee the same appearance and preload behavior. The original gear already shares resources, instances bolts, uses demand rendering and generates its environment once. Reducing mesh detail, environment lighting or reapplying the previously rejected gear preload change would conflict with preservation requirements. None was silently applied. Next work should isolate cold graphics initialization on real mobile hardware and test candidate scheduling/resource changes with pixel/interaction equivalence before approval. Performance remains unfinished.

## Security and release configuration

Only the existing server route consumes the email environment. Supabase helpers have no active page/upload/auth call sites; there is only proposed SQL in this checkout, not a live applied backend. No SQL, storage or auth settings were changed. No credential values were printed or included in evidence.

Fresh audit advisories: [glob GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), published 27 October 2026, affects 9.0.0–14.0.1, patched 14.0.2; [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), published 27 October 2026, affects >=7 <11.0.1, patched 11.0.1. Installed paths are OpenNext/node-minify/glob and typescript-eslint/minimatch. A production dependency label does not establish request reachability: no customer-controlled glob pattern or filesystem walk endpoint was found. Major-version override changes need separate compatibility testing. The secret scan is targeted, not a forensic full-history certification.

Wrangler retains ENQUIRY_ENABLED=false and SITE_INDEXING_ENABLED=false with the existing preview canonical URL. Local testing uses a distinct Worker name and local-only runtime. CI has read-only contents permission and no deploy step. No secrets are needed for the mocked tests. Actual account quotas, Cloudflare billed CPU and Resend delivery were not tested. No paid service was enabled.

## Evidence and next actions

Committed screenshots and compact machine-readable results are in qa-evidence/. Raw traces, CPU profiles, Lighthouse reports, local harnesses and test screenshots are under ignored artifacts/ci-fix/. The public three-GET check confirms the old sliced hero remains live; this branch's T has not been deployed.

1. Review the desktop, mobile and short-landscape captures and PR changes.
2. Resolve mobile startup performance with equivalent rendering and representative device evidence; do not treat green functional tests as performance sign-off.
3. Verify an owner-controlled Resend sender, configure the server-only secret securely, and explicitly approve a single synthetic delivery test. Confirm provider delivery event and Gmail Inbox/Spam receipt. Never paste keys into chat. Sending remains off until that gate is approved.
4. Review dependency updates and customer privacy/retention terms before a commercial enquiry rollout.
5. Choose the actual owned .com origin and approve publication/indexing separately. No domain or DNS was changed here.

The final remote CI result is reported from the pushed commit's Actions runs, not inferred from these local passes. Historical failed runs remain historical failures.
