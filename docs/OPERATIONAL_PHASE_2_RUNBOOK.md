# Phase 2 local operation and release gates

No hosted migration, authentication configuration, email activation or deployment
is authorized by this runbook. All tracked activation flags remain false.

## Disposable Supabase environment

The actual verification used Supabase CLI 3.2.0's experimental native Linux
runtime inside WSL2, without Docker Desktop. Services bind to loopback and the
stack is not linked to any hosted project. A dedicated SUPABASE_HOME keeps state
separate from other projects. Resolved versions: PostgreSQL 17.12.0.000-r0,
PostgREST v16.5-r0 and Auth v2.198.0-r0. Only database, REST, Auth and local mail
capture were enabled; storage and external messaging providers were not enabled.

References: [native runtime](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes)
and [isolated local projects](https://supabase.com/docs/guides/local-development/running-multiple-local-projects).
This runtime is experimental; keep the tested CLI version pinned for reproduction.

The active disposable project is under
`/home/userzeez/.local/share/takween-phase2/project` in WSL, with
SUPABASE_HOME `/home/userzeez/.local/share/takween-phase2`.
The downloaded CLI and private status live in ignored artifacts/phase2/.
The repository's Windows worktree metadata is not interpretable by the Linux CLI;
initializing inside the isolated Linux directory avoids modifying Git metadata.

For a fresh environment, copy supabase/local/config.toml into a NEW disposable
project's supabase/config.toml, use a dedicated SUPABASE_HOME, and run the pinned
CLI locally:

```bash
supabase start --stack takween-phase2 --runtime native \
  --exclude realtime,storage,functions,studio,analytics,pooler --eager \
  --output-format json > /path/to/checkout/artifacts/phase2/native-start.json
```

Do not print that JSON: it contains generated local keys. No CLI login, link,
hosted project reference, production password or production database URL is needed.
The actual tested config was initialized by CLI and changed only for disposable
native isolation, disabled signup and MFA testing; the minimal committed config
is a fresh-project template, not a live settings migration.

PowerShell verification, from the repository root:

```powershell
$env:TAKWEEN_LOCAL_INTEGRATION = '1'
$env:TAKWEEN_LOCAL_SUPABASE_STATUS = Join-Path $PWD 'artifacts/phase2/native-start.json'
npm run test:integration:local
```

The runner never loads application env files, rejects non-loopback endpoints,
requires an actual local-stack status artifact, and tracks applied migration
hashes inside the disposable database. Changed applied SQL fails rather than
being silently reapplied. It creates only synthetic example.invalid identities
and requests. Use a disposable stack, never real customer data. Invitations are
generated as local links without dispatching invitation emails.

## Owner workspace

The private UI is `/owner`; `/admin` retains the original default-preview outline.
No public signup or role-management UI exists. Bootstrap invitations and enabled
owner allowlist entries through a controlled administrative process only.
The invitation template must link to `/owner/callback?type=invite&token_hash=...`.
Never paste invitation tokens or passwords into reports/chat. The callback verifies
the one-time token with Auth, checks the current allowlist and redirects to a
fixed trusted origin. A valid invitation alone does not grant customer-data access.

Owner password sign-in or invitation acceptance establishes AAL1. Enrolment is
available only after a verified identity and enabled owner-membership check.
Customer reads and note writes still require AAL2 in Postgres. Authenticator setup
can replace abandoned UNVERIFIED factors with the same app name; it never removes
a verified factor. Workspace calls verify identity with getUser and database
authorization on every request. Server cookies refresh only in Route Handlers.
Credentials, authenticator codes and notes have no native form names; JavaScript
reads them by ID. Explicit POST fallbacks prevent pre-hydration/no-JavaScript
submissions from putting them in URLs. Owner authentication requires JavaScript.

Inbox search is literal, category-filtered and paginated in groups of 25. Customer
details, process/preferences, consent version, creation history and internal notes
come from stored records. Notes have retry IDs, append-only history/audit and no
direct table-write grants. Private responses use private/no-store and Vary: Cookie.
Logout revokes the Auth session and clears the view. Forbidden responses and
SIGNED_OUT events clear records; hiding the tab also hides loaded customer rows.
Actual clock-expiry at every possible Auth/session policy has not been exhaustively
tested; do not replace provider session verification with browser state.

## Enquiry persistence and browser retries

The form loads public intake configuration on first focus, not during hero startup.
Only approved notice text/version plus the persistence gate enable the new path.
Consent is explicit. Printing and machining are distinct categories; machining
requires process selection and independent referral consent. All routing remains
manual; no customer information is automatically forwarded to Fateen.

POST /api/operational/enquiries validates bounded streamed JSON, origin, native
rate limits and all fields before a service-only RPC. Contact, enquiry, history,
audit and notification are one transaction. Storage confirmation is distinct from
provider acceptance and inbox delivery. The legacy provider-only endpoint rejects
requests when persistent intake is enabled, avoiding competing authoritative paths.

Persistent mode saves only an opaque request UUID in sessionStorage. Form values,
customer details and files are not saved there. An unchanged request after reload
can reuse its reference; changed details with a reused UUID conflict instead of
overwriting records. Start a separate enquiry clears that nonce intentionally.
Blocked browser storage falls back to in-memory retries; cross-reload deduplication
is then unavailable. A new tab/session is not a globally deduplicated customer
identity. Never merge guest contacts based only on an unverified email address.

An independent 20-second UI deadline bounds both fetch and response parsing and
aborts the transport. No success is shown after an unconfirmed storage result.
The original 60-second browser-test limits and their assertions remain intact.

## Notification dispatcher

POST /api/operational/dispatch processes at most one job per call. It requires
the operations gate, separate notification gate, trusted origin, native workspace
rate limiting and an authenticated AAL2 owner. No cron, paid queue or automatic
email execution was provisioned. RESEND_API_KEY is server-only.

Claims use FOR UPDATE SKIP LOCKED and a random fencing token, with 120-second
leases. Stale or mismatched tokens cannot acknowledge a job. HTTP 429 schedules
bounded exponential retry; permanent 4xx rejection fails the job. Timeout, network
ambiguity, malformed success, 5xx and expired leases are held as uncertain for
manual review. Five attempts is the retry cap. A pending retry older than 20 hours
is held before exceeding the assumed provider deduplication safety window.
Resend currently documents a [24-hour key window](https://resend.com/changelog/idempotency-keys).
Review that policy before activation; do not promise exactly-once email.

Provider requests use a stable notification/job idempotency key. Acceptance requires
a nonblank provider ID. If the provider accepts but the database acknowledgement
fails, the result is unconfirmed; the lease/review process protects against blind
late retransmission. Uncertain jobs require owner review/reconciliation against
provider events before any new send. There is deliberately no unsafe public retry
or reset endpoint, and no claim that acceptance equals Gmail delivery.

## Environment settings

| Setting | Purpose / safety |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public project configuration; compile the isolated test build against local Supabase, not the hosted project. |
| SUPABASE_URL / SUPABASE_SECRET_KEY | Server-only intake and outbox RPC credentials. Never prefix with NEXT_PUBLIC or place in source. |
| OPERATIONS_ENABLED | Owner UI/API gate; tracked default false. |
| PERSISTENT_ENQUIRIES_ENABLED | Stored intake gate; tracked default false. |
| ENQUIRY_PRIVACY_VERSION / ENQUIRY_PRIVACY_NOTICE | Owner-approved version and displayed text; unset in tracked configuration. Synthetic local text is not a public policy. |
| ENQUIRY_NOTIFICATIONS_ENABLED | Independent real-provider gate; tracked and all local Worker tests false. Mock-injected tests may exercise the function with synthetic settings. |
| ENQUIRY_ENABLED | Legacy provider-only gate; false. Persistent mode blocks the legacy endpoint regardless. |
| RESEND_API_KEY / RESEND_FROM_EMAIL | Existing server-only provider configuration; verified sender and explicit approval required for genuine sending. |
| SITE_URL | Existing confirmed HTTPS canonical preview origin; do not set to a localhost URL. |
| REQUEST_ORIGIN | Optional single trusted origin for isolated local HTTP tests. Empty defaults to SITE_URL. Public cleartext URLs, paths, credentials, queries and fragments are rejected. No wildcard. |
| SITE_INDEXING_ENABLED | Remains false. Owner metadata is always noindex. |

Use ignored local env files or encrypted Worker settings, never chat/commits, for
real credentials. The enabled localhost test copy used generated local keys only;
the repository's default configuration remains inactive. The native site limiter
uses a separate owner-workspace key (30 requests/minute) before private API work;
public intake retains its existing IP/site keys. These are approximate per-location
limits, not a global daily email-budget guarantee.

## Migrations and rollback

001 and 002 remain immutable. Phase 2 adds:

- 003: owner-only bounded inbox and transactional, idempotent notes/history/audit.
- 004: fenced outbox claims, outcome recording, retry/backoff and uncertainty holds.
- 005: allowlist-only AAL1 onboarding permission, granting no customer access.
- 006: replay receipts report the actual outbox state rather than hardcoded pending.
- 007: authorized owner visibility of recorded process, preferences and referral consent.

The full phase-2 filenames are 202611230003_owner_inbox.sql,
202611230004_outbox_leases.sql, 202611230005_owner_provisioning.sql,
202611230006_intake_receipt_state.sql and 202611230007_owner_request_details.sql.

All seven executed only in disposable local Supabase. No hosted migration ran.
No bucket, upload, customer account, payment or automatic fulfilment feature was
activated. No mutation policy grants arbitrary table access to owners or clients.

Rollback begins by disabling the three operational/notification gates and retaining
ENQUIRY_ENABLED=false. Do not delete enquiries, notes, outbox, audit or migration
history. Additive schema can remain while application changes are reverted; use
reviewed forward repairs for database changes, not destructive down migrations.
For local cleanup only, run the pinned CLI `stop --stack takween-phase2` from the
dedicated Linux project with its dedicated SUPABASE_HOME. Destroy only that known
disposable stack when its synthetic evidence is no longer needed.

## Before hosted activation

Owner approval is still required for hosted migrations, owner invitation/MFA
settings, real sender/domain configuration, email testing, deployment and indexing.
Approve privacy/retention/deletion and backup/restore procedures first. Configure
invitation templates/redirects and disable public signup in the actual target.
Confirm Fateen authority, contracting identity and routing before any referral.
Do not log invitation token hashes, cookies, authorization headers or enquiry PII.
Private local status/fixture/trace artifacts must not be uploaded or committed.
