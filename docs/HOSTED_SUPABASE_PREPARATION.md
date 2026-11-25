# Hosted Supabase controlled activation preparation

## Owner inventory reconciliation - 26 November 2026

Owner confirms all 18 sections executed read-only on PostgreSQL 17.11: no
takween schema, inspected application objects/policies/functions or migration
history table. Managed Supabase schemas and Storage triggers remain. Treat this
as uninitialized TAKWEEN application state, NOT an empty project. Auth user and
Storage contents remain unknown pending aggregate-only checks. Earlier access
limitations below are historical; this new evidence is owner-provided, not an
independent hosted execution by the agent.

The exact 001-011 SQL overrides broad inherited grants per object; it deliberately
does not rewrite global default privilege templates. New local regression tests
confirm effective grants/RLS under broad schema/table/function defaults and
detect an injected unsafe grant. No managed-role/default-privilege edit is needed
to hide the reported warning. Future migrations must explicitly revoke/regrant.

See HOSTED_ACTIVATION_PACKAGE.md for the frozen offline 001-011 package,
aggregate Auth/Storage checks, manual signup instructions and nine post-migration
catalog checks. The package is built from pinned Git blobs, not the moving
business-sprint migration folder. **Never push later local migrations to hosted
as part of this 001-011 review.** No hosted migration/Auth change or backup export
has run. Business-policy, backup/restore and activation approval gates remain.

## Read-only availability refresh - 26 November 2026

The repeated preparation request was checked without repeating development or
changing hosted resources. Branch/head remain codex/combined-release at
2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57. Existing preparation files survived the
interrupted tool runtime. An intermediate saved check on 25 November had an Auth
health timeout; it was not treated as a successful availability result.

Fresh GET-only checks on 26 November at 00:38 IST returned Auth health 200,
public Auth settings 200 (disable_signup=false, email enabled, anonymous users
disabled), and REST metadata 401. Evidence is the ignored file
artifacts/hosted-supabase-availability-2026-11-26.json. No management/SQL call,
signup/login/invitation, migration, resume or email was made during this refresh.
Auth reachability still does not establish PostgreSQL/compute status. There is
still no configured Supabase connector; the prior management/database access
limitations below remain unresolved. Hosted tables/history/RLS/admin settings
have NOT been independently verified. Do not infer an empty/unmigrated database.

The activation decision remains NO-GO pending the metadata inventory, confirmed
backup/restore procedure and separate owner approvals. The original preparation
and its evidence boundaries follow below.

Prepared 25 November 2026 (Asia/Calcutta), from `codex/combined-release`, verified
commit `2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57`. Preparation only. No hosted
SQL, migration, backup export, account creation, auth change, deployment, email,
feature-gate, DNS or indexing activation was performed.

## Current evidence and inspection limits

| Item | Actual result |
| --- | --- |
| Repository | Correct branch/head; working tree initially clean; application/migrations remain unchanged. |
| Target configuration | Public URL/key located in the existing original checkout of this same repository, used in memory only. Target matched the previously identified project. No values printed or copied into this report. This audit worktree has no .env.local. |
| Hosted Auth health | GET /auth/v1/health returned HTTP 200. |
| Hosted public Auth settings | GET /auth/v1/settings returned HTTP 200: disable_signup=false, email enabled, anonymous users disabled. No signup, invitation or login attempted. |
| Hosted REST metadata | GET /rest/v1/ returned HTTP 401, including a check with SDK-equivalent publishable headers. No customer rows requested. This is not evidence that RLS passed or that tables are empty. |
| Management access | No Supabase connector, process management token, linked project or successful authenticated CLI project listing available. No management credential extracted or requested in chat. |
| Project paused/active state | Previously owner-reported paused. Auth is reachable now, but database compute status/PostgreSQL connectivity is unverified. Do not claim a resume occurred or initiate one. |
| Hosted tables, migration ledger, SQL definitions, grants/RLS, MFA and session settings | **Unverified**: authorized catalog/management access unavailable. Cannot assert migrations are unapplied or database empty. |
| External automation | Retain owner-confirmed Cloudflare repository integration disconnected; Supabase production deployment OFF, no production branch, automatic branching OFF, preview limit 0. No settings changed. |
| Resend-to-Gmail | Owner now confirms isolated test receipt. This validates that test path, not application delivery, verified-domain readiness or current Worker key validity. Full-access test-key revocation still needs owner confirmation. |

**Confirmed configuration gap:** public signups are reported enabled, whereas
TAKWEEN's intended owner access is invitation-only. Obtain approval to disable
signup before owner activation. Signup availability alone does not bypass the
separate allowlist/AAL2/RLS; current hosted policies still require inspection.

Sanitized network results are in ignored artifacts/hosted-supabase-readonly-check.json
and artifacts/hosted-rest-metadata-check.json. Public Auth settings are only a
small subset of administrative Auth configuration.

## Read-only database comparison gate

The prepared [inventory SQL](../supabase/inspection/hosted-readonly-inventory.sql)
uses BEGIN TRANSACTION READ ONLY, bounded timeouts and metadata-only SELECTs.
Its copyable revision returns 18 section/metadata rows in one result set, masks
custom role names and withholds raw expressions/definition bodies. Migration
versions are included as XML inside the metadata JSON; names/statements are not
returned. Missing or unreadable migration history is reported explicitly.
It inventories schemas, relations, columns, constraints/indexes, RLS/policies,
grants, function security/config/ACL fingerprints, triggers, extensions and
presence of the migration ledger. It reads no customer rows, auth identities,
password hashes, MFA seeds, JWT keys, Vault secrets or function bodies. Metadata
exports still deserve private review before sharing.

The inventory SQL passed syntax/catalog execution in disposable embedded
PostgreSQL with transaction_read_only=on. A read-only test against the retained
native local database was unavailable (ECONNREFUSED); no recovery/restart was
attempted. Neither result is hosted database verification.

Owner action: run this SQL through an already authorized SQL Editor/connection,
if available. If the project must be resumed first, obtain a separate resume
approval; do not do it as a side effect of inspection. The same block inventories
the ledger if it exists and is readable. Share only reviewed object/version
metadata, not credentials or data. Local validation covers missing/existing
history and synthetic sensitive-value canaries, not hosted security behavior.

Compare against the verified 11 files and the exact-byte
[SHA-256 manifest](../supabase/inspection/migrations-001-011.sha256):

Manifest hashes use canonical Git blob bytes at the verified commit. Windows
CRLF working copies may have different raw file checksums without SQL drift;
verify Git blobs (or a canonical LF checkout) rather than silently accepting or
rewriting a mismatched migration. All 11 current Git blobs match that commit.

| Version suffix | File / required effect |
| --- | --- |
| 001 | 202611230001_operational_core.sql: private takween schema; customers, enquiries, events, owner roles, audit and notification outbox; allowlist/AAL2 read boundaries. |
| 002 | 202611230002_persistent_intake.sql: service-only transactional intake. |
| 003 | 202611230003_owner_inbox.sql: notes and owner inbox/note RPCs. |
| 004 | 202611230004_outbox_leases.sql: fenced notification claims/outcomes, retries and uncertainty holds. |
| 005 | 202611230005_owner_provisioning.sql: allowlisted identity-only onboarding permission, not data access at AAL1. |
| 006 | 202611230006_intake_receipt_state.sql: authoritative replay notification state. |
| 007 | 202611230007_owner_request_details.sql: recorded preferences/process/consent in owner inbox. |
| 008 | 202611230008_quotations.sql: quotations, items, history, retry ledger and immutable/versioned commercial commands. |
| 009 | 202611230009_orders_production.sql: unique accepted-quote orders, events, production entries and transitions. |
| 010 | 202611230010_command_namespaces.sql: guarded public command facades and retry namespaces. |
| 011 | 202611240011_quotation_revision_visibility.sql: owner-only superseded/latest-revision metadata. |

Expected final takween tables: admin_roles, customers, enquiries, enquiry_events,
notification_outbox, audit_events, enquiry_notes, quotations, quotation_items,
commercial_events, commercial_requests, orders, order_events, production_entries
(14 total). All require RLS. commercial_requests has no client read policy/grant,
including owner access; it is the private command receipt ledger. Other private
reads require the current enabled owner AND AAL2. Ordinary users/anonymous users
have no access. Underlying direct writes are not granted; narrow authorized RPCs
own mutations. Keep takween OUT of exposed Data API schemas; use public facades.

A matching version number alone is insufficient: compare DDL, constraints,
indexes, role grants, policies, function bodies/search_path/owners, receipts and
expected RPC signatures privately. Function fingerprints in the inventory are
drift aids, not proof that the hosted SQL equals migration source. Existing unknown
objects or policies need review. Never baseline/repair migration history merely
to make a push pass. If takween already exists without matching history, STOP:
001 intentionally fails instead of overwriting it. Preserve legacy public tables
and unrelated data; never run historical schema.proposed.sql.

## Backup and restoration procedure (not executed)

No backup exists as a result of this task, and no restore has been proved here.
Choose an owner-approved encrypted private destination outside the repository,
Git artifacts, OneDrive/shared folders and CI uploads; restrict ACLs to the backup
operator. Dumps may contain customer information, password hashes and MFA data.
Approve retention, encryption-key custody, recovery point/time targets and who
can restore. Take a pre-change backup and a second post-migration checkpoint.

After availability/inventory and separate backup approval:

1. Confirm the database project, Postgres version, endpoint and approved read-only
   backup identity. Use direct access where IPv6 is available, or a verified
   session-mode pooler for IPv4; no paid IPv4 add-on is assumed. Require provider-
   supported TLS verification. Never put a password/complete secret-bearing DSN
   into command arguments, shell history, reports or Git.
2. Agree a consistent quiet window for external writers/jobs. Current application
   gates remain off. A single pg_dump snapshot captures schema/data coherently;
   role/config exports are separate and need the same approved change window.
3. Use a compatible PostgreSQL client. With non-secret PGHOST/PGPORT/PGUSER/
   PGDATABASE/TLS settings supplied securely, these are example local export
   commands (NOT executed; BackupDir must be the approved encrypted location):

   ```powershell
   pg_dump --format=custom --file "$BackupDir/database.dump" --password
   pg_dumpall --roles-only --no-role-passwords --file "$BackupDir/roles.sql" --password
   pg_restore --list "$BackupDir/database.dump" > "$BackupDir/contents.txt"
   Get-FileHash "$BackupDir/database.dump" -Algorithm SHA256
   ```

   Passwords are entered at the native hidden prompt, not assigned in these
   commands. Export errors/permission omissions are blockers, not warnings to
   suppress. Do not assume a new read-only role can be created under this task.
4. Review dump coverage against the inventory: takween/public custom objects,
   data, constraints/grants/policies, migration history, auth users/identities/MFA
   dependencies if any, and managed-schema customizations. Export non-secret
   Auth/API/SMTP/URL/provider settings separately. Default CLI schema dumps omit
   managed schemas/data/roles; a schema-only export is NOT a full backup.
5. Storage metadata is not object content. If existing buckets/files are found,
   inventory/export blobs separately under explicit data-access approval. Uploads
   are deferred, so do not create new buckets. Inventory Vault/encryption and
   extension dependencies: ciphertext without needed key material is not a
   restorable backup. Never extract keys into this report or chat.
6. Prove recovery in a disposable isolated Supabase environment matching supported
   versions. Keep SMTP, cron/pg_net/webhooks, external integrations and outgoing
   notifications disabled in the clone. Review the archive table of contents;
   restore only the approved compatible custom roles/schema/data/Auth dependencies
   in FK-safe order. Never blindly replay managed Supabase roles/auth/storage DDL
   or a full archive over the existing hosted project. Use error-stop/transactional
   restoration where supported, without hiding permissions failures or casually
   disabling integrity checks. Consult the official managed-schema restore path
   for the actual inventory before approving exact restore commands.
7. Compare aggregate counts, reference integrity, migration versions, RPCs, grants
   and RLS; verify synthetic Auth/AAL2 and transactions in the isolated restore.
   Approve recovery only after the drill passes. Do not send real user credentials
   to the clone or publish its data. A hosted in-place restore needs new explicit
   approval and a current backup; normal rollback should preserve additive schema.

Free lacks the paid daily-backup/PITR guarantees. Database dumps do not include
all project settings or storage blobs. The official backup/restore guides below
remain the authority for provider-managed restore constraints.

## Controlled migration sequence (future, separate approval)

1. Finish hosted inventory, exact migration-history comparison and backup/restore
   drill. Review existing extensions/jobs/webhooks and all business decisions.
   Confirm automation remains disabled and all application/email gates stay false.
2. Use an isolated deployment checkout pinned to 2e841cd, not a moving branch.
   Verify all 11 manifest hashes. Do not reinstall/update working dependencies or
   silently upgrade the inspected Supabase CLI 3.2.0 to the offered 3.4.0.
3. Establish the separately approved migration connection securely. CLI linking/
   temporary login-role creation/history writes are NOT read-only and need that
   authorization. Do not run db pull here: it can alter remote migration history.
4. Pinned 3.2.0 local help was inspected, without a remote push. Its remote target
   syntax is --remote=<ref|branch|url>; use the verified project ref, NOT a DSN
   containing a password. The push operation can update Vault before migrations:
   always add --skip-vault. Do not use --include-all, --include-seed,
   --include-roles or --yes. Dry-run preflight can still authenticate/provision
   connection metadata; it is not approved by this read-only preparation task.
5. Once approved, preview and review the exact pending sequence:

   ```text
   supabase db push --remote=<owner-verified-project-ref> --skip-vault --dry-run
   ```

   Supply credentials through the approved local hidden prompt/profile workflow,
   not --password <value>, environment dumps or chat. Stop if that workflow is
   unavailable; do not silently expand token permissions. Only after explicit
   apply approval run the same command without --dry-run. The reviewed driver
   must track migration history. Do not manually execute files then fake history.
6. Fresh target: apply 001,002,003,004,005,006,007,008,009,010,011 in that order.
   Matching already-applied versions: only the verified remaining suffix. Each
   migration has its own transaction; the full batch is NOT globally atomic.
   Stop at the first error/unexpected difference. Confirm actual committed versions
   before retrying; never reset, drop data, force include-all or rewrite old SQL.
7. Re-inventory and compare grants/RLS/functions/columns/indexes/history. Verify
   anonymous/non-owner/AAL1 denial before owner or customer activation. No owner
   bootstrap row or user is created by migrations. Keep gates false until the
   next explicitly approved stages. Back up the successful checkpoint.

Normal rollback: disable any separately activated application gates, retain data,
history and outbox, revert application changes through review if needed, and use
approved additive SQL repairs. Do not drop customer tables to undo this schema.

## Owner authentication, session and recovery gates

- Approve disabling public signup (currently reported enabled), anonymous signup
  and unused auth providers. Keep phone/SMS off; enable TOTP enrollment/verification
  only with approval. Do not confuse Supabase dashboard MFA with app-owner MFA.
- Confirm the exact owner identity and invitation delivery path. Built-in Supabase
  SMTP restricts recipients to organization team addresses and has tight limits;
  Resend account ownership is not proof of Supabase-team eligibility. A controlled
  generateLink/manual invitation can avoid sending mail, but creates an Auth user
  and secret one-time link, requiring separate approval and private delivery.
- Only a controlled administrative channel creates an exact auth.users UUID
  allowlist row in takween.admin_roles. Never authorize by editable user metadata,
  an email-domain wildcard or publishable/service keys in browser code.
- Approve Auth Site URL and precise allowed callback, invitation template using
  token_hash/type=invite and the existing /owner/callback route. No wildcard
  redirects. Tokens/OTP/passwords/MFA secrets must not enter logs/chat/screenshots.
- An allowlisted AAL1 identity may onboard MFA but cannot read customer data. AAL2
  AND current enabled membership are checked in RPCs/RLS and server verification.
  Non-owner AAL2 also remains denied. Test removed/disabled roles and stale tokens.
- Review JWT lifetime, refresh rotation/reuse behavior and secure HTTPS cookie
  settings against actual deployed configuration. Free does not include paid
  inactivity/time-box/single-session controls: do not promise them or implement
  a pretend client-only substitute. Hiding clears views; it is not session expiry.
- Approve MFA recovery custodian, secure authenticator backup/secondary method,
  identity verification, factor-reset/session-revocation process and incident log.
  Emergency allowlist disable blocks further RPC access; never weaken AAL2 to
  regain access. Test recovery on synthetic accounts before real activation.

## Cloudflare configuration (identify only, no updates)

| Setting | Purpose / activation boundary |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Correct hosted public configuration at build time; existing helpers require sb_publishable_ format. These are not privileged credentials. Changing them requires a separately approved build/deploy. |
| SUPABASE_URL | Server runtime URL for persistent intake/outbox, matching the same project. |
| SUPABASE_SECRET_KEY | Encrypted server-only Worker secret; code requires sb_secret_ format. Legacy service-role JWT would currently fail configuration validation. Never expose through NEXT_PUBLIC, browser or logs. |
| ENQUIRY_PRIVACY_NOTICE / ENQUIRY_PRIVACY_VERSION | Owner-approved notice text/version, including Fateen consent boundaries. |
| SITE_URL | Keep the existing approved HTTPS preview origin. |
| REQUEST_ORIGIN | Leave unset to use SITE_URL in hosted operation. No wildcard or localhost override. |
| ENQUIRY_IP_LIMITER / ENQUIRY_SITE_LIMITER | Retain existing native Worker bindings; 5/min IP and 30/min site settings. Limits are approximate/per-location, not a global daily sending budget. |
| PERSISTENT_ENQUIRIES_ENABLED / OPERATIONS_ENABLED | Both false until separately approved controlled testing/activation. |
| ENQUIRY_ENABLED | Keep legacy provider-only gate false; do not compete with durable intake. |
| ENQUIRY_NOTIFICATIONS_ENABLED | False, including hosted persistence/owner tests until real dispatch approved. |
| RESEND_API_KEY / RESEND_FROM_EMAIL | Existing encrypted secret not read. Confirm sending-only scope and revoked full-access test key with owner. Production code rejects resend.dev; configure a verified-domain sender only after owner-approved domain/DNS work and email activation. Owner-confirmed isolated Gmail receipt does not satisfy this gate. |
| SITE_INDEXING_ENABLED | Remain false; owner/private routes retain noindex/private cache headers. |

No paid service, queue, scheduler, storage bucket or webhook is required or
provisioned. Existing dispatcher is owner/AAL2-triggered and handles one job per
call; no unattended production dispatcher is being promised.

## Free-plan fit and operational risks

Reviewed official pricing: 500 MB database, shared CPU/500 MB RAM, 50,000 MAU,
5 GB egress plus 5 GB cached egress, 1 GB storage and two active Free projects.
TOTP/basic MFA is included; phone MFA and advanced session controls are not.
No paid feature is needed for these PostgreSQL/RLS/Auth/PostgREST RPCs. Uploads,
Realtime and customer accounts remain deferred. Local private storage plans do
not imply hosted buckets exist.

Free projects can pause after a week of inactivity; unsuitable for a guaranteed
always-on business promise without an owner-approved availability decision.
No automatic keepalive job or paid upgrade is authorized. Actual project size,
connections, region, storage, backups and quota usage are unverified. Monitor
growing append-only audit/receipt/outbox data; do not prune without an approved
retention policy. Backup downloads consume egress; budget them. Auth audit logs
have short Free retention, so an approved incident/backup process is necessary.

## Synthetic hosted end-to-end plan (not executed)

Use a dedicated local test build pointing to the separately approved hosted
project; do not change the existing public Worker. Hosted writes, auth/user
creation, MFA config, environment settings and test gates each need approval.
Do not run scripts/test-local-supabase.mjs against hosted: it is loopback-only and
creates local fixture/migration state deliberately unsuitable for production.

1. Capture baseline counts/versions; use synthetic example.invalid contacts only.
   Public intake tests use printing and consented Fateen categories. Assert one
   customer/enquiry/reference/events/audit/outbox transaction, same UUID replay,
   changed-payload conflict, invalid-input rejection and concurrent uniqueness.
2. Use separately approved synthetic Auth identities: anonymous, ordinary AAL1,
   ordinary AAL2, allowlisted AAL1 and allowlisted AAL2. Prove denied private reads,
   mutations and enumeration except permitted owner AAL2; provisioning-only AAL1
   must not reveal records. Inspect responses for no-store and safe errors.
3. Test owner invite/MFA/logout, stale-response/tab-hide cleanup and role removal;
   desktop/mobile emulation plus representative physical iPhone/Android testing.
   Never reuse real owner passwords/MFA seeds in automated fixtures.
4. Create synthetic quotation/items, explicit test tax/terms/entity, revisions,
   PDF privacy/supersession, acceptance races, unique order conversion, category
   transitions, holds, terminal restrictions and append-only production history.
   Test values are not commercial policies or approved pricing.
5. Keep notification gate false; verify a durable pending outbox record, no real
   Resend network call, and storage-only customer confirmation. Mock provider
   rejection/timeout/429/acceptance for dispatcher tests in an isolated test
   transport. Do not replace the hosted provider configuration to simulate errors.
6. Exercise controlled storage/acknowledgement failures through local injected
   transport or disposable staging, never by corrupting hosted tables or pausing
   the real project. Verify rollback/idempotent recovery and no fake success.
7. Retain synthetic records for review and label test provenance. No automatic
   cleanup/deletion; any cleanup requires separate approval and FK/audit review.
   Do not include private rows, credentials, cookies or invitation URLs in CI logs.

## Approval sequence and current decision

**NO-GO for hosted migration or activation now.** Ready to review this preparation,
not proof of hosted readiness. Required next actions:

1. Owner confirms current compute/paused state and provides the metadata-only
   inventory/history plus administrative Auth settings through a secure review
   path. If needed, separately approve resuming for read-only inspection.
2. Approve backup operator/location/retention/RPO/RTO and a restore drill, then
   authorize necessary read-only exports; do not submit DB passwords in chat.
3. Resolve schema drift and business decisions in PHASE_3_BUSINESS_DECISIONS.md;
   approve invitation-only Auth, TOTP/recovery and owner bootstrap separately.
4. Review the exact pending migration list and grant explicit apply approval.
5. Separately approve synthetic hosted writes and isolated local test gates. Only
   after successful tests consider a controlled application deployment/activation.
6. Production-domain Resend configuration, genuine dispatch, DNS and indexing
   remain separate decisions. No implicit activation from the successful test.

No commits/pushes were requested for this preparation; new files are local for
review. No existing source, migrations 001-011, animations or styling changed.

## Official references checked 25 November 2026

- [Pricing and Free limits](https://supabase.com/pricing)
- [Backups](https://supabase.com/docs/guides/platform/backups)
- [Managed backup/restore caveats](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Session controls](https://supabase.com/docs/guides/auth/sessions)
- [Auth SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp)
- [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [CLI command reference](https://supabase.com/docs/reference/cli/introduction)
