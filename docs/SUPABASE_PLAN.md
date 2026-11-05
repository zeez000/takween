# Supabase implementation proposal — approval required

No backend implementation or migrations are authorised by this proposal.
The existing frontend, local-only quote draft, public admin outline and tracking
outline remain unchanged. Supabase contains schema.proposed.sql and README.md;
there are no applied/versioned migrations or runtime Supabase SDK/client.

## Minimal release and data model

Reuse proposed customers, enquiries, design_files, admin_users, quotes,
quote_items, orders, order_events, production_jobs, tracking_tokens and audit_events.
Defer inventory, payments and catalogue mutations to their own milestones.
Before approval, add to the design: enquiry request_type, colour, deadline,
consent_version/consented_at, unique idempotency key, updated_at; file validation
result and retention timestamp; order public reference (never access authority).
Use UUID internal IDs, integer INR paise and timezone-aware timestamps.
Do not apply the existing design-only SQL as a migration.

## Intake and private design files

Proposed server POST /api/enquiries validates contact, bounded quantity/text,
material allowlist, consent, request mode and idempotency. Rate limit by IP and
session, enforce quotas, and return only the new enquiry reference. Commit enquiry
and retry key atomically. Report success only after confirmed persistence.
Keep current draft flow until this is implemented and approved.

Private buckets: design-quarantine, design-files, quote-documents;
reference-images private if reference intake is enabled. No public design URLs.
Server allocates enquiry UUID/file UUID paths, never original names, disables
upsert, grants short-lived upload authorisation and verifies stored size/hash.
Initially propose 25 MiB/file and bounded file count; owner must approve quotas.
STL: parse bounded ASCII/binary structure, counts and finite coordinates.
STEP/STP: treat as CAD data; isolated conversion, never executable code.
3MF: archive-aware inspection with entry count, expanded-size and compression
ratio limits, no traversal/absolute paths, no symlinks, no nested archives or
external resources. Quarantine until validation succeeds. Never execute uploads.
Downloads require server authorisation and short-lived signed URLs. Retain failed
uploads briefly; approved retention/deletion policy required before launch.

## Authentication and authorisation

Supabase Auth invitation-only owner/admin accounts, MFA for privileged operations.
Use server-validated sessions; admin_users allowlist cannot be edited by clients.
Never infer authority from user-editable metadata. Enforce permissions in every
endpoint and database policy, not only route middleware. Protect state changes
with origin/CSRF checks and secure HttpOnly session cookies where appropriate.
Never expose service/secret credentials to browser bundles or logs.

## RLS matrix (to implement only after approval)

Anonymous: no reads/writes of customer, enquiry, quote, order or admin tables.
Intake: narrowly scoped server operation after validation; no arbitrary table proxy.
Authenticated customers: SELECT own enquiries/files/quotes/orders through verified
ownership; no pricing, status, admin membership or inventory writes.
Admin: explicit server-verified allowlist; audited business mutations.
Internal order notes: separate admin-only projection/table from public events.
Private storage.objects: ownership/admin checks; no anonymous listing or downloads.
Policies must not recursively query the same protected admin table. If an audited
SECURITY DEFINER helper is necessary, fixed search_path, minimal owner privileges,
explicit EXECUTE grants and tests are mandatory. Service keys bypass RLS: server
code must still enforce ownership and must not accept client-chosen customer IDs.

## Orders and tracking

Owner creates versioned manual quotations; no invented rates. Acceptance freezes
quote and creates order transactionally. Validate status transitions server-side.
Initial tracking: high-entropy expiring revocable token stored only as hash, exchanged
for a short-lived session; strip token from URL and use no-referrer/no-store.
Never permit access by sequential order reference alone. Return only permitted
status and customer-visible events, uniform invalid/expired responses and rate limits.
Customer authenticated portal can be added later after ownership tests.

## Credentials and Supabase settings

Proposed variables (not consumed by today's frontend): SUPABASE_URL,
SUPABASE_PUBLISHABLE_KEY, server-only SUPABASE_SECRET_KEY (or legacy
SUPABASE_SERVICE_ROLE_KEY, never both), APP_ORIGIN, TRACKING_TOKEN_PEPPER.
CI migration job only: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID and
SUPABASE_DB_PASSWORD, stored in protected environment secrets when needed.
Prefer local CLI stack in CI with generated ephemeral credentials, no production keys.
Configure .env.local locally (already ignored) and hosting environment settings;
never paste credentials into chat, Git, PR bodies or logs. Never use NEXT_PUBLIC_
for secret/service keys. A future browser auth client may use only a publishable key.

Create separate development/staging/production projects after owner approval.
Configure Auth site URL and exact redirect allowlist, disable public admin signup,
MFA, private buckets, quotas and email delivery. Review backup/restore and billing
limits before collecting customer data. No project or connection was created here.

## Migrations and integration gate

After schema/security approval: add ordered supabase/migrations files; test reset
only against disposable local databases; incremental non-destructive staging upgrade,
backup and rollback rehearsal before production. Never reset production.
Test anon/customer A/customer B/admin RLS and storage matrix with real local Auth
sessions; self-promotion, IDOR, replay, expired tokens, duplicate retries, invalid
uploads, ZIP bombs, ownership spoofing and partial failures. pgTAP constraints and
policy tests plus HTTP integration tests must pass. Mocks alone do not verify RLS.
Current live connection/RLS/storage tests are BLOCKED: no integration configured.

## Approval checkpoints

Approve final schema/ownership model, intake/contact/privacy policy, storage quotas,
retention and tracking access before migrations or backend implementation. Then
approve a staging-only implementation and verify tests before any production rollout.

References: https://supabase.com/docs/guides/getting-started/api-keys
https://supabase.com/docs/guides/storage/security/access-control
https://supabase.com/docs/guides/database/secure-data