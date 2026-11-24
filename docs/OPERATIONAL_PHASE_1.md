# Operational backend phase 1

23 November 2026. Branch: codex/operational-foundation. Based on
codex/combined-release at 5e3bee651dcc2e645c1a223971936f80d689cf80.

## Delivered scope

Both owner-supplied DOCX specifications were extracted and read completely.
OPERATIONAL_IMPLEMENTATION_PLAN.md records source hashes and requirement
reconciliation. Confirmed owner decisions override suggested brand changes,
upload journeys, static hosting, animation concepts and WhatsApp suggestions.

This phase prepares the operational backend foundation. It is not a claim that
the website is now an operational business system. Nothing has been applied to
hosted Supabase or the live Worker, and no genuine email was sent.

### Database and persistence

- Migration 001 creates a private takween schema with customers, enquiries,
  enquiry_events, admin_roles, audit_events and notification_outbox.
- Migration 002 exposes a service-only, validated transactional intake RPC.
  An enquiry has a unique random reference, bounded fields, consent/version,
  printing/machining category and immutable submission digest.
- Canonical database-side payload hashing, unique request UUIDs and transaction
  advisory locking protect retries. Conflicting payloads are rejected. Every
  new enquiry stores its contact, creation history, audit event and pending
  notification together, or the entire transaction fails.
- An unverified email address never merges two guests into a shared identity.
  An enquiry reference grants no lookup or tracking access.
- No buckets, upload schema, payments, customer accounts or live migrations.

### Authentication and authorization foundation

- All six tables enable RLS, revoke anonymous/private mutation grants and allow
  reads only for an enabled owner allowlist member whose signed JWT has AAL2.
- Role helpers fix search_path and avoid recursive membership policies.
  Public function execution is explicitly revoked, including Supabase default
  anon/authenticated function grants. Only the intended roles receive execution.
- The owner route verifies identity through Supabase getUser, then delegates
  current role/MFA authorization to the database. Never authorize from getSession
  or client-editable metadata. The SSR client is per-request and cookie writes
  occur only in the Route Handler.
- Owner operations are read-only in this phase. Login/logout UI, invitations,
  MFA enrolment/challenge flows, inbox and administrative mutations are not yet
  implemented. No auth settings or users were created in a Supabase project.

This follows Supabase's [server-verified identity guidance](https://supabase.com/docs/reference/javascript/auth-getuser),
[MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa) and
[restricted function guidance](https://supabase.com/docs/guides/database/functions).

### Server endpoints and email safety

- POST /api/operational/enquiries is separately gated and off by default. It
  enforces origin, Worker IP/site limits, actual streamed 16 KiB body limits,
  strict allowed fields, consent, quantity and category validation before RPC.
- GET /api/operational/owner is separately gated and off by default. Responses
  are private/no-store; no customer data is returned by this authorization probe.
- The server-only repository lazily requires SUPABASE_URL and SUPABASE_SECRET_KEY,
  uses only the intake RPC, disables auth persistence and bounds RPC requests.
  It never prints connection details or credentials.
- Storage success returns stored/pending, not sent/accepted/delivered. The old
  form and provider-only Resend endpoint remain untouched; they are not yet
  connected to this path. A later form migration must make the database the
  single authoritative workflow, not run two competing submission paths.
- A unique pending outbox record survives notification failure. No dispatcher,
  lease acquisition/retry procedure, webhook, cron or real sending is enabled.
  Provider acceptance, uncertain outcomes and actual delivery remain distinct.
  See supabase/MIGRATION_RUNBOOK.md for recovery requirements before dispatch.

### Preserved behaviour

No changes to homepage markup, styles, branding, layered T, original gear,
scene adapter, preload policy, interaction math, reset or existing email handler.
No claimed performance improvement in this phase. Prior startup-performance
limitations remain open; no fresh Lighthouse score is inferred from old reports.

## Verification

| Check | Actual result |
| --- | --- |
| ESLint / TypeScript | Passed. |
| Existing unit tests | 29 passed. |
| New operational tests | 21 passed, including real embedded PostgreSQL migration/RLS/rollback execution, handler-to-SQL persistence and mocked repository transport. |
| Next.js production build | Passed on Windows; final Linux OpenNext invocation also rebuilt Next.js successfully after the last intake validation change. |
| Full Playwright suite | Final run: 53 passed, 13 existing browser-specific skips. Chromium desktop and WebKit iPhone emulation; no physical-device claim. |
| Browser first run | 52 passed, 13 skipped, 1 failure in the unchanged Chromium stalled-request recovery test. Same test passed in isolation and in the second full run without assertion, timeout or application changes. Intermittence is not claimed resolved. |
| Animation regressions | Existing T drag/keyboard/reset pixel checks, gear forward/reverse animation, original loading policy, mobile touch/scroll, short landscape controls, context loss and reduced-motion cases passed where supported. |
| Local native Worker harness | Existing mocked provider: five 202 then two 429. New mocked persistent store: five 201 then two 429. No genuine email/database transport. |
| OpenNext / locked Linux install | Passed in isolated Linux copy with all env files excluded, Node 24.11.1, Next 16.4.5 and OpenNext 1.20.16. |
| Wrangler dry run | Passed; 5350.56 KiB uncompressed / 1130.58 KiB gzip. No upload/deployment. All activation flags and indexing false. |
| Final local OpenNext Worker | Homepage 200; both scene containers present; robots disallows crawling and homepage remains noindex; owner, persistent intake and provider-only API all return 503 while disabled. |
| Dependency audit during clean install | 11 moderate advisories, no high/critical reported. One pinned development-only PostgreSQL test dependency added; existing dependencies not upgraded. |
| Full Supabase Auth/PostgREST integration | Not executed: no Docker/local Supabase stack. Simulated auth SQL functions are explicitly test fixtures. Multiple-connection races remain unverified despite the database advisory lock/unique constraint design. |
| GitHub CI | Not run for this branch; nothing pushed. Existing workflow automatically includes new operations tests through npm test. |

The initial sandboxed Next build stalled before output; a local process escalation
completed the Windows build. The tool runtime restarted during Linux validation;
saved logs confirmed that OpenNext, dry run and HTTP tests had completed. No
source work was discarded or tests relabelled based only on expected behaviour.

Raw local evidence is under `artifacts/operational-phase-1/`: opennext-build.log,
wrangler-dry-run.log, worker-http.log, initial failure trace and screenshots.
Desktop/mobile homepage screenshots use the existing reduced-motion capture
test; gear-assembled.png is the active WebGL test capture. These are unchanged
frontend evidence, not screenshots of a completed owner dashboard.

No fresh Lighthouse benchmark was run: no frontend/startup code changed, and
this phase makes no performance-improvement claim. Hardware GPU, physical phones,
real MFA, real database connection and Gmail delivery are unverified.

## Files changed

- docs/OPERATIONAL_IMPLEMENTATION_PLAN.md: resolved authoritative requirements.
- supabase/migrations/202611230001_operational_core.sql and
  202611230002_persistent_intake.sql: local schema, policies, restricted RPCs.
- supabase/MIGRATION_RUNBOOK.md: application gates, local tests and recovery.
- src/lib/operations/{intake,repository,owner-access}.ts: bounded intake,
  server-only persistence and verified-identity/owner authorization.
- src/app/api/operational/{enquiries,owner}/route.ts: disabled-by-default routes.
- tests/operations-{database,intake,repository}.test.ts: 21 regression checks.
- tests/browser/operations-gates.spec.ts: disabled-route privacy checks.
- tests/worker/enquiry-worker.ts and scripts/test-worker.mjs: native Worker
  persistent-handler/rate-limit checks with mocked storage.
- package.json/package-lock.json: pinned PGlite development dependency and test
  script inclusion. PGlite is not imported by application runtime code.
- .env.example and wrangler.jsonc: documented settings and false activation flags.
- docs/OPERATIONAL_PHASE_1.md: this report.

## Remaining dependencies and owner decisions

1. Full local Supabase integration (Auth, PostgREST, real signed MFA sessions and
   concurrent database connections) before any activation. Embedded PostgreSQL
   tests use Auth stand-ins and do not replace that gate. No Docker, psql or
   Supabase CLI was found on the host during tool discovery.
2. Review the new schema/RPCs and authorize a read-only inventory of the intended
   hosted target before a separately approved apply. No implicit database reset.
3. Owner identity for invitation/bootstrap and MFA; configure through secure
   project settings, not by sending passwords or keys in chat.
4. Approved privacy notice/version, retention/deletion process and backup/restore
   policy before collecting real personal data.
5. Fateen's approved service copy, contracting entity and routing/contact;
   referral consent alone does not authorize automatic forwarding. No Fateen
   staff roles are granted in this owner-only phase.
6. Next development phases: login/logout/MFA UI and inbox; persistent form
   connection; durable notification processor/reconciliation; quotation/order
   tables and workflows; PDF output; approved catalogue; production/materials.
7. Genuine Resend delivery remains an explicit owner-approved test requiring a
   verified sender domain and securely configured credentials. It is not
   exercised by mocked provider/storage tests.

All activation flags and indexing remain false. No merge, push, deployment,
DNS change, live database write or authentication configuration was performed.
