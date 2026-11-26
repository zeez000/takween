# Fresh hosted baseline and controlled 001–011 application

Prepared 26 November 2026. **Instructions only; no hosted export, restore, Auth
change or migration was executed.** Follow this before requesting apply approval.
The SQL package remains pinned to 2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57.

## Recorded baseline

Owner-executed inventory: PostgreSQL 17.11; TAKWEEN schema and migration history
absent; no inspected application relations/functions/policies. Owner-executed
aggregate check: users 0, identities 0, MFA factors 0, verified TOTP factors 0,
buckets 0, public buckets 0, object metadata 0, bucket configuration empty.
Managed schemas, Storage triggers and broad default grants remain. This is not
permission to delete, reset or assume the whole PostgreSQL database is empty.

No blob export, customer data migration or existing-user/MFA transfer is indicated.
One protected logical database archive is still appropriate: it preserves managed
metadata and unknown non-application data without inventing a schema-only backup
guarantee. Keep a separate non-password role inventory and non-secret dashboard
configuration record. No paid PITR, preview branch or new hosted project is needed.

## Owner actions: baseline export

1. Choose an encrypted local destination outside Git, OneDrive and shared folders.
   Use an existing encrypted volume/container. If none is available, select a free
   encryption tool first; do not write a plaintext archive to a shared folder.
   Keep the recovery password separately in your password manager. Approve who
   holds it and the backup. No password, key, SQL archive or settings containing
   secrets should be pasted into chat or committed.
2. Record the intended project reference, region, PostgreSQL version, extension
   inventory and non-secret settings: exposed API schemas, Auth provider/signup
   toggles, Site URL/redirect allowlist, JWT/session lifetimes, MFA options, SMTP
   configured/not configured, scheduled jobs/webhooks, network restrictions and
   repository deployment automation. Do not reveal SMTP/JWT/Vault/connection keys.
   Database dumps do not preserve these dashboard settings. Retain the two
   completed sanitized inventories rather than rerunning them now.
3. Use PostgreSQL 17 client binaries. Get the endpoint, username and database from
   Dashboard **Connect**. Use direct access if reachable, otherwise the supported
   **session** pooler, not transaction mode. Download the project's TLS CA using
   the dashboard/provider instructions. Keep application/notification gates off.
4. In your own PowerShell, set the following *non-secret* connection fields from
   the verified dashboard. The password is requested by PostgreSQL's hidden prompt.
   Replace angle-bracket placeholders; do not paste a password into a command.

```powershell
$ErrorActionPreference = 'Stop'
$BackupDir = '<existing-encrypted-private-directory>\takween-baseline-2026-11-26'
New-Item -ItemType Directory -Path $BackupDir -ErrorAction Stop | Out-Null
$env:PGHOST = '<verified-direct-or-session-pooler-host>'
$env:PGPORT = '<verified-port>'
$env:PGUSER = '<verified-database-user>'
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = '<absolute-path-to-provider-CA.pem>'
pg_dump --version
pg_dump --format=custom --file "$BackupDir\database.dump" --password
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; stop.' }
pg_dumpall --roles-only --no-role-passwords --file "$BackupDir\roles-reference.sql" --password
if ($LASTEXITCODE -ne 0) { throw 'Role inventory failed; stop for coverage review.' }
pg_restore --list --file "$BackupDir\archive-contents.txt" "$BackupDir\database.dump"
if ($LASTEXITCODE -ne 0) { throw 'Archive could not be read; stop.' }
Get-FileHash "$BackupDir\database.dump" -Algorithm SHA256 |
  Format-List | Out-File "$BackupDir\database-sha256.txt"
Remove-Item Env:PGHOST,Env:PGPORT,Env:PGUSER,Env:PGDATABASE,Env:PGSSLMODE,Env:PGSSLROOTCERT
```

The roles file can contain private role configuration even without passwords:
keep it protected and never execute it wholesale. A dump/TOC/hash success proves
archive readability, **not restoration**. Stop on denied tables or other errors;
do not exclude schemas, suppress errors, disable row security or buy a service
to force a green result. These commands have not been executed against hosted.

## Isolated restoration verification (free local infrastructure)

Use the existing disposable local Supabase runtime with a **separate new clone**
and storage directory; do not overwrite the current business test database.
Prepare it only after reviewing the archive. Match PostgreSQL major 17 and the
required extension/Auth/Storage schema versions. Bind loopback only and block
outbound traffic, SMTP, dispatch, cron and webhooks before restoring. Do not copy
hosted API keys or live service environment into the clone.

Review archive contents and roles-reference against the local managed baseline.
Provision only required compatible NOLOGIN roles locally. Preserve ownership,
ACLs, policies and default privileges; omitting ACLs or using `--no-owner` is not
a security-equivalent recovery test. Do not replay provider-owned role DDL or
drop managed objects to silence conflicts. If versions/permissions conflict,
stop for a reviewed TOC mapping. This mapping cannot be validated before the
actual archive exists. Managed definitions remain preserved in the source archive.

After review, use a local-only target and reviewed TOC list:

```powershell
# Clear hosted connection variables first. Verify this is a disposable loopback clone.
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '<disposable-clone-postgres-port>'
$env:PGUSER = '<local-clone-restore-role>'
$env:PGDATABASE = '<new-disposable-clone-database>'
$env:PGSSLMODE = 'disable' # loopback clone only; never for hosted
pg_restore --dbname $env:PGDATABASE --exit-on-error --single-transaction `
  --use-list "$BackupDir\reviewed-restore.list" --password "$BackupDir\database.dump"
if ($LASTEXITCODE -ne 0) { throw 'Restore drill failed; hosted migration remains blocked.' }
```

`reviewed-restore.list` is an inspected copy of archive-contents.txt, not a supplied
blank file. Every omitted managed object must be matched to an equivalent local
definition and documented. No `--clean`, `--disable-triggers` or hosted target.

Run the existing read-only inventory and Auth/Storage aggregate checks **on the
clone**, compare ownership/effective grants/RLS/default privileges, extension
dependencies and zero user/object counts. Confirm TAKWEEN/history are absent.
Record archive hash, PostgreSQL/extension versions, selected/omitted TOC entries,
restore exit status, object/security comparisons and sanitized failures. Full
Supabase Auth recovery is not claimed by a plain PostgreSQL restore. Keep the
source archive protected; obtain approval before deleting backup/clone material.

## Exact migration sequence — only after restore PASS and separate approval

1. Review the restoration record and external automation settings with the owner.
   Obtain explicit approval for **001–011 only**, not 012–015 or activation.
2. From the repository, the existing offline package command is:
   `node scripts/prepare-hosted-migration-package.mjs`. It reads pinned Git blobs,
   checks eleven hashes and produces artifacts/hosted-package-001-011. Existing
   package SQL must match supabase/inspection/migrations-001-011.sha256. Do not
   replace SQL from the current sprint checkout. Packaging is not a DB operation.
3. Use the previously inspected Supabase CLI 3.2.0. If a different version is
   installed, stop and inspect its local help before adapting commands. Establish
   a secure approved login/profile and verified project reference; never put DB
   passwords in flags or chat. Connection preflight may write metadata and is
   therefore part of the separately approved migration window.
4. Clear any SUPABASE_YES override. Run the reviewed command in your PowerShell:

```powershell
Remove-Item Env:SUPABASE_YES -ErrorAction SilentlyContinue
$ProjectRef = Read-Host 'Verified Supabase project reference (not a password)'
supabase --workdir 'C:\Users\user\.codex\worktrees\takween-audit\takween\artifacts\hosted-package-001-011' db push "--remote=$ProjectRef" --skip-vault --dry-run
```

5. Inspect that only 202611230001 through 202611240011 are pending in order.
   Any existing history, later migration, Vault update or unexpected target means
   stop. After the approved review, execute the same command without `--dry-run`.
   Do not use `--include-all`, seeds, roles, `--yes`, `db reset` or SQL Editor
   pasting that bypasses the migration ledger. Each file is transactional; the
   entire eleven-file sequence is not. On error, stop and inspect committed
   history before retrying; do not forge ledger entries.
6. Manually execute packaged post-migration-security.sql in SQL Editor. All catalog
   checks must PASS. Confirm 14 TAKWEEN RLS tables, restricted RPC grants, excluded
   takween API schema and ordered ledger. Actual synthetic hosted identity/MFA
   tests require separate approval; catalog PASS is not a substitute for them.
7. Keep all gates false; do not invite an owner, activate Resend, deploy or change
   signup settings as a side effect. Back up the validated checkpoint. Recovery
   favors preserved history and reviewed additive fixes, never a hosted reset.

## Remaining gates

- Protected destination, export permission/coverage and completed restoration drill.
- Explicit hosted 001–011 write approval and exact target/CLI authentication.
- Separate signup-disable, owner invitation/allowlist/MFA recovery and synthetic
  hosted security testing approvals. Prior signup-enabled evidence remains open.
- 012–015 stay outside this frozen package; business sprint review is independent.
- External deployment-automation confirmation still gates GitHub push/draft PR.
- Business policies, verified sender/domain and activation decisions remain open.

References: [Supabase backups](https://supabase.com/docs/guides/platform/backups),
[Supabase CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html),
[PostgreSQL 17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
