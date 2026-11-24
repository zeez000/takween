# Operational migrations and local security tests

These migrations are prepared for review, not applied to hosted Supabase.
Phase 2 has executed all seven migrations against actual disposable local Supabase.
See ../docs/OPERATIONAL_PHASE_2_RUNBOOK.md for real Auth/MFA/PostgREST tests and
the new owner, intake and notification security boundaries. Embedded tests below
remain useful fast tests, but are no longer the only local database evidence.
Do not run the historical `schema.proposed.sql`. It remains an archived design
with different names and broader deferred features.

## Local verification

Run `npm ci` and `npm run test:operations` on Node 22+ (CI uses 24).
The tests execute the actual migration SQL and RLS in disposable in-memory
PGlite PostgreSQL. PGlite is a development dependency, not a runtime database.
Test fixtures define stand-ins for Supabase auth.users, auth.uid and auth.jwt.
Tests use synthetic example.invalid contacts only and no configured env files.

This verifies PostgreSQL constraints, grants, policies, function bodies and
transaction rollback. It does not verify GoTrue sessions/MFA, PostgREST schema
exposure, hosted role defaults, multiple simultaneous database connections or
Supabase service credentials. Full local Supabase integration remains required
before activation; do not mark embedded SQL tests as that integration test.

## Hosted apply gate (owner approval required)

1. Inventory current database objects and migration history read-only. Check for
   a pre-existing takween schema and public.takween_* functions. Migration 001
   intentionally fails if its schema already exists; it must not overwrite data.
2. Review owner identity/bootstrap, invitation-only authentication, MFA enforcement,
   privacy notice/version, retention/deletion and recovery procedures. Obtain an
   approved backup/restore method; do not assume hosted free-tier backups.
3. Review SQL in order: core, then intake. Do not expose the takween schema via
   the Data API. No auth settings, buckets or email integrations are created here.
4. Exercise the SQL in full disposable local Supabase first, including PostgREST
   calls with anon, ordinary authenticated, AAL1/AAL2 owner and service identities.
   Test concurrent retries on separate connections. Do not use production keys.
5. Apply only to the separately approved project through a controlled migration
   process. No CI workflow in this branch applies SQL or provisions infrastructure.
6. Independently verify grants/RLS and no unauthorized private reads. Bootstrap
   the owner allowlist from a controlled admin channel, never public signup or
   user-editable metadata. No bootstrap SQL executes automatically.
7. Configure server-only SUPABASE_URL/SUPABASE_SECRET_KEY securely. Public client
   helpers retain the existing publishable settings. Never put a secret into a
   NEXT_PUBLIC variable, browser bundle, report or chat.
8. Keep PERSISTENT_ENQUIRIES_ENABLED, OPERATIONS_ENABLED and ENQUIRY_ENABLED false
   until each workflow and its credentials are approved and tested. Notification
   dispatch is not implemented in this phase. Never enable the old provider-only
   endpoint and new persistence path as competing authoritative intake workflows.

## Reversal and preservation

Each migration is transactional. Invalid intake rolls back contact, enquiry,
history, audit and outbox as one unit. Successful records are never removed by
rollback scripts. Do not introduce a production down migration that drops
customer tables; use forward repairs after review. Disable new endpoints first
if activation must be reversed; preserve stored requests for owner recovery.

## Notification recovery design

The same database transaction creates the enquiry and its unique pending outbox
record. Retrying the same UUID and payload returns the existing reference. A
changed payload with that UUID conflicts. Unique references are not credentials.

The next phase must provide bounded leasing, stable provider idempotency keys,
backoff and manual reconciliation after uncertain acceptance. Track provider
acceptance separately from delivery; never duplicate a late send after the
provider's deduplication window without owner review. No background process,
queue, cron, webhook, test email or forwarding to Fateen is activated here.
