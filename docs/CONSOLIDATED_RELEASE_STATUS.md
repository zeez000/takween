# Consolidated release status

Date: 24 November 2026 (Asia/Calcutta).

Status: consolidated for review on `codex/combined-release`, not activated on
hosted services. PR #4 must remain draft, targeting `master`.

## Provenance and recovery points

| Reference | SHA |
| --- | --- |
| Verified Phase 3 / original PR #6 head | `0d3c174df8574f664eaba2f0b5fa6ea5d3de69a8` |
| Foundation before consolidation / original PR #5 head | `73647e57e60748e9cf751c3c8902c6bffe8ac006` |
| Combined release before consolidation / original PR #4 head | `5e3bee651dcc2e645c1a223971936f80d689cf80` |
| Unchanged master | `f0d27a8579a96b2312b0a6441ae7d4a34798cdf4` |
| PR #6 history-preserving merge into foundation | `7fd4714e6ff3cacb99cb42a6c17eb7eadb740449` |
| PR #5 history-preserving merge / final consolidated application SHA | `03af786a8b9a432a12b05506bf1848b9d83a9d9d` |

This document is a documentation-only commit after the application SHA above.
Its own commit identity is available in Git history (`git log -1 --format=%H --
docs/CONSOLIDATED_RELEASE_STATUS.md`); it is not embedded in itself. The final
documentation-inclusive branch SHA and successful checks are recorded on PR #4.
No squash, rebase, force push or branch deletion was used.

## Deployment safety

The owner inspected `takween-labs-preview` in Cloudflare and reported the initial
"Connect to a repository" dialog, with no connection made or settings changed.
This is owner-provided evidence of disconnected Workers Builds integration.
The account API independently returned no Pages project connected to `takween`.
The Workers build-trigger API returned HTTP 403; it was not represented as an
independent confirmation of trigger settings. No connection or access expansion
was attempted. GitHub repository webhook listing returned no hooks.

The Supabase GitHub App also emits a skipped Supabase Preview check: this branch
has no associated Supabase branch. Before completing PR #5, the owner directly
inspected its dashboard and confirmed: connected repository zeez000/takween;
Deploy to production OFF; no production branch configured; Automatic branching
OFF and unavailable on Free; preview branch limit 0; hosted project paused.
No settings were changed. This is owner-provided deployment-safety evidence, not
an independently authenticated management-API audit. The existing integration
was left connected and the hosted project was not resumed or modified.

The repository release workflow is verification-only: install, lint, typecheck,
unit/Worker tests, OpenNext build, Wrangler **deployment dry run** and browser
tests. Workflow definitions do not change across these merges. Its permissions
are read-only and it has no production credentials. Both push and PR verification
events ran on the integrated heads. No additional deployment automation was
identified beyond the inspected integrations described here. Recheck automation before any later branch/infrastructure changes.

## Integrated functionality

| Area | Preserved implementation and boundary |
| --- | --- |
| Layered T and original mechanical gear | Approved geometry, materials/lighting, movement, controls, responsive interactions and loading behavior retained. Hero/gear/scene/entry assets and global styling match the pre-consolidation combined-release source. |
| Homepage and enquiry UX | Accepted operational form additions and copy retained exactly from verified Phase 3. Persistence configuration is loaded on focus; existing layout and design retained. No redesign in consolidation. |
| Persistent enquiries | Server validation, origin/size/rate limits, durable unique references and idempotent transactional storage of customer/enquiry/history/audit/outbox records. Storage success is distinct from email acceptance/delivery. |
| Fateen | Dedicated website section and separate machining category, process choice and independent referral consent. Manual routing; no automatic sharing or unverified authority. |
| Owner workspace | Invitation-only allowlist, Auth verification, MFA/AAL2 and deny-by-default RLS. Stored inbox/search/filter/details/internal notes/history/logout; no fabricated production records. |
| Quotations | Manual line items, paise arithmetic, explicit tax/entity/terms/validity, optimistic versions, evidenced lifecycle and immutable issued revisions. Accepted quotations cannot be superseded; only one active draft. |
| PDF downloads | Freshly authorized private snapshot; browser-generated branded PDFs exclude internal costs/history. Superseded PDFs are explicitly marked. Missing revision metadata fails closed. Existing downloaded documents cannot be recalled. |
| Orders and production | One accepted-quote conversion, unique references, snapshots, validated category-specific transitions, holds/terminal states, append-only observations and audit/history. Costs/material/time observations remain owner-private. |
| Request privacy | Abort plus view/session generation checks on hide/logout/auth denial/unmount; stale replies cannot restore records or overwrite newer state. HTML/non-JSON 401/403 clears the private workspace before body parsing. |
| Resend and notifications | Existing provider-only enquiry validation/security and persistent notification outbox/lease fencing/backoff/idempotency retained. No promise of exactly-once delivery or Gmail inbox placement. Genuine sending stays disabled. |
| Migrations | All versioned migrations 001-011 present, retaining the verified SQL contents. 011 adds read-only owner revision visibility. No hosted migration applied. |

Catalogue, customer accounts, customer uploads, payments and public order tracking
remain deferred/inactive. A local file-selection/validation control is not an upload.
`/admin` remains a preview outline; `/owner` is the separately gated private workspace.

## Verification evidence

| Check | Result and provenance |
| --- | --- |
| Original Phase 3 hardening CI | [45382583300](https://github.com/zeez000/takween/actions/runs/45382583300), passed at `0d3c174`. |
| Foundation integrated CI | [PR run 45407342810](https://github.com/zeez000/takween/actions/runs/45407342810) and [push run 45407329763](https://github.com/zeez000/takween/actions/runs/45407329763), both passed at `7fd4714`. |
| Combined application integrated CI | The application merge tree exactly matches `0d3c174` / `7fd4714`; final full verification runs on the documentation-inclusive head below. Initial merge-head runs may be superseded by that documentation-only push. |
| Final documentation-inclusive head | Verify the final SHA's Release checks on [PR #4](https://github.com/zeez000/takween/pull/4). No skipped verification is implied by this reference. |
| Targeted consolidation checks | Merge parents and ancestry checked; integrated application tree compared to verified Phase 3; protected visual source/config/gates and all 11 migration blobs checked; no app code rewritten. |
| Reused actual local Supabase evidence | 18 groups passed on byte-identical Phase 3 SQL/backend: real Auth/MFA/AAL2, PostgREST, RLS denial, concurrent commands, rollback and held/terminal history. See OPERATIONAL_PHASE_3.md. Not rerun solely for history-only merges. |
| Reused operational browser evidence | 30 unique desktop/mobile-emulated cases passed, including 16 race/supersession cases; standby interruption and fixture recovery are explicitly documented in OPERATIONAL_PHASE_3.md. These enabled-owner journeys are local evidence, not hosted CI coverage. |
| Reused PDF evidence | Decoded privacy/supersession tests and visually inspected synthetic PDF. Latin font limitations remain documented. |

Release checks on integrated heads run lint, TypeScript, 76 unit tests, native
local Worker harness, default Next.js/OpenNext production build, Wrangler dry run
and the Chromium/WebKit public suite (57 pass / 13 existing conditional skips on
the verified runs). No test assertion, timeout, limiter or conditional skip was
changed for consolidation. No local dependency reinstall or redundant full audit.
Mobile browser coverage is emulation; no physical iPhone/Android certification.
Raw status files, credentials, fixtures and private traces remain ignored and must
not be uploaded. Reused evidence is not a claim of fresh hosted database testing.

## Disabled gates and hosted preparation

Tracked Wrangler variables remain:

```text
ENQUIRY_ENABLED=false
PERSISTENT_ENQUIRIES_ENABLED=false
OPERATIONS_ENABLED=false
ENQUIRY_NOTIFICATIONS_ENABLED=false
SITE_INDEXING_ENABLED=false
SITE_URL=https://takween-labs-preview.abdzeez000.workers.dev
```

No deployment or runtime secret update occurred. The existing public Worker is
unchanged. Before any separately approved hosted activation:

1. Confirm contracting, tax, privacy, acceptance, Fateen and recovery decisions.
2. Review hosted Supabase backup/restore and owner invitation/MFA recovery plans.
   Review migrations 001-011 and apply them only after explicit owner approval;
   do not reset hosted data or rewrite applied migration hashes.
3. Configure approved server settings through protected environment settings:
   `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `REQUEST_ORIGIN`,
   `ENQUIRY_PRIVACY_VERSION` and `ENQUIRY_PRIVACY_NOTICE`. Browser configuration
   uses only `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never expose privileged credentials
   through NEXT_PUBLIC variables, commits, browser bundles or reports.
4. Prepare server-only `RESEND_API_KEY` and approved `RESEND_FROM_EMAIL` through
   protected secrets. Sender/domain verification and genuine delivery to
   `takweenlabs.in@gmail.com` require a separately approved controlled test.
   Provider acceptance is not inbox delivery. Do not enable dispatch or email
   gates merely because credentials exist.
5. Validate hosted limits, origin/cookie configuration, owner provisioning,
   physical-device journeys and recovery before enabling any feature gate.
   Customer uploads/payments/accounts/tracking remain separately deferred.
6. Deploy, DNS/domain connection and indexing each require explicit approval.
   Keep preview noindex and existing URL until those decisions are approved.

## Pending decisions and security advisories

All eight owner decisions remain open in
[PHASE_3_BUSINESS_DECISIONS.md](PHASE_3_BUSINESS_DECISIONS.md): contracting entity,
GST/tax, quotation terms/validity, customer acceptance evidence, Fateen authority
and consent, retention/backups, completed-order corrections and MFA recovery.
No commercial terms or tax rates are implied by test fixtures.

The reviewed lockfile retains 11 moderate advisories, zero high/critical in the
recorded audit. Five entries remain under omit-dev, partly because OpenNext's
build CLI is installed as a production dependency. Root advisories:

- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): glob
  10.5.0 build paths; cancellation can leave filesystem traversal running.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249):
  minimatch 9.0.9/10.2.6 build/lint paths and attacker-controlled optimized patterns.

No customer-controlled runtime path was identified; absence of bundle markers is
supporting evidence, not proof. Residual untrusted build/configuration resource
exhaustion risk remains. Patched major versions are outside compatible ranges;
force-fix proposes an unsuitable adapter downgrade. No forced override or broad
upgrade was applied. See OPERATIONAL_PHASE_3.md for versions, dates and exposure
analysis. Track compatible upstream fixes before expanding untrusted processing.

Other limitations: owner-approved real email testing not performed; no guarantee
of Gmail delivery, production backup restoration, hosted free-tier CPU capacity,
every session-expiry scenario or multilingual quotation coverage.

## Rollback procedure (not executed)

No production resource or hosted schema changed, so this consolidation has no
hosted database rollback or Cloudflare rollback to perform. Retain all branches.

For an authorized Git rollback, create a separate review branch from the current
combined-release head and revert PR #5's merge with mainline parent 1:

```bash
git switch -c codex/review-consolidation-rollback origin/codex/combined-release
git revert -m 1 03af786a8b9a432a12b05506bf1848b9d83a9d9d
```

Review/test the resulting PR before changing the release branch. Do not reset,
force push, squash history or merge into master as part of recovery. PR #6's
foundation merge can likewise be reverted on a separate foundation review branch
using mainline parent 1 and `7fd4714e6ff3cacb99cb42a6c17eb7eadb740449` if separately
authorized. Git rollback is not database rollback. Future hosted SQL corrections
need approved additive compensating migrations preserving records/audit history;
see MIGRATION_RUNBOOK.md and OPERATIONAL_PHASE_3.md.

GO for consolidated draft review after final-head CI succeeds. NO-GO for hosted
business activation under this consolidation authorization. Real Resend/Gmail
testing is the next separately authorized task.
