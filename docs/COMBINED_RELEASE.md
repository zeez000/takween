# Combined release — implementation and verification

Date: 22 November 2026. Local release branch: codex/combined-release, based on 4be226869043ed8ed7d23ac7494da5eb4573d02e with all existing local hero work preserved. No merge, push, deployment, domain purchase/binding or indexing change.

## Implemented

- Reconciled email transport with the existing layered T without replacing homepage sections or losing local enquiry drafts/file selection.
- POST /api/enquiry delegates to a dependency-injected handler tested on Node and workerd. Correct integer regex accepts string quantities 1–10000, rejects fractions, exponent notation, negatives, zero, malformed values and excessive integers.
- Only provider 2xx with a nonempty message id produces HTTP 202 with status accepted. Client requires that exact contract. It says accepted by email provider, not inbox delivery. Old 200 {ok:true}, provider failures, spam and network failures never show acceptance.
- Removed elapsed-time rejection of legitimate fast submissions. Filled honeypot returns 422, not false success. Same-origin validation rejects cross-site requests. This is not authentication and cannot stop scripts forging Origin.
- Native Cloudflare rate bindings: 5 requests/60s per hashed Cloudflare-provided IP and 30 requests/60s site key. Missing/failed binding, missing IP, disabled switch, sender or secret fails closed. Only CF-Connecting-IP is trusted within Cloudflare; no X-Forwarded-For fallback.
- Actual request bytes capped at 16 KiB, even with omitted or false Content-Length. UTF-8 decoding and JSON/schema validation reject malformed input, extra fields and attached-file data. All email content is plain text with fixed recipient takweenlabs.in@gmail.com.
- Provider request has a 10-second timeout and Resend Idempotency-Key. Same form content reuses its UUID in the current browser component for retries; this is not cross-device or permanent deduplication. Provider idempotency lasts 24 hours. Customer inputs survive errors.
- RESEND_FROM_EMAIL is server-only configurable raw email, never invented. Resend test-domain senders are rejected. No service key uses NEXT_PUBLIC. ENQUIRY_ENABLED=false by default; no real provider key has been installed.
- Native rate limits are approximate per Cloudflare location, NOT a strict worldwide budget. They and the honeypot provide basic abuse resistance, not a guarantee against distributed spam. Before activation confirm namespace IDs 31001/31002 do not conflict with existing account bindings and monitor provider quota. A stronger challenge/global quota remains an option if abuse requires it; no paid services or new database introduced.
- Existing lower-assembly 50% stage loading optimization retained. It fixes verified premature initialization. No T outline, extrusion, material, lighting, drag or reset changes in this implementation.
- Linux CI workflow checks install, lint, types, units, OpenNext, dry run and browser regressions. No deployment step or real secret. Workflow prepared locally; GitHub execution is not claimed.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| Lint / TypeScript | PASS | npm run lint, npm run typecheck |
| Unit | 27 PASS | npm test, including valid quantities, provider errors, spam, per-IP/site failures, origin, malformed/non-JSON and byte-limit bypass |
| Clean Linux install | PASS | npm ci using locked dependencies in /tmp/takween-combined-release-20261122 |
| Next production | PASS | Next 16.4.5 Turbopack, 10 pages including dynamic /api/enquiry |
| OpenNext | PASS | Complete Linux build, fresh .open-next/worker.js |
| Wrangler dry run | PASS | No deployment; 4938.24 KiB raw / 1046.31 KiB gzip |
| Actual local Worker | PASS | workerd port 8788, actual OpenNext bundle, both bindings connected |
| Browser | 38 PASS / 8 intentional skips | Chromium plus emulated iPhone WebKit, artifacts/release/combined-browser-results.json |
| Handler + native rate binding | PASS | Local-only test harness, first 5 requests 202 then requests 6–7 429; provider mocked |
| Production fail-closed | PASS | Actual OpenNext endpoint wrong origin 403; correct origin with sending disabled 503 |
| T visible drag/reset | PASS | Decoded-pixel rotation/reset assertions in full browser suite |
| Visual captures | PASS measured comparison | Four captures identical dimensions and zero channel differences greater than 16 against prior T images |
| Actual provider/inbox delivery | UNVERIFIED | No real email sent, no provider credentials used |
| GitHub CI execution / deployment | NOT RUN | Local branch only |

The clean Linux runtime was downloaded from nodejs.org and verified against the matching official SHA-256 checksum. It is temporary and did not change OS packages. Initial Windows/junction and transient WSL attempts failed or were interrupted; only the clean Linux build above is the successful evidence. No Windows failure was papered over by fabricated manifests or removing sharp. Original port 3100 retained; combined local Worker is http://localhost:8788/ . Ports 3101/3102 are earlier isolated performance baseline/candidate servers, not this combined release.

Browser email-success tests intercept transport with a mocked 202 response; unit and native-workerd harness separately test the handler. This verifies contracts and rate bindings, not actual provider credentials. Rate harness is under ignored artifacts and is never the deployment entrypoint. It uses dummy configuration and mocked fetch only.

## Performance and visuals

See TAKWEEN-PERFORMANCE-REPORT.md for profiling and matched prior measurements. Confirmed cause: hero and below-fold lower assembly initialized together on direct hero entry. Observer now loads the latter when half the sticky stage is visible. Matched prior desktop scores improved 68–72 to 89–94, mobile 52–53 to 55–57. Mobile remained slow. These were small lab comparisons with documented host activity, not field guarantees.

Fresh combined local Worker measurements are in artifacts/release/lighthouse-desktop.json and lighthouse-mobile.json. These use Linux-built Turbopack output and workerd, so do not directly compare them to earlier webpack/Next-server baselines as proof of a regression or improvement. No real mobile hardware, field CWV/INP, battery or long GPU-memory soak verified. New captures and recording are in artifacts/release: desktop-front.png, mobile-front.png, front.png, side-angle.png, idle-drag-reset.webm, visual-comparison.json and visual-results.json.

## Manual steps before actual sending

1. Review and approve this release's source/screenshots and intended spam/rate policy. Preserve public preview until release approval. Do not apply live secrets/bindings as part of this document.
2. Verify a sender domain in the owner's Resend account using its supplied DNS records. Confirm account/domain status and authorized From address. The To recipient remains takweenlabs.in@gmail.com. Do not send from a made-up Gmail/domain address or onboarding@resend.dev.
3. Store RESEND_API_KEY only in ignored local .dev.vars for an isolated test or Cloudflare encrypted secret settings for a separately approved release. Never paste it in chat, commit it, put it in NEXT_PUBLIC or use it in browser JavaScript. Set RESEND_FROM_EMAIL to the verified raw sender email through server environment settings.
4. In that isolated test environment set SITE_URL to its exact browser origin and ENQUIRY_ENABLED=true. Keep SITE_INDEXING_ENABLED=false. Ensure native binding names and unused namespace IDs match Wrangler. Do not bypass missing bindings or substitute a process-local production limiter.
5. With explicit approval to send one synthetic email, submit quantity 1 through the actual browser form. Confirm server returns 202 accepted with a provider id. Inspect the corresponding message in Resend, confirm delivery event, and have the owner check Gmail Inbox and Spam. Provider acceptance alone does not confirm receipt. Do not save customer content, secrets or signed URLs in test evidence.
6. Test valid quantities 10 and 10000 with mocks unless additional actual emails are approved. Simulate provider rejection/timeout locally; verify inputs remain, no accepted message appears, and retry keeps the same idempotency key. The existing tests cover these paths automatically.
7. Review the provider's retention, privacy and free-account quotas, and approve customer data handling before activation. Native distributed limits are not a billing hard cap. No paid upgrade is authorized.
8. Before an approved .com rollout, confirm exact owned canonical hostname, safe DNS changes, TLS, cache/redirect behavior and a rollback target. Rebuild metadata with SITE_URL and keep indexing off until separately approved. No domain is selected or configured by this release.

## Remaining release gates

- Actual verified sender, configured credential and owner-confirmed inbox delivery remain unverified. Email stays disabled by default.
- Mobile direct-hero startup and real-device usability still require performance sign-off.
- Owner visual approval, privacy/retention review, exact .com configuration and final publication approval remain pending.
- Existing moderate build-tool advisories remain recorded; no untested forced upgrade/downgrade performed.
- New CI is unrun on GitHub. Local automated checks do not substitute for human release approval.

Status: GO for local review/testing of the combined release; NO-GO for public .com rollout until these gates close.

## Changed release files

Core new implementation: src/lib/enquiry-handler.ts, src/app/api/enquiry/route.ts, tests/enquiry-delivery.test.ts, tests/browser/enquiry-delivery.spec.ts.
Integration: src/components/quote-form.tsx, package.json, .env.example, wrangler.jsonc, .github/workflows/release-checks.yml.
Preserved hero release work: src/app/page.tsx, src/components/hero-emblem/*, src/components/assembly/assembly-experience.tsx, tests/browser/hero-emblem.spec.ts, tests/browser/home.spec.ts, tests/browser/assembly.spec.ts, playwright.config.ts.
Documentation: this file plus existing audit/performance reports retained. Ignored artifacts contain harnesses, temporary builds, captures and measurements. No secret-bearing files staged or committed.

References:
- Cloudflare native limit accuracy and binding syntax: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Resend idempotency behavior and 24-hour window: https://resend.com/docs/dashboard/emails/idempotency-keys

## Final combined Worker measurements

Fresh local workerd /#hero-title samples: desktop score 74, LCP 0.3s, TBT 590ms; mobile score 50, LCP 5.1s, TBT 3030ms. Mobile Lighthouse warned that host CPU was slower than expected. These are single local measurements, not field CWV or an apples-to-apples comparison to earlier webpack/Next-server results. They do not support mobile performance approval. Profile shared renderer initialization on representative devices before release.

Portable native-binding smoke test is now part of the release: npm run test:worker starts a local-only workerd with mocked transport, verifies five 202 responses followed by two 429 responses, and stops its own test process. No real email/secret, Worker upload or external API call is used. CI includes this test. Test implementation is under tests/worker and scripts/test-worker.mjs.

Final-source follow-up: clipboard fallback text was corrected so a lost provider response does not lead to a claim that nothing was sent. The exact final application source was rebuilt through Linux Next + OpenNext, and Wrangler dry run passed again (4938.25 KiB raw / 1046.31 KiB gzip). Earlier full-suite browser evidence remains in the tool log; the email-only follow-up report may overwrite the reporter JSON. Generated nested .wrangler output is excluded from lint and Git; no lint rule was disabled for application code.
