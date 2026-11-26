# System release review — 26 November 2026

Base reviewed: a7b8db3a4ba45ff8c590d6d56abc26acb89ad488 on
codex/business-operations-sprint. This is an in-progress release review, not an
approval to deploy. The frozen hosted 001–011 package remains unchanged.

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
  and its parser/plugin utilities. Advisory-level production reachability remains
  to be completed; package severity alone is not runtime exploitability proof.

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

- [ ] Complete the end-to-end journey against actual disposable Supabase and
      browser interfaces; the new connected test currently uses embedded PostgreSQL.
- [ ] Inspect/capture every owner module at desktop, tablet and phone sizes.
- [ ] Finish advisory applicability, query efficiency, CPU/memory and usability review.
- [ ] Verify external Cloudflare/Supabase automation remains disabled before push.
- [ ] Push only sprint branch, create draft PR to combined-release and verify CI.
- [ ] Keep public homepage/animations byte-identical; preserve all disabled gates.

## Hosted activation and recovery checklist

Use HOSTED_ACTIVATION_PACKAGE.md and HOSTED_SUPABASE_PREPARATION.md for exact
001–011 package hashes, aggregate inventory SQL, protected backup commands and
manual signup instructions. Never push the moving sprint migration directory as
the frozen package. Review 012–015 separately. Migration 015 refuses an unexpired
notification lease; shut down dispatch and review old uncertain records before
application. Do not rewrite existing migration history or reset hosted data.

- [ ] Review aggregate Auth/Storage counts; uninitialized TAKWEEN is not empty project.
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
