# System release review — 26 November 2026

Base reviewed: a7b8db3a4ba45ff8c590d6d56abc26acb89ad488 on
codex/business-operations-sprint; resumed from local checkpoint 20144d3.
Hosted aggregate reconciliation checkpoint: e4ebef6. This is a local release
review, not approval to deploy. The frozen hosted 001–011 SQL remains unchanged.

## Fresh evidence

- Clean starting checkout; remote combined-release remains 2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57.
- Repository release-checks workflow has read-only contents permission, build,
  tests and Wrangler dry-run; no deploy/publish step. External dashboard settings
  require current owner confirmation before the authorized push.
- Twelve targeted existing database tests passed again.
- Added connected order regression: the stored-enquiry/approved-quotation fixture
  becomes an accepted order; a private estimate and reservation link to it;
  duplicate consumption retry deducts once; failed-print/reprint consumes actual
  material twice; quality-check/completion retains quotation and estimate snapshots;
  terminal orders reject further stock consumption; finance remains independent
  of estimates/stock observations. All four scheduling/finance tests pass.
- Fresh npm audit reports 11 moderate, zero high/critical advisories. Affected
  packages: glob/minimatch, node-minify, OpenNext AWS/Cloudflare, typescript-eslint
  and its parser/plugin utilities. Applicability review is complete in
  SYSTEM_RESOURCE_REVIEW.md: two underlying glob/minimatch advisories in tooling,
  no proven customer-controlled runtime path. No blanket major-version override.

## Resumed review evidence

- Actual disposable PostgreSQL/Auth/PostgREST integration: **22 groups PASS**,
  including non-owner/AAL1 denial, real TOTP AAL2, concurrency/rollback, stock and
  reservation serialization, reversals/exports and notification snapshot retries.
- Fresh full unit suites: **93 PASS, 0 fail, 0 skip** (29 general + 64 operational).
- Fresh lint and TypeScript checks PASS. Application source and dependencies did
  not change during the resumed review; prior Next/OpenNext/dry-run and public
  regression evidence remains applicable. No redundant production rebuild made.
- Added actual connected browser journey: **desktop Chromium PASS, 2.6 minutes**.
  Public form stores enquiry with explicitly unconfirmed email; owner login/MFA,
  contact profile, manual quotation/PDF/acceptance/order, estimate, machine,
  reservation, 100g consumption, printing/quality/ready/completion, manual income
  and linked job costing all use the same stored order. Expected INR 3.07 quoted
  and income, 100000mg consumed, INR 219.00 estimate snapshot are asserted.
- The new journey initially hit the shared 30/min owner limiter; deliberate
  65-second pauses now model cross-module operation without bypassing it. New
  test locator/currency-prefix mistakes were corrected, not application behavior.
  No existing test assertions/timeouts or rate limits were weakened. The full
  journey has its own 240-second budget including two fixed rate-limit windows.
- Initial visual matrix: all 14 business views passed on desktop 1440×900,
  tablet 768×1024 and Pixel 7 Chromium phone emulation; no page errors/overflow.
  Expanded run **PASS: 42/42 per-view axe WCAG2A/AA/2.1AA checks**, with full-page
  plus viewport images and UI-load timings. Desktop 23.7s, tablet 19.2s, phone
  37.5s (each test excludes the runner's preceding limiter pause). Desktop,
  tablet and phone contact sheets were visually reviewed for all 14 views;
  no overlapping controls or horizontal clipping found. This is sampled visual
  state coverage, not every form/error combination or physical-device approval.
- Five read-only RPC timing samples per kind completed against real local SQL;
  ranges and resource interpretation are in SYSTEM_RESOURCE_REVIEW.md.
- Diff against combined-release confirms no changes to public homepage, T/gear,
  styling, enquiry form or Resend code. All six tracked activation/indexing gates
  remain false. All eleven frozen package hashes match the manifest and Git HEAD.

Evidence: artifacts/system-review-real-integration.log,
system-review-final-units.log, system-review-final-lint.log,
system-review-final-types.log, system-connected-journey.log,
system-review-all-views-accessibility.log, system-query-timings.json,
system-review-{desktop,tablet,mobile}-*.png and *-timings.json. Artifacts stay
ignored; failure traces can contain synthetic credentials and must not be pushed.

Reproduce with the existing disposable runtime and fresh local owner fixture:
set TAKWEEN_LOCAL_INTEGRATION=1 and TAKWEEN_LOCAL_SUPABASE_STATUS to the ignored
local status JSON, then `node scripts/test-system-release-review.mjs`.
The runner serializes tests and respects limiter windows. It does not provision,
migrate, restart services or contact hosted infrastructure.

Evidence: artifacts/system-review-targeted.log, system-review-journey.log,
system-review-audit.json. Existing sprint evidence is in BUSINESS_OPERATIONS_SPRINT.md;
its results are historical unless explicitly rerun here.

## Owner workflow guide

1. Sign in with the invited owner identity and verify the authenticator. AAL1 or
   non-allowlisted identities cannot access private operations.
2. Review the enquiry and referral consent. Edit the customer profile only with
   authority to do so; this does not change an issued quotation snapshot. Notes
   remain append-only. Enquiry email is a notification, not the authoritative record.
3. Record real equipment and material receipts. Use the stock ledger for actual
   consumption/waste. Production material observations are a separate record:
   entering a production observation does not deduct inventory automatically.
4. Enter explicit internal cost assumptions. Waste adds material; margin means
   profit divided by target price, not markup. The estimate is neither a quotation
   nor actual revenue. Enter reviewed prices, taxes, entity, terms and validity
   separately in the quotation workspace.
5. Approve and record issuance/acceptance with evidence. Convert the accepted
   quotation once to an order. Reserve a compatible active machine using the
   browser-local date/time inputs, which are persisted in UTC.
6. Record actual stock use with a note identifying the attempt. If quality fails,
   return to printing/machining using the permitted state transition and record
   additional material actually consumed. Do not reuse the earlier consumption
   request as a new attempt. There is no dedicated failed-print costing wizard.
7. Complete quality review, mark ready/completed and update the reservation's
   outcome separately. Order completion does not silently close reservations.
   Cancellation likewise requires review of outstanding reservations and costs.
8. Record actual income/expenses manually. Correct finance errors with an explicit
   reversal; original history remains. Stock cost, production observations and
   internal estimates do not automatically become expenses or verified payments.
9. Keep catalogue entries private drafts. Asset references do not upload or fetch
   media; rights notes require owner review before any future publishing approval.
10. Export only necessary selected records. Private JSON exports are limited to
    25 records and audited. Save outside Git/shared folders. Downloaded copies
    cannot be revoked by logging out; apply the approved retention policy.

If storage succeeds but refresh fails, reload the view rather than submit another
record. An uncertain response should be retried unchanged with the retained request
ID. Logout/tab hiding clears private displayed data; refresh after returning.

## Release checklist and remaining review

- [x] Complete connected desktop browser journey against actual disposable Supabase.
- [x] Inspect/capture all 14 business modules at desktop, tablet and phone sizes;
      retain earlier commercial/owner journey coverage and fresh connected desktop proof.
- [x] Finish advisory applicability and bounded local query/resource analysis;
      hosted CPU, large-scale load and long-duration memory behavior remain unverified.
- [ ] Verify external Cloudflare/Supabase automation remains disabled before push.
- [ ] Push only sprint branch, create draft PR to combined-release and verify CI.
- [x] Keep public homepage/animations byte-identical; preserve all disabled gates.

## Hosted activation and recovery checklist

Use HOSTED_ACTIVATION_PACKAGE.md and HOSTED_SUPABASE_PREPARATION.md for exact
001–011 package hashes, aggregate inventory SQL, protected backup commands and
manual signup instructions. Never push the moving sprint migration directory as
the frozen package. Review 012–015 separately. Migration 015 refuses an unexpired
notification lease; shut down dispatch and review old uncertain records before
application. Do not rewrite existing migration history or reset hosted data.

- [x] Owner confirms zero Auth users/identities/MFA and zero Storage buckets/objects;
      uninitialized TAKWEEN is not proof that all managed schemas contain no data.
- [ ] Approve encrypted backup destination outside Git/OneDrive and recovery targets.
- [ ] Export with PostgreSQL 17, TLS verification and hidden password prompt.
- [ ] Back up actual Storage blobs separately if any; SQL contains metadata only.
- [ ] Restore into an isolated disposable environment with outbound SMTP/jobs disabled;
      review managed-schema compatibility, counts, constraints, grants and Auth recovery.
- [ ] Approve invitation-only signup configuration, owner allowlist and MFA recovery.
- [ ] Review each additive migration, run security checks and synthetic hosted tests
      only after separate write approval. Preserve records on failure; use forward fixes.

Environment checklist: verified NEXT_PUBLIC_SUPABASE_URL and publishable key at
build time; matching server SUPABASE_URL and encrypted SUPABASE_SECRET_KEY;
owner-approved privacy version/notice; exact SITE_URL/origin; native rate binding.
Keep OPERATIONS_ENABLED, BUSINESS_OPERATIONS_ENABLED, PERSISTENT_ENQUIRIES_ENABLED,
ENQUIRY_NOTIFICATIONS_ENABLED, ENQUIRY_ENABLED and SITE_INDEXING_ENABLED false until
their separate activation approvals. Resend needs a verified sender and sending-only
encrypted key; no real email is authorized here. Never deploy the local loopback build.

Physical-device checklist: iPhone Safari and Android Chrome login/MFA, keyboard,
rotation/landscape, scrolling, long forms, downloads, back navigation and tab hiding;
ordinary-laptop frame pacing and WebGL recovery. Emulation does not complete these.

Business launch checklist: contracting entity, tax treatment, quotation validity/
terms, acceptance evidence, real costs/equipment, Fateen authority/consent, privacy,
retention/export custody, backup operator, incident/MFA recovery, sender-domain
verification, monitoring and free-plan CPU/usage headroom. No invented rates or policies.

## Owner review and remaining limitations

The owner interface is a long stacked workspace. Select a Business view and load
records; opening a record reveals its form/history. Commercial and enquiry search
are separate. Large UUIDs in movement/audit histories require cross-referencing;
friendlier history labels and section shortcuts are optional usability follow-ups,
not new features implemented by this review. Date inputs use browser timezone.
Reports are manual observations; no payment reconciliation or tax-profit claim.

Rapid operations can legitimately exhaust the shared limiter; wait a minute and
reload. Do not remove the limiter or resubmit a confirmed mutation merely to
refresh. The connected test proves a functional path, not every combination or
long-running operator behavior. Existing negative/concurrency tests supply the
complementary failure coverage. Fresh matrix uses Chromium emulation, not physical
iPhone/Android or a new Safari certification. No hosted backup/restore has run.

Ready for local owner review; **not authorized for push or hosted activation**.
Remaining owner actions: current external automation confirmation before push/PR;
protected backup destination/operator and successful isolated restore; separate
001–011 migration approval; signup/owner/MFA recovery decisions; later synthetic
hosted testing and production gates. See FRESH_HOSTED_BASELINE_RUNBOOK.md for the
exact staged commands. 012–015 are reviewed locally but outside the hosted package.
