# Local business operations sprint

Owner scope confirmed 26 November 2026, based on combined-release
2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57. Work branch:
codex/business-operations-sprint. No pushes, hosted migration, deployment,
email, publishing or activation authorized by local implementation.

Dependency order:

1. Material inventory and append-only filament receipt/consumption ledger.
2. Private machines/status and append-only maintenance observations.
3. Internal draft cost estimates: material/waste, electricity, labor, overhead
   and profit margin. All rates explicitly entered; never automatic quotation.
4. Scheduling and job costing against existing orders/resources; preserve order
   transitions, completed-record rules and private histories.
5. Expenses and recorded (not invented) profitability summaries.
6. Draft catalogue/owner product management, never public publishing or uploads.
7. Owner summaries from actual stored records, not synthetic production metrics.
8. Customer management and audited authorized private exports.

Use additive local migrations after 011, AAL2/current owner authorization,
deny-by-default RLS and narrow RPCs. Serialize inventory/scheduling writes,
validate quantities/currency, use retry receipts/version checks and append-only
audit events. Preserve the public form, T/gear, lighting/loading/gestures exactly.
No arbitrary privileged browser clients or new paid infrastructure.

Hosted review stays frozen at 001-011 until separately approved. Later migrations
in this branch are not included in scripts/prepare-hosted-migration-package.mjs.
Each checkpoint reports tests and limitations. Do not claim hosted readiness or
physical-device coverage based on embedded tests/browser emulation.

## Implemented local modules

| Priority | Stored behavior | Owner view |
| --- | --- | --- |
| Inventory | Private PLA/PETG batches, optional acquisition price, integer-milligram receipt/consumption ledger, optimistic versions, locked nonnegative balances and optional order linkage | materials / movements |
| Machines | Actual owner-entered equipment, printing/machining category, active/maintenance/retired status, next service date, append-only maintenance observations | machines / maintenance |
| Costing | Immutable internal estimates with explicit material, waste, electricity, labor, overhead and target margin inputs; exact integer-paise arithmetic | estimates |
| Scheduling/job cost | UTC reservations against actual nonterminal orders and compatible active machines, serialized overlap protection, cancellation/completion; estimates, material consumption and manual income/expense shown separately | scheduling / job_costs |
| Finance | Manual income/expense entries and append-only reversing entries; one reversal per original, transactional audit/retry receipts | finance |
| Draft catalogue | Private draft products/options, versioned edits/archive, rights-review notes for optional asset references; no assets fetched/uploaded and no publishing operation | products / variants |
| Summaries | Stored income, expenses, recorded surplus, inventory totals, reservations, order counts, contact/draft counts and overdue service records | reports |
| Contacts/exports | Versioned owner-maintained profiles, append-only notes, no Auth accounts or automatic identity merging; selected page JSON exports, maximum 25 distinct records, explicit warning and audited request | customers / customer_notes; materials, finance, orders exports |

These are local operational foundations, not public activation. No sample prices,
tax rates, machines, manufacturing capacity or production revenue are seeded into
the application. Tests use synthetic records in a disposable local stack only.
The public homepage, layered T, gear, enquiry form and Resend implementation are
unchanged. OwnerDashboard imports and renders the separate private workspace.

## Migrations and security boundaries

- 012: materials, material_movements, machines, machine_maintenance,
  cost_estimates, business_receipts and business_events; exact calculation helper
  and guarded list/command RPCs.
- 013: job_schedule and finance_entries; lock-compatible machine reservations,
  reversible manual finance, private reports/choices and per-order observations.
- 014: products, product_variants and customer_notes; additive customer version/
  archive columns; private catalogue/contact RPCs and selected audited exports.
- 015: immutable notification content at first claim, protecting existing Resend
  idempotency payloads against later CRM edits. Existing sender/dispatcher code,
  leases, fencing, retry window and real-sending gates are unchanged. Migration
  refuses active unexpired notification leases. Old attempted pending/expired
  leased jobs without retained content become uncertain for manual review; their
  original payload cannot safely be reconstructed. New retries use the retained
  first-claim snapshot. Retention/erasure must include this private PII snapshot.

Migrations 001-011 have not been edited. New migrations were applied only to the
existing named disposable local PostgreSQL/Supabase environment. Broad inherited
default grants are explicitly revoked on every new object. All new tables have
RLS; only enabled allowlisted AAL2 owners can read them. Receipt ledgers have no
client read policy or direct mutation grant. Commands require current owner AAL2,
serialize retry UUIDs, verify payload equality/actor and append an audit event in
the same transaction. Private helper functions are not anonymous/service RPCs.

The new `/api/operational/business` endpoint requires BOTH OPERATIONS_ENABLED and
BUSINESS_OPERATIONS_ENABLED, exact same-origin requests, native Worker rate
limiting, strict UTF-8/JSON, a streamed 20,000-byte cap, authentic Supabase identity
and current database AAL2 authorization. It has private/no-store responses and
noindex headers. Browser code uses no privileged credentials. The existing shared
30/minute owner limiter is retained; multi-action workflows may need a pause.
Cloudflare tracked settings and .env.example keep BUSINESS_OPERATIONS_ENABLED=false.
Only ignored local test bindings temporarily enable it on loopback port 8798;
email/notifications/indexing remain false there too.

Private fetches use generation tickets plus aborts, clear displayed records and
form drafts on hide/unmount/logout, reject stale responses and clear the parent
workspace on even non-JSON authorization failure. An unconfirmed command retains
its retry UUID. Confirmed storage followed by failed refresh is explicitly shown
as stored, with a do-not-resubmit warning. Export responses are validated before
download; exports are JSON (no spreadsheet formula evaluation), selected/bounded,
explicitly authorized and never automatically retried. Export audit/receipts store
IDs/counts rather than duplicating customer content. Downloaded files cannot be
revoked: owner must protect/delete them under the eventual retention policy.

## Arithmetic and operational meaning

Inputs are explicit; zero must be entered intentionally. Grams accept at most
three decimals and become integer mg; INR accepts two decimals and becomes paise.
Material = ceil(mg * price-per-kg-paise * (10000 + waste-bps) / 10000000000).
Electricity = ceil(watts * minutes * paise-per-kWh / 60000).
Labor = ceil(minutes * paise-per-hour / 60). Base adds these and overhead.
Internal target = ceil(base * 10000 / (10000 - margin-bps)); margin is profit /
target, not markup. Margin is at most 99%. SQL numeric and browser BigInt paths
are tested for parity. Maximum stored amount is 9,000,000,000,000 paise. Aggregate
money is returned as integer strings and formatted without Number precision loss.

No estimate becomes a quotation, tax invoice or confirmed selling rate. No stock
movement automatically creates a finance expense. Manual income is not verified
payment. Recorded surplus is income less expenses, not accounting/tax profit.
Linked estimate snapshots are not summed as actual cost or counted twice. Machine
reservations do not advance production states; later maintenance does not silently
delete reservations. Product rights notes are review records, not rights proof.
Customer profile edits do not rewrite immutable quotation snapshots or send email.

## Recovery and release boundaries

Do not apply 012-015 to hosted Supabase as part of the frozen 001-011 package.
Review them separately after local acceptance, backup/restore and migration
approval. Never reset or rewrite an applied migration ledger to force a rerun.
The local integration runner checks exact migration content while accepting LF or
CRLF variants for cross-platform checkouts. It does not update existing hashes.

Operational rollback is gate-off plus preservation of records/audits; prefer an
additive corrective migration. There is no destructive down/reset script. Keep
old application compatibility, receipt history and backup checkpoints. New
private helpers preserve old commercial/enquiry RPCs and delegate existing actions.

Pending owner decisions: real material/machine entries and maintenance cadence,
actual costing rates, expense/accounting and retention policies, export custody,
approved catalogue descriptions/assets/rights and hosted activation. No tax/entity,
Fateen authority, payment, public stock availability or automated fulfilment policy
is inferred. Physical Android/iPhone testing and hosted backup/restore remain
unverified. See HOSTED_ACTIVATION_PACKAGE.md for the independent hosted gates.

## Verification evidence — 26 November 2026

| Check | Result / artifact |
| --- | --- |
| Full npm test | 92 passed (29 general + 63 operations); artifacts/business-sprint-unit.log |
| Actual disposable Supabase | 22 groups passed, PostgreSQL 17.12, actual Auth/TOTP/AAL2/PostgREST and concurrent SQL; artifacts/business-sprint-real-integration.log and artifacts/phase2/supabase-integration-results.json |
| Lint and TypeScript | Passed; artifacts/business-sprint-lint.log and business-sprint-types.log |
| Default Next.js production + OpenNext | Passed on existing Linux dependencies, no reinstall; artifacts/final-phase3/opennext-build.log |
| Wrangler deploy --dry-run | Passed; all tracked gates false; artifacts/final-phase3/dry-run.log |
| Local workerd native limiter | Mocked provider/storage passed; artifacts/business-sprint-native-worker.log |
| Public Worker browser regression | 57 passed, 13 existing device/branch-conditional skips; artifacts/business-sprint-public-browser.log |
| New business default-off HTTP gate | 2 passed, desktop + WebKit iPhone emulation; artifacts/business-sprint-gates.log |
| Public responsive screenshots | 2 passed; artifacts/business-public-screenshots and business-sprint-public-screenshots.log |
| Enabled owner browser regression | All 48 unique cases verified across runs: initial full run 47 passed/1 expired invitation fixture; targeted fresh-invitation cases 2 passed; final complete owner groups 10 passed (5 desktop + 5 mobile). No second entire 48-case run after the test-only fixture fix; artifacts/business-sprint-operations-browser.log, business-invitation-targeted.log and business-owner-final.log |
| Credentials/source review | No credential-pattern matches in reviewed changed files; public scenes/styles/form/Resend source identical to base |
| Hosted execution / backup / restore / real email | Not performed or authorized |

Local verification is not hosted activation proof. Hosted inventory is owner-
reported PostgreSQL 17.11; local integration used the same major version 17.12.
No physical phones, assistive-technology user study, live email attempt, hosted
restore drill, GitHub CI run or new Lighthouse score is claimed. Public regression
includes exact animation/drag/reset, reduced motion, WebGL failure and viewport
checks. Owner browser tests include axe WCAG A/AA scans and overflow assertions,
real persisted module journeys, selected export contents, authorization boundaries,
late responses after hide/logout, non-JSON denial, malformed storage acknowledgement
and a confirmed write followed by failed list refresh.

The expanded long-running suite revealed an expired pre-generated mobile invite:
7+ hours old, local Auth otp_expiry=3600 seconds, actual verification returned
403/otp_expired; it had not been consumed. Test setup now generates a fresh
synthetic invitation immediately before use through a strictly loopback-only,
opt-in helper. It never sends invitation email or changes Auth configuration.
The existing password/TOTP/AAL2 assertions and timeouts are unchanged. Negative
unit tests reject hosted URLs, inappropriate protocols/runtime and missing opt-in.
All other cases from the initial full run remain valid; only the affected owner
groups are rerun after this test-fixture correction.

To run enabled operational browsers against an already prepared local Worker:

```powershell
$env:TAKWEEN_LOCAL_INTEGRATION = '1'
$env:TAKWEEN_LOCAL_SUPABASE_STATUS = Join-Path $PWD 'artifacts/final-phase3/runtime-start.json'
$env:TAKWEEN_LOCAL_WORKER_URL = 'http://127.0.0.1:8798'
npm run test:browser:operations
```

The status file must belong to the disposable local stack and remain ignored/
private. Substitute its existing ignored path when using another local setup;
never point tests at hosted services or share its contents. The runner waits for
the actual rate-limit window outside tests; it does not relax security limits.

All 63 application source/configuration files in the tested Linux Worker build
match the final local sources (line-ending normalized). The local test build uses
the disposable loopback Supabase public URL/key, not hosted credentials. Never
deploy this ignored test artifact: a future approved deployment must rebuild with
the verified hosted public configuration and separately provisioned server secrets.

During development: a new test initially selected a paragraph as a heading, then
used an exact getByLabel match on a select's containing text. Both were test locator
errors, corrected to existing accessible text/combobox semantics; assertions and
60-second timeouts were retained. No failing case was skipped. The initial local
migration checksum mismatch was exclusively LF/CRLF, verified against every
existing hash; content changes remain rejected. A separate regression reproduces
the old notification-body drift before applying 015, verifies active-lease refusal,
legacy uncertainty and immutable retry content after the correction.

## Main changed files

- supabase/migrations/202611260012_business_resources.sql
- supabase/migrations/202611260013_scheduling_finance.sql
- supabase/migrations/202611260014_draft_catalogue_customers_exports.sql
- supabase/migrations/202611260015_notification_contact_snapshot.sql
- src/lib/operations/cost-estimate.ts
- src/app/api/operational/business/route.ts
- src/components/business-workspace.tsx and business-profile-forms.tsx
- src/components/owner-dashboard.tsx (separate workspace import/render only)
- src/lib/operations/runtime.ts, .env.example, wrangler.jsonc (disabled gate)
- tests/operations-{resources,scheduling-finance,catalogue-customers,notification-snapshot,hosted-preparation}.test.ts
- tests/operational-browser/business-{helpers,resources,planning,profiles,races}.*
- tests/operational-browser/local-invitation.ts, owner.spec.ts and
  tests/operations-local-test-safety.test.ts (fresh guarded local invite fixtures)
- scripts/test-local-supabase.mjs and tests/browser/operations-gates.spec.ts
- docs/HOSTED_ACTIVATION_PACKAGE.md, HOSTED_SUPABASE_PREPARATION.md,
  OPERATIONAL_IMPLEMENTATION_PLAN.md, BUSINESS_OPERATIONS_SPRINT.md and ROADMAP.md
- scripts/prepare-hosted-migration-package.mjs and supabase/inspection/*

No dependency manifest/lock, original migration 001-011, approved animation,
public homepage, styles, public form or Resend application source was modified.

Latest dry-run bundle: 7,685.42 KiB uncompressed / 1,831.42 KiB gzip. Current
Cloudflare limits documentation (checked 26 November) lists a 64 MiB uncompressed
Worker limit for Free and Paid, with no compressed-size limit; the measured upload
is below it. Older references to 3 MB/10 MB
are outdated. No plan was changed.
This is not a guarantee of hosted CPU/usage headroom: Workers Free CPU/request and
daily quotas, Supabase data/Auth quotas and any idle pausing still need controlled
hosted measurement and monitoring before operational activation. Local workerd does
not establish hosted billing or production CPU-limit compliance. No paid backup,
queue, scheduler, storage or reporting service was introduced.
Reference: https://developers.cloudflare.com/workers/platform/limits/ .

Final local review decision: ready for owner review of this gated implementation.
Hosted operational activation remains NO-GO until the independent inventory,
protected backup/restore, Auth/business configuration and explicit migration/
deployment/sending approvals are satisfied. No push, PR, merge, hosted migration,
real email, deployment, public catalogue, DNS or indexing change was performed.
