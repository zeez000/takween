# Planned Supabase architecture

schema.proposed.sql is a design document, NOT an applied production migration.
No account, database, bucket or authentication is connected in this phase.
RLS is enabled with no application policies, deliberately denying normal access.

## Identity and policies

Customers map to auth.users through customers.user_id. Administrators require
an admin_users allowlist; never use client-editable metadata for roles.
Authorise every server route/action and database access. Bootstrap the first
admin manually through a controlled process; require stronger admin authentication.
Public intake uses a validated, rate-limited server endpoint rather than anonymous
inserts. Customers read only their own records. Admin-only tables include stock,
expenses, cost settings, audit events and admin membership. Only published product
rows are public. Implement explicit policies and grants with cross-access tests.

## File pipeline

Validate intake; allocate enquiry/file UUIDs; issue short-lived private quarantine
upload authorisation; enforce size/count/quota limits; verify extension, size and
file structure; scan/process in isolation; defend against 3MF archive bombs;
mark accepted objects ready for review; authorise short-lived staff downloads.
Use a private design-files bucket and enquiry UUID/file UUID/extension object paths.
Original filename is metadata, never a trusted path. STEP requires conversion.
Remove abandoned uploads using a defined retention job. Do not log signed URLs,
credentials or design contents. Browser validation is UX only, not security.

## Invariants before activation

- Quotes have immutable accepted versions; revisions create another version.
- Accepting a quote and creating its order is transactional.
- Totals and quote lines must reconcile using integer paise.
- Stock is a movement ledger; receipt entries establish starting stock.
- Reserve/consume with transaction locking and prevent negative stock.
- Separate estimated costs from actual consumption and actual costs.
- Private tracking uses verified identity or hashed expiring, revocable tokens.
- Order status transitions are validated, audited and admin-only.
- Keep internal notes out of customer-facing responses.
- Payments/refunds and expenses drive cash reporting; avoid double counting
  spool purchases and material allocation when calculating profitability.
- Define privacy notice, retention, deletion and backup handling before intake.
- Obtain permission before publishing any customer design or photograph.

Implement database constraints/functions, RLS policies, storage policies,
server validation and integration tests before turning this proposal into migrations.
No permissive fallback policies or privileged credentials in browser code.
