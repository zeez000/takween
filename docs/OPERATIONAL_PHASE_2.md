# Operational phase 2 engineering report

23 November 2026. Branch: codex/operational-foundation. Starting commit:
b6056957fb3eac34683bca8fb47c5520273fb904. Local development only.

## Outcome

Real disposable Supabase verification is complete. The owner workspace,
invitation/MFA onboarding, persistent enquiry form and fenced notification
dispatcher are implemented and locally tested. All tracked activation and email
flags remain false. Nothing was pushed, merged, deployed or applied to hosted
Supabase. No real email, DNS or indexing activation occurred.

The approved layered T, original mechanical gear, scene adapter, geometry,
lighting, interaction math, reset and preload policies are unchanged. Homepage
styles/layout remain unchanged. One enquiry privacy paragraph was corrected:
the old statement that no form data is stored would be false in persistent mode.

## Implemented

### Real Supabase verification

Supabase CLI 3.2.0's native Linux runtime ran inside WSL2 with isolated state,
loopback endpoints and no hosted project link. This avoided a Docker Desktop
installation. Auth, PostgREST and real PostgreSQL were used, not Auth stand-ins.
Local credentials were generated privately; tests refuse non-loopback endpoints
and never load the application's env files. All seven migration SQL files were
executed against that disposable database, with hash tracking for local re-runs.

Verified anonymous denial, ordinary authenticated denial, allowlisted AAL1 denial,
real TOTP enrolment/challenge and AAL2 access. An additional negative test confirms
an AAL1 session cannot replace an existing verified MFA factor to gain access.
Parallel real PostgREST submissions created one enquiry/outbox record per UUID;
changed-payload retries conflicted, and constraint failures rolled back all intake
side effects. Signed Auth claims and real PostgREST RPCs exercised RLS.

### Owner workflow

The gated `/owner` workspace supports password login, one-time invitation
acceptance, password setup, TOTP setup/verification, logout, inbox search,
category filters, pagination, customer preferences, creation/history events and
internal notes. Every private API checks identity and current AAL2 membership.
No public signup, role elevation or arbitrary table-write endpoint exists.

Notes and their audit/history are transactional and retry-idempotent. Customer
rows are cleared from the view on sign-out, forbidden responses or tab hiding.
Empty/error/loading states use real responses; record counts are actual returned
database records. Tests use clearly synthetic local customers, not fabricated
production statistics. Quotation/order status management remains a later phase.

### Customer intake

Public intake configuration is fetched on form focus, not hero startup. Approved
notice/version and explicit consent are required in persistent mode. Separate
printing/machining categories preserve material/quantity validation; machining
adds process and referral consent without forwarding anything to Fateen.

Contact, enquiry reference, history, audit and pending notification are one
database transaction. A stored receipt is not email acceptance or delivery.
Matching retries return the same reference, including after a same-tab reload.
Only an opaque nonce is kept in sessionStorage; no form text or customer details
are saved there. Different details conflict rather than overwrite the old request.
An explicit separate-enquiry action resets the nonce. If browser storage is blocked,
only in-memory retries are available. New sessions are not globally deduplicated
customer identities.

The old Resend handler remains intact; its route refuses provider-only intake when
persistent mode is enabled. This prevents two competing authoritative workflows.
Manual draft/email fallback remains available. Uploads remain local-only selection;
no upload service or bucket was activated.

### Notification recovery

An owner-only, gated API dispatches at most one pending job per request. Claims
use row locking/SKIP LOCKED, random fencing tokens and bounded leases. Concurrent
workers cannot acquire the same job; stale tokens cannot acknowledge it.

Mocked Resend tests cover accepted IDs, whitespace/malformed responses, rejection,
429/backoff, network ambiguity, database acknowledgement failure and stable keys.
Real database-backed dispatch tests exercised these state transitions with a mock
transport. Expired leases/ambiguous outcomes are held for owner review, not blindly
resent. Attempts are capped, with conservative expiry handling. Acceptance never
means Gmail inbox delivery; exactly-once email is not promised.

There is no cron, paid queue or real sending activation. Other provider failures
may require manual reconciliation. A reviewed recovery/reset action and provider
delivery-event integration are not implemented as unsafe public endpoints.

## Confirmed issues fixed during this phase

| Issue | Fix / evidence |
| --- | --- |
| Phase-1 persistence had no genuine Supabase integration evidence | Actual local Auth, TOTP, PostgREST, PostgreSQL, RLS, concurrency and rollback tests now execute successfully. |
| Old replay RPC always said notification pending | Migration 006 returns actual outbox state; customer receipts still distinguish storage from delivery. |
| Retry UUID disappeared on refresh | Persist only an opaque tab-scoped nonce; mock and real Worker browser tests verify the same reference after reload. |
| New owner forms could serialize credentials into native GET submission | All owner forms use POST; credentials/MFA codes/notes are unnamed native controls read by ID after hydration. JavaScript-disabled tests prove passwords are absent from URL and native request body. This code was not deployed. |
| Worker callback used an internal localhost host and lost 127.0.0.1 cookies | Redirects now use the single trusted configured origin. Real one-time invitation/password/TOTP tests pass. No arbitrary redirect parameter is honored. |
| Local origin was incorrectly used as SITE_URL | Keep the existing strict HTTPS canonical validation; use a separately validated REQUEST_ORIGIN only for local requests. |
| Existing stalled-fetch recovery was intermittent | An independent 20-second promise deadline bounds both fetch and response parsing and aborts transport; cleanup clears the timer. Original test assertions/timeouts remain unchanged. |
| Concurrent browser suites removed each other's trace files | Operational output now lives under ignored artifacts/phase2/operational-test-results, independent of default test-results. Concurrent final suites pass. |
| Owner inbox omitted stored machining preferences/consent | Additive migration 007 exposes them only through the authorized owner RPC. The separate queue is tested with real stored requests. |
| Public enquiry notice contradicted persistent storage | Replace only that paragraph with mode-independent truthful draft/submission wording. |

The timeout failure's original external scheduling cause is not conclusively
established. One interrupted repeat run recorded a 27-minute duration despite a
60-second test limit. Its log is retained. A controlled isolated repeat then passed
three times with unchanged limits, and both full-suite timeout cases pass. Do not
claim that all host scheduling/runner interruptions have been eliminated.

## Executed verification

| Check | Result / evidence |
| --- | --- |
| ESLint and TypeScript | Passed; final logs under artifacts/phase2. |
| Unit suites | 59 passed: 29 existing and 30 operational tests. |
| Real local Supabase integration | 14 check groups passed, including actual MFA replacement denial, concurrent intake and dispatcher leases. |
| Full default browser suite | 57 passed, 13 unchanged browser-specific skips; Chromium desktop and WebKit iPhone emulation. |
| Enabled local Worker browser suite | 10 passed: Chromium desktop/Pixel 7 emulation, real Supabase login/MFA/invites/inbox/notes/printing/machining/reload recovery, API denials and no-JavaScript serialization. |
| Accessibility | Eight axe WCAG 2 A/AA and 2.1 AA scans passed with zero violations in owner login, inbox, invitation setup and persistent form across the two operational layouts. No physical screen-reader certification claimed. |
| Isolated timeout regression | Three consecutive passes with original assertions and timeout, after retaining the interrupted failure log. |
| Local Worker rate harness | Existing mocked provider: five 202 then two 429. Persistent mock store: five 201 then two 429. |
| Enabled private API native limiter | Thirty malformed local requests reached 400 validation; next five returned 429. No data access/mutation/provider sending in that test. |
| Next.js production build | Passed on Windows and in isolated Linux OpenNext build. |
| OpenNext / Wrangler dry run | Passed; final Worker 5807.50 KiB raw / 1223.64 KiB gzip. No deployment. |
| Browser secret scan | No server-env markers, long secret tokens or actual generated local secret in public chunks. One Supabase SDK sb_secret_ prefix-detection literal is expected and is not a credential. |
| Dependency checks | Locked clean Linux installation passed; 11 moderate advisories remain, with no high/critical reported. Existing runtime dependencies not upgraded. |
| GitHub CI | Not run for these local commits; no push performed. |

Some intermediate tests failed for the now-corrected origin redirect, test fixture
selection and artifact-output collision. Those failures were not suppressed or
converted to skips. No retry allowance or timeout was increased. The preserved
animation assertions pass, and no geometry/lighting/motion/source changes exist.

## Evidence and changed files

Local evidence (ignored, not a public deployment artifact) is in artifacts/phase2:
integration.log, supabase-integration-results.json, default-browser.log,
operational-browser.log, unit-tests.log, timeout-repeat.log, timeout-interrupted.log,
private-rate-limit.json, windows-build.log, opennext-build.log and dry-run.log.
Owner/persistent desktop/mobile screenshots are owner-desktop.png,
owner-mobile.png, persistent-desktop.png and persistent-mobile.png. They show only
synthetic data from the actual local database. Active gear evidence is under
animation-evidence/. Private status/fixture/trace files must not be committed.

Implementation files include:

- supabase/migrations/003–007 (full dated filenames), supabase/local/config.toml.
- src/app/owner/page.tsx and owner/callback/route.ts; components/owner-dashboard.tsx.
- src/app/api/operational/{workspace,dispatch,intake-config,enquiries}/route.ts.
- src/lib/operations/{dispatcher,runtime,request-id,repository,intake}.ts.
- components/quote-form.tsx, the enquiry notice in app/page.tsx, and the legacy
  enquiry-route persistence guard. Existing lib/enquiry-handler.ts is unchanged.
- scripts/test-local-supabase.mjs; playwright.operations.config.ts; operational
  browser tests, persistence browser tests, and operational unit regressions.
- .env.example, wrangler.jsonc (false notification gate), package.json/lockfile
  (development-only pg/types and pinned accessibility engine; no new app dependency).
- Updated architecture/migration docs and OPERATIONAL_PHASE_2_RUNBOOK.md.

## Remaining gates and limits

This is GO for local owner review, not production approval. No push/deploy request
is made by this report. The existing public Worker/PR are unchanged.

Before hosted use, review migrations against the actual target inventory and
approve application explicitly. Configure owner bootstrap/invitation templates,
password/session policy, MFA and disabled public signup in the hosted Auth project.
Approve privacy/retention/deletion, backup/restore and Fateen routing/legal identity.
Configure provider secrets securely and approve a controlled genuine delivery test;
Gmail inbox/spam/delivery events remain unverified. No passwords/keys are needed
in chat. No automatic production migrations or notification scheduling exist.

Actual long-lived/expired hosted sessions, lost-device MFA recovery and physical
Android/iPhone/Safari owner workflows still need real-device/operational review.
No new Lighthouse/GPU benchmark was claimed; earlier mobile-startup concerns remain
before a commercial launch. Quotation/order management, catalogue and production
workflows remain future phases; accounts, payments and customer uploads stay off.

See OPERATIONAL_PHASE_2_RUNBOOK.md for every environment gate, security boundary,
manual notification reconciliation and non-destructive rollback procedure.
