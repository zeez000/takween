# Phase 3 dependency and migration plan

Base: operational-foundation 73647e5. Local-only implementation; no hosted SQL,
email activation, deployment or indexing permission.

1. Add quotation snapshots/items, revisions, bounded integer-paise calculations,
   explicit tax basis points and legal entity, immutable issued revisions, manual
   lifecycle evidence and owner/AAL2-only RPCs. No default commercial terms.
2. Add one order per accepted quotation, validated production transitions,
   append-only job observations and audit history. Costs stay private.
3. Extend the existing owner workspace and same-origin/rate-limited API. Generate
   authenticated on-demand PDFs; no public PDF bucket or customer access links.
4. Test SQL/RLS, retries/concurrency/rollback, local Supabase and owner journeys;
   run production/OpenNext/Worker and existing animation regressions.

All new writes use request UUIDs with payload comparison, transaction locks and
version checks. No direct authenticated table writes. Monetary limits are technical
bounds, not business prices. Tax rates, validity, entity and terms are owner input.
Fateen remains a consented category with manual routing; entity text is not proof
of authority. Rollback disables operations and preserves records; never drop data.

## Implemented architecture

Migrations 008–010 are additive to the seven immutable Phase 2 migrations:

- `202611230008_quotations.sql`: quotations, line items, append-only commercial
  audit events and private request ledger. Draft editing, explicit approval,
  manually recorded sending and evidenced acceptance/rejection/expiry. New
  revisions are blank drafts to require deliberate commercial review. Only the
  latest revision can advance. One accepted revision per enquiry.
- `202611230009_orders_production.sql`: one order per accepted quotation with a
  frozen customer/item/price snapshot, append-only status history and production
  observations. Private search/filter/pagination RPC supplies owner views.
- `202611230010_command_namespaces.sql`: restrict core write functions to the
  private schema and bind request-ledger payloads to quotation/order namespaces.
  Public façades recheck current owner/AAL2 and never use editable Auth metadata.

New tables use deny-by-default RLS. Authenticated owners can select only under
the AAL2 policy. No direct insert/update/delete grants exist, including for owners.
Service role has no new operational command grants; owner actions use the current
session rather than privileged browser credentials. Commercial audit events are
separate from the Phase 2 enquiry audit table so existing enquiry constraints/FKs
remain unchanged. Every write inserts its audit event and retry receipt in the
same transaction. No data is automatically routed to Fateen.

`POST /api/operational/commercial` uses the existing operations flag and native
owner limiter, exact trusted Origin, streamed 45,000-byte cap, getUser and current
database AAL2/allowlist verification. Private responses are no-store and noindex.
The workspace exposes quotation/order views, search, state filters, pagination,
manual lifecycle evidence, line-item editing, PDF download and production notes.
Unknown result/failure never becomes confirmed success. In-memory command UUIDs
survive retries while the view remains mounted. On reload, refresh records before
retrying an uncertain write; command nonces are not persisted across reloads.
Database uniqueness still prevents duplicate drafts/revisions/orders.

## Commercial rules (explicit local drafts)

- Currency is INR; calculations use integer paise, database bigint/numeric and
  half-up rounding of aggregate tax to the nearest paise. UI decimal parsing
  rejects exponent notation and more than two decimals.
- Quantity 1–10,000; up to 50 items; unit price 0–100,000,000 paise; quotation total
  at most 9,000,000,000,000 paise. These are safety bounds, not business prices.
- Tax is owner-entered in basis points, 0–10,000. Blank means undecided and blocks
  approval. Zero must be an explicit decision. This is one aggregate tax amount,
  not GST classification/breakdown, a tax invoice or tax advice.
- Approval requires items, contracting entity, terms and non-expired validity.
  Sent/accepted states are manual evidence records; no messages or acceptance
  links are sent. Expired is a manual transition after the UTC database date
  exceeds validity. No scheduler marks historical rows automatically.
- Accepted prices/items are immutable. Orders take a frozen snapshot and cannot
  be accidentally recreated from the same quotation. Cancelled orders do not
  automatically permit a replacement order; that business flow needs approval.
- Workflow: queued → designing (optional) → printing OR machining by category →
  quality_check → ready → completed. QC can return to the category's work stage;
  ready can return to QC. Nonterminal jobs can hold/cancel; held jobs resume at
  queued for deliberate planning. Completed/cancelled jobs are terminal.
- Production observations record optional estimated/actual cost, material in
  milligrams and print minutes. They are per-entry observations, not a stock
  ledger or automatic profitability total. Record final observations before
  completion; post-closure correction/reopening is not implemented.

## PDF design and free-tier boundary

The authenticated endpoint re-reads the stored quotation and returns only its
private snapshot. `pdf-lib`/`@pdf-lib/fontkit` are lazy-loaded on download in the
owner browser, using the existing Inter Latin font under its included SIL OFL
license. No public PDF bucket, attachment URL, extra service or new secret exists.
The PDF includes TAKWEEN LABS branding, revision/state, customer, entity, items,
validity, manual terms/tax/totals and the verified business email. Internal job
notes/cost observations are excluded. Drafts are explicitly not issued quotations.
The embedded font supports only its Latin glyph set; unsupported scripts/emoji
fail explicitly. Multilingual PDF coverage needs approved additional fonts.

Server generation was rejected after a one-item local benchmark measured 567,
531 and 501 ms wall time. This is not measured hosted CPU. Browser generation
avoids placing that font-shaping work under the Workers Free CPU allowance.
[Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/)
and [PDF font support](https://github.com/Hopding/pdf-lib#embed-font-and-measure-text)
were checked. Local workerd does not certify hosted free-tier CPU compliance.
The 50-item stress fixture spans 11 A4 pages; width caching reduced its targeted
test from about 32 seconds to about 2.2 seconds (different host loads; not a
controlled mobile performance benchmark). Normal and long PDFs were rendered
with Poppler and representative pages visually inspected.

## Test execution and known harness failures

Final results are recorded below. Evidence is ignored under
`artifacts/phase3/`. It contains synthetic customer data only; do not commit raw
Auth status, invitation hashes, cookies or traces. No hosted target was used.

- Windows Turbopack twice failed creating/connecting its PostCSS child process,
  including outside the restricted sandbox. Linux Next/OpenNext builds succeed.
  No TypeScript or CSS checks were disabled and no stylesheet was changed.
- Initial combined browser run: 10 passed, 2 negative API tests returned 429
  instead of reaching body validation. New journeys consumed the real shared
  owner budget. The runner now waits 65 seconds between file/project groups,
  outside unchanged 60-second test limits. No limiter, assertion or retry weakened.
- Local Supabase rerun exposed a fixture assumption about which pending outbox
  job would be claimed after browser runs. The test now records the actual claim
  and verifies the same job and provider key on retry. Dispatcher code is untouched.
- The temporary homepage harness initially started both Windows and Linux servers,
  then reused enabled operational `.dev.vars`. Final regression runs use only a
  separate Linux production copy with inactive flags. These failed runs are not
  counted as passing verification.
- Concurrent database/browser execution exhausted host memory: two PGlite V8
  processes reported `Fatal process out of memory: Zone`, and one WebKit page
  crashed. Operational unit files now run serially (`--test-concurrency=1`), with
  no changed assertions. Fresh 69-test execution passes. The isolated mobile
  timeout recovery also passes in the final browser run.
- The final standalone homepage run still fails two canonical-link assertions
  (desktop and WebKit). Both generated homepage files contain the correct canonical
  and URL, but the served-browser discrepancy has not been resolved. Do not call
  the complete browser suite green. A separate public-mode Worker verification
  attempt was then blocked by `Wsl/Service/HCS_E_CONNECTION_TIMEOUT` before serving
  requests. WSL was not restarted because that may interrupt other local work.

## Final verification results (24 November 2026 IST)

| Check | Actual result |
| --- | --- |
| ESLint / TypeScript | Pass, fresh final execution. |
| Unit tests | 69 pass: 29 existing + 40 operational, no skips. |
| Real disposable Supabase | 16 check groups pass, including two new Phase 3 groups; actual Auth/AAL2/PostgREST, concurrent quotes/orders, stale writes and private production RLS. |
| Operational browsers | All 14 cases pass across paced file/project runs and the separately added desktop negative API case. Chromium desktop and Pixel 7 emulation. Not physical devices. |
| Operational accessibility | Ten axe scans report zero violations: eight existing owner/intake scans plus two complete commercial journeys. |
| PDF verification | Unit load/font/title/pagination/glyph checks pass; Chromium desktop/mobile actual downloads pass; normal and 11-page fixtures rendered and visually sampled. |
| Existing Worker harness | Pass, mocked email acceptance and mocked persistent storage each produce 5 successful requests then 2 native-limit 429 responses. |
| Next.js production build | Pass in isolated Linux; Windows Turbopack child-process build remains failed. |
| OpenNext build | Pass in isolated Linux, including fresh Next.js build. |
| Wrangler dry run | Pass; 7628.76 KiB raw / 1823.58 KiB gzip, no deployment. |
| Full final default browsers | **55 pass, 13 existing conditional skips, 2 fail** (canonical metadata). Animation drag/reset, original gear loading, layout/keyboard matrix, fallback/reduced motion and timeout recovery pass. |
| Final public-mode Worker SEO retry | Blocked by WSL VM connection timeout; early browser attempts returned connection refused. |
| Secrets | Zero generated local secret matches in release diff and 19 browser JS files; zero server-key markers in browser chunks. Not a full Git-history forensic scan. |
| Dependency audit | 11 moderate, zero high/critical; no advisory names for either added PDF library. Existing OpenNext/minifier/glob and TypeScript ESLint paths remain. No broad upgrades applied. |
| Hosted CI / production / real email | Not run or changed; pushing/deployment/real sending not authorized. |

Evidence files: `artifacts/phase3/integration.log`, `unit-tests.log`,
`operational-browser-paced.log`, `commercial-desktop-negative.log`,
`default-browser-final.log`, `next-build.log`, `opennext-build.log`, `dry-run.log`,
`worker-harness.log`, `dependency-audit.json`, `owner-desktop.png`,
`owner-mobile.png`, `quotation.pdf`, `quotation-long.pdf`, `quotation.png`,
`quotation-long-page-2.png` and `worker-quote-{desktop,mobile}.pdf`.
These are local ignored artifacts. Do not upload private fixtures/traces.

Local tested operational route: http://127.0.0.1:8798/owner. Runtime availability
after the final WSL timeout is unverified. The original Windows port 3100 process
was not deliberately stopped. No live Cloudflare resources were changed.

## Review recommendation

**GO for local Phase 3 code/business review; NO-GO for deployment.** First restore
the disposable WSL runtime safely and resolve/retest canonical output in a clean,
correctly configured production server. Then rerun the complete default suite
without competing memory-heavy jobs and verify the intended Worker config. Do
not substitute isolated successes for the two unresolved full-suite failures.

The local commits are independently reviewable (quotations; orders/production;
retry namespaces and real integration; owner/PDF UI; report). No push, merge,
hosted SQL, real sending, DNS or indexing approval is implied. Phase 2 PR #5 is
unchanged. This phase adds no customer accounts, uploads, payments or automatic
commercial routing, quotations or notifications.

## Environment, security and rollback

No new environment variables, secrets, buckets, queues or paid resources.
All tracked operational, persistence, email and indexing gates remain false.
Only the isolated localhost Worker enables operations for tests. Reuse Phase 2
runbook for Auth, origin, key handling, session and notification boundaries.
No notification outbox extension is needed: quotes/orders are recorded manually
and never generate email automatically. Real sending and delivery remain untested.

For rollback disable OPERATIONS_ENABLED, retain all rows/history/migration hashes,
and return application code to the reviewed Phase 2 commit. Do not drop the new
tables/functions or apply old migrations over them. For hosted activation first
inventory the target schema, review backups/restore and apply reviewed forward
migrations only after explicit owner approval. 008–010 have executed locally only.

Business approval still needed: entity and Fateen authority, prices/tax/GST policy,
terms/validity, evidence standards for manual decisions, retention/backup, owner
recovery and eventual correction/reopening rules. No defaults imply approval.
Physical phones, hosted CPU/session limits and real email delivery are not certified.
