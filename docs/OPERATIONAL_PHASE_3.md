# Phase 3 dependency and migration plan

Latest status (24 November 2026): recovered disposable Supabase and fresh default
OpenNext Worker verification pass. GO for draft GitHub review, not hosted
activation. The final-verification section below supersedes historical blockers.

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

## Stabilization checkpoint — 24 November 2026

Starting commit: `1ce3a41943261159813c4a02a927ea65f95a5086`. No Phase 3 feature
was rebuilt. Production source/configuration, homepage, animations, Resend and
RLS/migrations remain unchanged. This checkpoint is **blocked, not release-ready**.

### Confirmed environment findings

- Read-only `wsl --list --running` reports Ubuntu; WslService is Running. Even
  `wsl --exec /bin/echo TAKWEEN_WSL_READ_ONLY_OK` times out with
  `Wsl/Service/HCS_E_CONNECTION_TIMEOUT`. A running service is not proof of a
  responsive guest. No distro shutdown, VM/service restart or unrelated process
  termination was attempted.
- Windows reported about 1.3 GiB free physical memory; vmmemWSL used about 1.8 GB.
  These observations do not prove memory pressure caused the guest failure.
- **C: had exactly 0 bytes free.** The isolated Windows build log records
  `ENOSPC: no space left on device, write`. The host also failed to start a Node
  process with "There is not enough space on the disk." This independently
  blocks reliable builds/runtime recovery. It is not a website source defect.
- Only the new failed diagnostic build output under
  `artifacts/stabilization/app/.next` was removed after verifying its absolute
  workspace-contained path and absence of reparse points/nested links. It held
  52,879,092 bytes. About 94 MB free was observed afterward, still insufficient
  for builds. Source, dependencies, databases and previous screenshots/evidence
  were not deleted. Owner-selected disk cleanup is required before continuing.

### Canonical investigation status

The prior generated Linux homepage HTML was observed to contain the canonical
in both app and copied regression output. Prior browser failures saw zero DOM
canonical links. An attempted independent Worker comparison did not serve a
response (connection refused, followed by WSL connection timeout), so the actual
source of this generated/served/DOM discrepancy is **not established**. Do not
claim the canonical bug is fixed or attribute it conclusively to stale caches.

The old temporary harness had independently confirmed configuration mistakes
(duplicate webServer configuration and enabled `.dev.vars`); correcting those
did not resolve the last two canonical assertions. A clean, correctly configured
artifact/response/DOM comparison and failed-cases-first rerun remain mandatory.
No metadata, assertions, canonical URLs or indexing flags were changed to hide
the failures. The full browser suite was not repeated against an unavailable VM.

### Windows Turbopack/PostCSS diagnosis

The original panic says the PostCSS Node child exited with code 0 before the
Turbopack parent connected, without an application stack. A disposable parent/
child Node TCP handshake on 127.0.0.1 now succeeds. Direct processing of the actual
globals.css through the installed Tailwind/PostCSS plugin succeeds (26,170 output
bytes; 485–504 ms observed). Thus invalid stylesheet/plugin configuration and a
general Node loopback failure were not reproduced.

A separate copied build with a dependency junction cannot be used as a Turbopack
reproduction: Turbopack correctly refuses packages outside that copy's hermetic
root. The alternative **diagnostic-only** webpack command subsequently encountered
ENOSPC. It is not a passing build or a production bundler change. The precise
original Turbopack cause is still unproven; disk/resource recovery and a clean
controlled build are needed before changing production configuration.

### Focused verification

- Fresh commercial SQL/RLS regression: **8 passed, 0 failed** using PGlite with
  test Auth stand-ins, not actual Supabase. Covers paise/tax rounding, rollback,
  issued immutability, explicit approval fields, revision supersession, accepted
  quotation/order deduplication, production transitions and every new private
  table's unauthorized access denial.
- Fresh money/PDF/privacy tests: **3 passed, 0 failed**, bringing this checkpoint
  to **11 targeted test passes**. Changed-test ESLint and full TypeScript
  (`--noEmit --incremental false`) pass. Added a focused privacy regression that reads
  the actual decompressed PDF text operators and embedded font's Unicode mapping.
  It requires the customer-facing note/email and excludes internal history and
  production-cost sentinels. A separate synthetic diagnostic already confirmed
  these inclusions/exclusions without relying on compressed-byte string searches.
- Bundled Poppler was unavailable at its configured runtime path in this session;
  the installed PDF library supplied the decoded-text check without a dependency.
- No backend behaviour changed. Actual Supabase/Auth/Worker/browser reruns are
  blocked by the unresponsive local VM, not replaced by the embedded SQL results.
  Prior complete-suite results remain historical evidence only.

Only the PDF regression and this report are intended tracked changes. No push,
merge, hosted SQL, deployment, real email, DNS or indexing change occurred.
Release/GitHub integration readiness remains NO-GO until disk space is restored,
safe local runtime recovery is possible, the two canonical cases pass, and the
complete browser suite passes. A draft PR targeting operational-foundation has
not been opened or pushed by this checkpoint.

## Environment recovery verification — 24 November 2026

Starting commit: `bab835041364bd8e187ff63774938f5907e88611`.
The owner confirmed sufficient recovered space and authorized safe diagnostics,
without restarting WSL/services or interrupting unrelated work. No cleanup was
performed in this pass. Application source and production configuration are
unchanged. The prior Windows disk blocker has cleared; the WSL exec/database
blocker has not.

### Read-only storage findings

C: initially had 17,880,756,224 bytes free (16.65 GiB). It remained above 16 GiB
during the isolated build/browser run. Selected directory totals are logical
bytes, not guaranteed allocated/reclaimable disk space. Links were skipped and
access-denied directories reported; this is not an inventory of personal files.

| Location | Logical bytes | Approximate GiB | Disposition |
| --- | ---: | ---: | --- |
| C:\\Windows\\Temp | 40,606,945 | 0.038 | Review through Windows Storage; one unreadable directory. |
| C:\\Users\\user\\AppData\\Local\\Temp | 885,328,551 | 0.825 | Do not blanket-delete: source logo/reference images also live in Temp. |
| C:\\Users\\user\\AppData\\Local\\npm-cache | 3,202,524,416 | 2.983 | Optional cache maintenance only after approval; future downloads required. |
| Repository artifacts | 1,164,784,681 | 1.085 | Keep screenshots, traces and private local fixtures; no wholesale deletion. |
| Repository .next | 231,510,958 | 0.216 | Generated output, but approval and active-server check needed before removal. |
| Repository .open-next | 1,989,867 | 0.002 | Optional generated-output cleanup, negligible benefit. |

System-managed pagefile.sys was 13,554,237,440 bytes (~12.62 GiB), hiberfil.sys
6,610,800,640 bytes (~6.16 GiB), and the Ubuntu ext4.vhdx file 7,183,794,176 bytes
(~6.69 GiB). None is a disposable cleanup candidate. Do not disable virtual memory,
delete a VHD/distribution, or remove source/Git/dependency history to reclaim space.

Exact optional commands, **not executed**:

```powershell
# Opens Windows' review UI; select categories deliberately, not Downloads blindly.
Start-Process "ms-settings:storagesense"

# Preview only; no deletion. Check the active server before any approved cleanup.
Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "C:\Users\user\.codex\worktrees\takween-audit\takween\.next" -Recurse -Force -WhatIf

# Only AFTER explicit cache-cleanup approval; up to ~2.98 GiB logical estimate.
npm cache clean --force --cache "C:\Users\user\AppData\Local\npm-cache"
```

`npm cache verify` can garbage-collect entries: it is cache maintenance, not a
strictly read-only inspection. No cache maintenance is needed to resume testing.
Temporary cleanup may recover less than the totals because some files are active.

### Runtime health and pending approval

Ubuntu and WslService report Running, but a new read-only
`wsl --exec /bin/echo TAKWEEN_WSL_HEALTH_CHECK` again returned
`Wsl/Service/HCS_E_CONNECTION_TIMEOUT`. No service/distro was stopped or restarted.
The existing loopback Supabase Auth health endpoint returns HTTP 200. Bounded
PostgreSQL/PostgREST checks do not complete; Auth health alone is not database
readiness. Operational Worker port 8798 times out and public test port 8799 does
not accept requests. No customer rows or credentials were printed.

A separate explicit decision was requested before `wsl --terminate Ubuntu`:
that would stop **all** Ubuntu processes, not only Takween. Inspection cannot
prove absence of unrelated work while guest exec is broken. No restart approval
has been assumed. No hosted targets or database resets were attempted.

### Fresh production/canonical/browser evidence

With disk space available, the existing isolated Windows source copy built
successfully using the diagnostic CLI command `next build --webpack`:
compilation 2.2 minutes, TypeScript 14.6 seconds, 17 prerendered pages. No repository
script, Next config or OpenNext config was changed. This verifies a supported
Next.js production build, **not** a fresh default Turbopack or OpenNext build.
It ran separately on 127.0.0.1:3110 and did not replace port 3100.

The canonical comparison now agrees for this single, clean production artifact:

- Generated homepage HTML: canonical present.
- Actual Next.js HTTP response: 200, canonical present.
- Chromium DOM and WebKit DOM: canonical is
  https://takween-labs-preview.abdzeez000.workers.dev.
- The **two previously failed SEO cases passed unchanged first** (6.5 seconds).
- Then the **complete default browser suite passed: 57 passed, 13 existing
  conditional skips, 0 failures** (3.8 minutes), including both canonical cases,
  original gear, layered T drag/reset/touch, viewport/keyboard matrix, WebGL
  fallback, reduced motion, enquiry recovery and private feature gates.

These are desktop/browser-emulation results, not physical Android/iPhone tests.
The source has no verified canonical defect requiring a patch. The precise
cause of the old generated/served mismatch remains unproven; clean Windows
artifact/response/DOM consistency does not retroactively prove stale caches or
certify the unavailable local **Worker** response. Actual OpenNext Worker HTML
and Supabase runtime verification remain pending safe guest recovery.

Evidence: ignored artifacts/stabilization/windows-webpack-recovery.log,
canonical-comparison.json, windows-served.html, canonical-tests.log,
full-browser.log, owned-service-health.json and browser-results/ screenshots.
No secrets/customer records were added to tracked files. Previous 11 targeted
SQL/PDF test passes remain evidence from the preceding checkpoint; they were
not unnecessarily rerun in this recovery pass.

**Current gate:** Windows production homepage/browser verification is GO.
Phase 3 Worker/backend release verification remains BLOCKED, with no push,
merge, deployment, genuine email, hosted SQL or DNS/indexing change authorized.
Resume with safe recovery of the existing disposable guest and database,
then actual Worker canonical comparison and relevant runtime checks. Do not
change application code merely to make an unavailable environment appear green.

## Final recovered-runtime verification — 24 November 2026

Starting commit: `5fb25dcce143a257c03b4a6b1f9da5056fe529e5`.
No application defect was reproduced and no application/configuration fix was
necessary. This pass changes only the report. The owner authorized Ubuntu
termination/restart conditional on avoiding unrelated critical work, and a push
plus draft PR only after successful release checks.

### Recovery performed without resets

Ubuntu was the only running distro. All visible WSL launchers were Takween's
Phase 2/3 Worker scripts or the diagnostic probe; no Docker/VS Code/terminal
launchers indicated unrelated work. Guest process listing itself was unresponsive,
so background Linux processes could not be audited directly.

`wsl --terminate Ubuntu` completed successfully. The first relaunch failed with
`Wsl/Service/CreateInstance/HCS_E_CONNECTION_TIMEOUT`. A subsequent inventory
reported **no running distributions**. With no remaining distro workload, an
idle utility-VM `wsl --shutdown` followed by Ubuntu relaunch restored execution.
Windows services were not restarted. Deeper read-only `hcsdiag list` was denied
for insufficient privileges; no administrator groups or permissions were changed.

Pinned Supabase CLI 3.2.0 resumed the existing `takween-phase2` native stack from
its saved directory and data. No distro reinstall, VHD manipulation, database
reset, dependency reinstall or extra cleanup was performed. The existing enquiry
records were present before test fixtures were added. Installed Linux dependencies
and semantic lockfile matched current tracked source before building.

Readiness checks independently confirmed PostgreSQL queries, Auth HTTP 200 and
real PostgREST anonymous owner-RPC denial (HTTP 401 / code 42501). Runtime status
and credentials were captured only under ignored artifacts/final-phase3/.
The integration runner verified existing migration hashes against the retained
database; no hosted migration or destructive schema action occurred.

### Fresh verification evidence

| Check | Result |
| --- | --- |
| ESLint / TypeScript | Passed, fresh execution. |
| Unit tests | 70 passed: 29 existing + 41 operational; no failures/skips. |
| Real local Supabase integration | All 16 groups passed, including actual Auth/MFA/AAL2, RLS, concurrent quotation/order retries, rollback, stale production writes and notification fencing with mocked provider transport. |
| Default Linux Next.js/OpenNext build | Passed using unchanged build command and existing dependencies. Next compilation 32.3 seconds; TypeScript 23.8 seconds. |
| Wrangler deployment dry run | Passed; 7628.76 KiB raw / 1823.55 KiB gzip. No upload/deployment. |
| Actual public-mode Worker | HTTP 200, correct canonical and noindex,nofollow in response HTML and Chromium/WebKit DOM. |
| Worker browser regressions | 4 passed: unchanged SEO/private-route/noindex and disabled-operational-gate cases in Chromium and WebKit iPhone emulation. |
| Actual operational Worker | 4 passed: desktop/Pixel 7 emulated commercial journeys and anonymous/origin/size denial cases. Real local Auth/AAL2 and stored enquiries; PDF downloads, quotation states, orders, production observations and accessibility assertions pass. |
| Mocked local Worker harness | Passed, native rate-limit behavior for both existing email and persistent-intake handlers. No genuine email. |
| Browser secret scan | 19 files scanned; zero actual generated secret matches and zero server-only key-marker files. Exact PR diff also contains no generated secret matches. |
| Protected public source | T, gear, scene adapter, homepage, styles, public form and existing Resend handler unchanged against operational-foundation. |

Desktop/mobile operational projects waited outside individual tests for the
unchanged real rate-limit window. Assertions/timeouts were not relaxed. The
successful Windows 57-pass/13-skip suite was **not repeated**; these fresh browser
checks exercise the actual recovered OpenNext Worker and cover the outstanding
runtime boundary. Physical phones and physical Safari were not tested.

The actual Worker response and Chromium/WebKit canonical all normalize to
`https://takween-labs-preview.abdzeez000.workers.dev/`. The previous failing
canonical cases pass unchanged. No current canonical application defect exists
in these reproductions. The exact historical generated/served discrepancy is
not conclusively established; environment/artifact recovery is not evidence for
a particular stale-cache theory. No SEO code, URL or indexing assertion changed.

Evidence under ignored artifacts/final-phase3/: service-health.json,
integration.log, lint.log, typecheck.log, test.log, test-worker.log,
opennext-build.log, dry-run.log, worker-response.html, worker-canonical.json,
worker-browser.log and commercial-browser.log. Current synthetic owner screenshots
and downloaded PDFs remain in artifacts/phase3/. Raw runtime/fixture/trace files
contain private local test credentials and must not be committed or uploaded.

### Release boundary

GO for pushing this reviewed Phase 3 branch and opening a **draft PR targeting
codex/operational-foundation**, conditional on checking hosted CI on the pushed
SHA. No master/combined-release merge or production deployment is authorized.
No production secrets, hosted migrations, bucket changes, genuine email sending,
DNS or indexing activation. All tracked activation flags remain false.

Hosted activation still needs business/privacy/tax/entity approval, owner recovery
and backup procedures, actual hosted free-tier CPU verification, multilingual PDF
font decisions, real-device owner testing and an approved Resend/Gmail delivery
test. The existing 11 moderate dependency advisories are not resolved by this
environment recovery; no high/critical were reported in the prior audit. No
exactly-once email or production-readiness guarantee is claimed.
