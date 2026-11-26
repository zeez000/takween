# Stage 1 release candidate — 26 November 2026

Selected URL: https://takween-labs-preview.abdzeez000.workers.dev/
Owner selected the existing free hostname. Keep Worker/account subdomain unchanged. No URL is guaranteed permanent if its hosting account or resource is removed. Use this same URL for Instagram and Google Business Profile after approved deployment verification; printed QR codes should encode it directly only after final live checks.

## Scope and verified changes

Manual contact is server-rendered, works without JavaScript and fails closed if configuration cannot load. All active contact links use mailto:takweenlabs.in@gmail.com. Operational forms remain gated. No website delivery claim is made: the visitor must send from their email application. Previous isolated Resend/Gmail receipt was owner-confirmed, not evidence of live website sending. Real email sending remains disabled.

Approved T contours and licensed bundled font produce public/takween-social.png (1200x630, 55793 bytes). OG and Twitter large-image metadata include descriptive alternatives. Local production Worker delivery passed desktop/mobile tests. Actual platform cards require post-deployment verification and may be affected by robots restrictions or platform caches.

No animation implementation, schema, Resend provider, production gates or hosting configuration changed. Existing imagery and planned service disclosures remain truthful; unavailable specifications cannot be replaced with invented values. No verified social account URL or full business address/hours was supplied. Organization structured data remains valid; LocalBusiness eligibility/address/hours must be verified before adding richer local-business claims. No indexing activation authorized.

## Verification

Lint, TypeScript, 93 unit tests, Next/OpenNext build and Wrangler dry run passed. Focused browser suite: 24 passed. Four updated entry/reduced-motion contact cases: passed. Full final browser run pending in artifacts/stage1-final-browser.log. Earlier broad run exposed stale assertions for the removed public name field, new large-image card and second verified email link; updated expected behavior without weakening animation assertions.

## Deployment safety and rollback

Owner confirmed Cloudflare repository integration disconnected and Supabase automatic production deployment OFF. Existing workflow has read-only contents and no automatic production deployment; inspect final diff before pushing. Draft PR #7 targets codex/combined-release. No merge required to deploy an explicitly approved source SHA.

Read-only deployment inventory recorded active Worker version 610954de-4d69-43dc-9389-99d7bc47d2a4 at 100 percent, deployment 726fbe94-ef5e-46a4-bd09-05e15bb09027 (2026-11-07). Refresh immediately before deployment. Rollback requires approval and verification that this version/assets remain available.

Follow docs/TWO_STAGE_RELEASE_PLAN.md: clean approved SHA; verify account/current version; build:preview with SITE_URL above, SITE_INDEXING_ENABLED=false and every enquiry/operations/notification gate false; Wrangler dry run; local Worker checks; explicit owner approval before wrangler deploy. Never deploy local disposable Supabase bindings or .dev.vars. After deployment verify HTTPS, actual T/gear, manual contact, share asset/favicon, robots/noindex and inactive private endpoints.

## Remaining release gates

Final browser/visual review, sanitized diff review, checkpoint and fresh GitHub CI; exact release SHA approval; live checks after approved deployment. Physical phones, Instagram in-app browser, platform share cards and customer mail-client delivery are not verified by browser emulation. Full operational commercial activation remains separately gated on hosted backup/migrations/MFA and owner business decisions.

Final local results: 65 browser tests passed; 13 existing conditional browser/project skips. Fresh lint and TypeScript passed. No privileged-token patterns found in 15 changed/new source/documentation files. No source changes to T, gear, operational QuoteForm or migrations.
