# Frozen hosted package: migrations 001-011

Prepared 26 November 2026. **NOT AUTHORIZED TO APPLY.** Source pinned to
2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57. No application feature gate, deployment,
Supabase setting or real email is enabled by preparing this package.

## Reconciled state

Owner executed all 18 read-only inventory sections on 26 November and reports
PostgreSQL 17.11, read-only confirmed, no takween schema, no inspected application
relations/functions/policies, and absent migration history. Supabase-managed
schemas and Storage triggers remain present. This is an **uninitialized TAKWEEN
application**, not an empty project. Raw export has not been independently
re-executed by the agent. Preserve managed schemas, existing users and storage.

All 11 migrations are candidates in original order. 001 creates a new private
schema and intentionally fails on collision. 002-007 implement intake, owner and
outbox; 008-011 implement commercial operations and supersession. No migration
changes managed Auth settings, creates an owner account or configures Storage.

## Defaults versus effective object permissions

001-011 do NOT rewrite project-wide ALTER DEFAULT PRIVILEGES templates. They
explicitly revoke inherited PUBLIC/anon/authenticated/service_role access for
each TAKWEEN schema/table/function and regrant the narrow required permissions.
Owner reads require enabled allowlist membership AND AAL2. Direct writes are not
granted to clients; command receipts have no client read grants/policies. Public
intake/outbox RPCs are service-only. Unrelated managed grants are left intact.

The added local regression applies the exact 001-011 SQL with deliberately broad
table/function/schema defaults, checks effective privileges including inheritance,
checks AAL1/non-owner denial and AAL2 membership visibility, and verifies that an
unsafe grant is detected. It does not pretend to replace real hosted Auth tests.
Global defaults remain broad: every future migration must repeat explicit grants/
revokes and security tests. Do not revoke global defaults indiscriminately or
modify managed roles to make a dashboard warning disappear.

## Completed Auth / Storage aggregate inspection

Owner reports successful aggregate inspection on 26 November 2026: Auth users,
identity rows, MFA factors, verified TOTP factors, Storage buckets, public buckets
and object metadata rows are all **0**; bucket configuration is empty. Combined
with the earlier catalog inventory, TAKWEEN is uninitialized with no identified
Auth users or Storage objects. This is owner-provided evidence, not an independent
agent execution, and does not prove all managed schemas contain no data.

No repeat aggregate inspection is required during this preparation. If writes
occur before the approved migration window, reconcile that change first.
The minimal baseline and restore gate are in FRESH_HOSTED_BASELINE_RUNBOOK.md.
There are no identified user accounts, MFA factors or object blobs to transfer.
Preserve managed metadata, role grants/default privileges and project settings.

## Owner checks still required

The aggregate check above is complete. Do not rerun it merely to satisfy an old
checklist. Retain the sanitized result privately with the baseline backup record.

Approve the encrypted backup location/operator and recovery targets. Use free
local disk + an existing/free encryption tool with private key/password custody;
no hosted paid backup/PITR or paid preview branch is assumed. Keep backups outside
Git, ignored application artifacts and shared/OneDrive folders. Use PostgreSQL 17
clients and verified TLS; password prompts, never secret DSNs in command history.

Before migrations, take a consistent database archive and separate non-password
role/config inventory as detailed in HOSTED_SUPABASE_PREPARATION.md. Include
managed Auth/Storage metadata and auth identity dependencies in the coverage
review; object blobs and project settings need separate backup. SQL dumps alone
do not copy Storage files or guarantee recovery of encrypted MFA/Vault material.
Do not expose hashes, seeds or encryption keys in review exports.

Restore only into a disposable local Supabase/PostgreSQL 17 environment, with
external networking/SMTP/jobs/webhooks disabled. Review the archive TOC and
managed-role/schema ownership constraints before restoring; never blindly restore
over hosted Auth/Storage or execute global role dumps. Verify aggregate counts,
FKs, RLS, grants, API behavior and usable synthetic Auth. For existing encrypted
Auth factors, approve the provider-supported recovery path before claiming a
complete recovery. Stop on unsupported objects/permissions rather than dropping
managed objects or disabling integrity. No backup/export/restore has run yet.

## Manual signup instructions — perform only when separately approved

1. Open the intended Supabase project in Dashboard; verify its identity.
2. Open **Authentication → Sign In / Providers**.
3. Under **User Signups**, switch **Allow new users to sign up** OFF.
4. Save changes if the dashboard offers a Save button.
5. Leave the Email sign-in provider, existing accounts, email confirmation and
   MFA settings unchanged. Do not disable sign-in to block signup.
6. Record the changed toggle and verify public Auth settings report
   disable_signup=true. Do not test by registering a real/new user.

This blocks self-registration, not an owner-approved administrative invitation.
Invitation creation, exact UUID allowlisting, callback/SMTP templates and TOTP
enrolment still require separate approval. Supabase team-address restrictions on
built-in SMTP apply; the successful Resend onboarding test is not Auth SMTP setup.

## Package and apply sequence

Run `node scripts/prepare-hosted-migration-package.mjs` locally to build a frozen
artifact at artifacts/hosted-package-001-011. It uses Git blobs, not the moving
working migration directory, and verifies all SHA-256 hashes. No network/SQL.
manifest.json records the exact source and eleven file hashes. No environment
files, credentials, owner fixtures or customer data are included.

**Do not run a hosted push from the active business-sprint checkout.** Later local
012+ migrations are not approved by reviewing this package. Review/execute from
the frozen package only, once backup/restore and explicit migration approval exist.

The inspected pinned CLI 3.2.0 supports this dry-run command, shown for future use:

```text
supabase --workdir <frozen-package-directory> db push --remote=<verified-project-ref> --skip-vault --dry-run
```

Use a separately approved secure credential/profile workflow with no credential
values in CLI arguments or logs. Preflight remote connection/login-role creation
can itself need write privileges; it is NOT authorized by the read-only inventory.
Never use --include-all, --include-seed, --include-roles or --yes; clear any
SUPABASE_YES override. --skip-vault prevents this command's default Vault updates.

After reviewing that only 001 through 011 are pending and obtaining explicit apply
approval, the same command without --dry-run is the apply step. Each migration is
transactional; the eleven-file batch is not globally atomic. Stop on the first
error, inspect actually committed history, and never fake/repair ledger entries
or rerun a manual partial batch without review. No down/drop/reset operation.

## Post-migration gates

1. Run post-migration-security.sql for PASS/FAIL catalog checks. It checks all 14
   expected RLS tables, effective grants, schema usage, exact public RPC role
   permissions, the private receipt ledger and empty RPC search paths. Expected
   package baseline is 001-011, not later sprint migrations. FAIL means stop.
2. Repeat the 18-section inventory and compare expected columns, constraints,
   indexes, policies and fingerprints privately; check API exposed schemas in
   Dashboard and keep takween excluded. Preserve migration history.
3. With separately approved synthetic identities/test writes, verify anonymous,
   ordinary AAL1/AAL2, allowlisted AAL1 and allowlisted AAL2 behavior, idempotency,
   rollback and concurrency. Catalog PASS alone does not prove actual MFA/RLS.
4. Keep application, intake, dispatch, email and indexing gates false until their
   own controlled test/activation approval. No real Resend calls in DB tests.
5. Back up the validated checkpoint. If activation later fails, disable its gates
   and preserve requests/history/outbox; use reviewed forward fixes, not dropping
   tables or resetting the project.

Remaining business decisions: entity/GST, terms, acceptance evidence, Fateen
authority/consent, retention/backups and owner MFA recovery. See
PHASE_3_BUSINESS_DECISIONS.md and HOSTED_SUPABASE_PREPARATION.md. No commercial
policy or tax rate is implied by synthetic local test values.

References: https://supabase.com/docs/guides/auth/general-configuration and
https://supabase.com/docs/guides/platform/backups .
