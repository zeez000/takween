# Operational implementation: architecture and migration design

Status: phases 1 and 2 implemented for local review behind disabled flags. Phase 3
adds owner-only quotations, orders, production observations and local PDF exports;
see OPERATIONAL_PHASE_3.md for verification and remaining release gates. Real
disposable Supabase Auth, MFA, PostgREST, RLS and concurrency have now been tested.
No hosted migrations, infrastructure changes or real sending enabled.
26 November local business sprint extends owner operations with inventory,
machines/maintenance, internal costing, scheduling, manual finance, private draft
catalogue, summaries and contacts/exports. See BUSINESS_OPERATIONS_SPRINT.md for
additive 012-015 migrations, verification and activation limits. Hosted preparation
remains separately frozen at 001-011 (HOSTED_ACTIVATION_PACKAGE.md).
Base: codex/combined-release, 5e3bee651dcc2e645c1a223971936f80d689cf80.
Implementation branch: codex/operational-foundation.

## Authoritative specifications and precedence

Both exact DOCX files were supplied in TAKWEEN_Codex_References.zip and read in
full, including table text and footer text, on 23 November 2026. Neither contains
drawings, embedded documents or tracked changes. Originals were extracted only
into ignored `artifacts/operational-references/`; no private source documents are
committed. SHA256:

- Blueprint: C49729417045938B6B7679F2FBAA64FC1DF8C437DC442186FA31EDD3648AAA67
- Fateen note: 8987A1B1881494B3CE00921A0AAEE496D8E2E5C883DB72895661E58F8CB50718

| Source requirement | Resolved implementation decision |
| --- | --- |
| TAKWEEN is a temporary brand; hero concepts are suggestions | Confirmed TAKWEEN LABS branding and approved layered T/original gear take precedence. No redesign or new preloader/finale. |
| Operational MVP and later automation | Full operational website remains the release goal. This phase is the backend foundation, not an operational-launch claim. |
| Model, idea and catalogue enquiry journeys with uploads | Idea and catalogue enquiries proceed in dependency order; all customer file uploads/previews are deferred. No buckets or attachment tables now. |
| Cloudflare Pages or equivalent static hosting | Retain tested Next.js/OpenNext Workers architecture. Backend requires a server runtime. |
| Fateen final section, possible later dedicated page | Keep a dedicated Beyond Plastic section inside TAKWEEN; no separate site or page in current scope. |
| Fateen EDM, grinding, turning and ambiguous DRO equipment | Retain only verified, owner-approved service copy. No DRO specifications or tolerances; document descriptions are not proof of available capacity. |
| Separate machining queue and authorized referral | Distinct fateen_machining category; explicit referral consent; no automatic forwarding or additional staff access. Owner-only initial role avoids broad cross-business disclosure. |
| WhatsApp and optional email | Current verified contact remains takweenlabs.in@gmail.com. No unverified phone/WhatsApp channels. Real sending needs separate approval. |
| Customer accounts, payments, fixed checkout | Deferred; no customer auth, payment endpoints or automatic fulfilment. |
| Supabase private storage for models/PDFs | No customer buckets now. Later quotation PDFs can be authenticated on-demand downloads; any storage requires separate access review. |
| Example costs and 20–30 products | Example prices are not commercial rates; approved assets, rights and catalogue selection are still required. |
| Backups, privacy, retention, legal/entity identity | Required release decisions; no invented retention policy, contracting entity, tax information or service guarantees. |

## Inspected baseline

- Next.js 16.4.5 App Router, React 19, TypeScript, Tailwind 4, R3F/Drei/Three.
- Homepage uses separate layered-T and mechanical-assembly components with the
  shared scene adapter. Preserve their source, preload policy and regression tests.
- Browser/server Supabase helpers exist in `src/lib/supabase/`. The server helper
  reads request cookies and optionally writes refreshed cookies. There is no
  authentication refresh boundary, operational repository or owner authorization.
- `supabase/schema.proposed.sql` is a design-only transaction, not a migration.
  It uses admin_users/quotes/quote_items and includes deferred storage/payments.
  It enables RLS but supplies no application grants/policies. Do not execute it.
- `/api/enquiry` delegates to a provider-only handler. It validates bounded JSON,
  quantity 1–10000, request UUID, same-origin requests, honeypot and native Worker
  rate limits. It accepts only a nonblank Resend provider ID as provider acceptance.
  It does not persist an enquiry or confirm inbox delivery.
- The form retains an on-device draft, retry UUID and manual email fallback.
  Local file selection performs browser checks only; no upload exists.
- `/admin` and `/track` are explicit public outlines, with no customer records.
- OpenNext produces the Worker. Wrangler has assets, self-reference and two
  native rate bindings; ENQUIRY_ENABLED and indexing are false. There is no
  durable notification queue binding or automated database deployment.
- Existing CI runs lint, types, unit/Worker tests, OpenNext, dry run and browsers.
- `docs/SUPABASE_PLAN.md` is absent from this checkout. Historical descriptions
  of other branches are not evidence that migrations or policies exist here.

## Proposed operational schema

All tables have UUID primary keys and UTC creation timestamps. Mutable tables
have server-maintained updated_at. Bound all user strings and numeric values.
Use integer paise for money, no invented rates. Index foreign keys, inbox status
and timestamps. No public direct table writes or customer accounts in this stage.

| Table | Core fields and invariants |
| --- | --- |
| customers | name, email, optional phone; guest contact, not an authentication identity. Do not expose existence or merge people solely because an unverified email matches. |
| enquiries | customer_id, unique unguessable reference, unique submission UUID, canonical payload hash, category, description, quantity 1–10000, material/colour preference, optional dimensions with explicit units, preferred date, privacy-notice version, contact consent and separate Fateen referral consent. Reference alone never authorizes access. |
| enquiry_events | enquiry_id, event type, previous/new status, actor, bounded internal note, timestamp; append-only transactional history. |
| admin_roles | auth.users user_id, allowlisted owner/operator role, enabled flag; no self-enrolment or client metadata roles. Membership changes restricted to a controlled owner procedure. |
| quotations | enquiry_id, revision, state, currency INR, expiry, terms snapshot, computed total_paise; unique enquiry/revision. Issued revisions immutable; supersede with a new revision. |
| quotation_items | quotation_id, description, positive quantity, nonnegative unit_paise and authoritative calculated line total. Parent totals maintained transactionally. |
| orders | accepted quotation revision, enquiry_id, state, timestamps; one order per accepted quotation, no automatic acceptance from an unauthenticated link. |
| order_events | order_id, state transition, actor, separate internal and customer-safe notes; append-only. |
| audit_events | actor, action, entity ID, correlation ID, timestamp; append-only, redact credentials and unnecessary PII. |
| notification_outbox | enquiry_id, notification kind, unique deduplication key, pending/leased/accepted/failed/uncertain state, attempt count, next retry, lease expiry, provider ID; no API keys or raw provider bodies. |
| products / product_variants | Add in catalogue migration: draft/published state, categories, approved descriptions/assets/rights records and bounded customization options. Do not publish sample assets by default. |

Internal enquiry notes can be append-only enquiry_events rather than another
mutable table. Production material/cost tracking needs a later movement ledger
and cost-entry migration, not derived fabricated profit metrics. Preserve the
old proposal as history; do not maintain two competing executable schemas.

## Transactional intake and email recovery

Validate and rate-limit at the Worker before database access. A restricted intake
operation atomically creates contact, enquiry, initial event and notification
outbox entry. A unique request UUID prevents duplicate writes. Same UUID and
different payload returns a conflict; never silently overwrite. Deduplication
must remain valid after process restarts and concurrent submissions.

Return a truthful stored-request confirmation after commit, with a reference.
Report notification pending/accepted/failed separately. A lost database response
can be retried with the same UUID. Do not return an existing customer's private
details to an anonymous caller replaying an ID. References and UUIDs must not
be logged as unrestricted lookup credentials.

Notification processing leases an outbox item transactionally. Provider calls
happen outside the database transaction, with bounded timeouts and stable
idempotency keys. Provider acceptance is not delivery. A crash after acceptance
requires reconciliation; never promise exactly-once email across the provider's
deduplication expiry. Flag uncertain records for owner review before a late retry.
Initial owner-triggered processing can avoid new infrastructure; unattended
retries require an approved scheduler/queue and its free-tier limits verified.
Do not enable sending or add live scheduling in preparation commits.

## Authorization and privacy model

- RLS on every operational table; explicit grants and deny-by-default policies.
  Anonymous/public browser clients cannot read contacts, enquiries, quotations,
  orders, notes or audit records. No public INSERT policy for intake tables.
- Invite-only owner/operator login with verified Supabase identity and MFA AAL2.
  Check the live allowlist and assurance level server-side on every private route,
  action and PDF download, and again in RLS. Do not trust editable JWT metadata.
  Session refresh must work in the current Next.js request/cookie conventions.
- Restrict privileged operations to server-only modules. A server-side secret or
  service-role credential bypasses RLS: narrow callable interfaces, validate all
  inputs, and exclude this credential from NEXT_PUBLIC variables and browser bundles.
  Prefer JWT/RLS owner access; do not use a service client as a login substitute.
- Restrict intake RPC execution; revoke default PUBLIC function execution. Fix
  search_path and schema-qualify objects in any SECURITY DEFINER functions.
  Role-check helpers must avoid recursive admin_roles policies.
- Mutations validate origin, session, authorization and state transitions. Never
  cache private responses publicly. PDFs require authenticated authorization and
  render escaped, immutable quotation snapshots without fetching arbitrary URLs.
- Customer accounts and public tracking remain disabled. Future guest tracking
  needs high-entropy, hashed, expiring/revocable tokens and a customer-safe view;
  never use a sequential order/enquiry reference as the credential.
- Do not create buckets or upload endpoints. Catalogue assets require approved
  commercial rights. Fateen referral consent is independent of enquiry consent;
  no forwarding until the owner approves recipients and routing.

## Versioned migration sequence

1. Inventory actual target schema read-only with owner authorization. Determine
   whether the old proposal was ever applied; never assume an empty database.
2. Prepared `202611230001_operational_core.sql`: contacts/enquiries/events/
   admin_roles/audit/outbox with constraints, indexes, RLS and revoked grants.
   Uses a new non-exposed `takween` schema to avoid collisions with the old public
   proposal. Only specifically granted RPC façades are public-schema functions.
3. Prepared `202611230002_persistent_intake.sql`: service-only atomic intake,
   idempotency and event/audit writes. Outbox dispatch/leases remain a separate
   reviewed phase. No notification processor or sending is enabled.
4. Quotations/items/orders/events with legal state transitions and transactional
   quotation acceptance/order creation. Flow: new request → quoted → approved →
   printing → finishing → ready → delivered; explicit hold, revision and cancel
   transitions, including permitted resume state. No unrestricted status PATCH.
5. Catalogue and manual material/cost ledgers after owner workflow review.

Prefer additive changes and forward repair migrations. Reversal must never drop
live customer records. Test rollback in a disposable database only. Apply no SQL
to hosted Supabase and do not wire automatic migrations into CI/deployment.

## Dependency order and verification gates

1. Source documents resolved. Confirm Fateen descriptions/routing, privacy notice,
   retention and admin bootstrap identity before live activation. No invented
   equipment or tolerances.
2. Commit architecture/migration design, then locally tested core SQL and RLS.
3. Build server repository/intake/outbox behind disabled flags; test database
   rollback, duplicates, conflicting retries, concurrency, missing config, provider
   failures and uncertain acceptance without real network sending.
4. Extend existing form with approved fields/consent and stored-reference states;
   preserve layout and existing email fallback. Deferred uploads remain inactive.
5. Auth/MFA and private inbox, then notes, quotation revisions/PDF, orders and
   production summaries; add each as a reviewable phase with unauthorized tests.
6. Catalogue and consented Fateen enquiry queue after source/content approval.
7. Full browser/Worker regression, animation screenshots, accessibility, matched
   repeated performance measurements, Next/OpenNext builds and Wrangler dry run.
   Keep prior performance evidence; do not repeat benchmarks before a change.

Database integration tests must execute against a disposable local Supabase,
not mocks alone: anonymous denial, ordinary-auth denial, disabled admin denial,
AAL1 denial, AAL2 owner access, audit immutability, intake atomicity, concurrency,
quotation totals/revisions and order transitions. Missing Docker/local Supabase
is a reported test blocker, not a pass. Public catalogue tests must exclude drafts.

## Credentials and live approval gates

Existing public settings: NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Intake/outbox may require a separately
configured server-only Supabase secret with tightly limited use. Real sending
requires RESEND_API_KEY and a verified RESEND_FROM_EMAIL; configure only through
ignored local env settings or encrypted Worker secrets, never chat or commits.
Keep ENQUIRY_ENABLED=false and SITE_INDEXING_ENABLED=false throughout preparation.
Database intake and notification sending need separate flags when implemented.

Live migrations, owner invitation/MFA settings, buckets, notification scheduling,
email sending, deployment and DNS all remain approval gates. A free-plan
recommendation is not a current quota verification; check current official limits
before adding runtime services. No infrastructure or business settings changed.

## Phase 1 implementation boundary

Prepared versioned local SQL, read-only owner authorization, and isolated
`/api/operational/enquiries` and `/api/operational/owner` routes behind false
flags. The existing public form and `/api/enquiry` provider-only workflow remain
unchanged. Persistent intake requires an explicitly configured privacy notice,
server-only database secret and approval before activation. It never sends email.
Database receipt means stored/pending, not provider acceptance or delivery.

Phase 1 restricts all owner access to reads. Login/logout, invitation/MFA
enrolment UI, owner inbox, notes, quotation/order tables and mutations, catalogue,
material tracking and dispatch/reconciliation are subsequent phases. Only the
owner authorization primitive is implemented; do not claim a complete owner
authentication workflow. Session refresh is confined to writable Route Handlers;
there is no global auth proxy affecting the public homepage.

The operational tables are private under `takween`; do not add that schema to
Supabase's exposed API schemas. Authenticated reads are still protected by AAL2
and allowlist RLS. Future server RPCs must expose only authorized bounded results.
All notifications stay pending until a separately tested dispatcher is approved.
See OPERATIONAL_PHASE_1.md for the historical phase-1 boundary. Phase 2 adds the
owner workspace, invitation/MFA onboarding, inbox/notes, persistent public form,
durable dispatcher and real local Supabase verification. Current implementation,
test results and activation/rollback gates are documented in OPERATIONAL_PHASE_2.md
and OPERATIONAL_PHASE_2_RUNBOOK.md. Quotation/order management, catalogue and
production management remain subsequent phases; uploads and payments stay deferred.
