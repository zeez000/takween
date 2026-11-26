# TAKWEEN LABS two-stage release — feature freeze

26 November 2026. Source: codex/business-operations-sprint, verified application
at 4bcbc2e. New feature development is frozen. No merge or deployment authorized.

## Decision

The public brand website can be deployed independently of hosted Supabase.
Homepage content and both approved animations do not require database activation.
The existing OpenNext Worker can retain dormant backend code with all gates false.
No schema migration, account, Supabase secret, Resend sender or live email is
needed for manual `mailto:takweenlabs.in@gmail.com` contact. Preserve backend work.

Stage 1 is a brand/foundation demonstration, not an operational-service launch.
Keep planned services, portfolio placeholders and unconfirmed Fateen availability
explicit. Do not present private catalogue drafts as publicly available products.

## Focused evidence and remaining Stage 1 corrections

Existing local foundation Worker on 8799: homepage 200, canonical/OG origin match
the intended public workers.dev URL, noindex/nofollow present; favicon.ico/icon.svg
200; robots disallows all; sitemap empty; /owner shows disabled text with no login;
intake-config returns enabled:false. Existing live homepage returned 200 with
matching noindex, canonical, OG title/description and manual Gmail link.
This does not prove the live Worker contains the latest T build: deploy only the
reviewed source SHA and compare the actual post-deploy animation separately.

Two release-only gaps were confirmed and are NOT implemented in this planning
checkpoint:

1. QuoteForm still renders Send enquiry when sending is disabled. The endpoint
   fails closed, but that is poor Stage 1 customer experience. Prepare a narrowly
   scoped manual-contact presentation with no send/upload control in Stage 1,
   retaining the existing gated operational form for Stage 2. Do not remove the
   Resend/security implementation or change animations/layout unnecessarily.
2. OG/Twitter title/description/URL exist, but no og:image/twitter:image exists.
   Prepare a static share image from the approved emblem/branding, without new
   claims or redesign. Verify absolute public image URL, MIME, dimensions and
   social-crawler access. No platform-specific preview has been verified yet.

Keep noindex and current robots restrictions. Social crawlers may honor robots
and platforms cache previews; do not promise an image card on Instagram, WhatsApp
or Facebook. Test a private share after deployment approval; never relax crawling
or indexing silently to obtain a preview. Instagram bio links remain ordinary
links even if a card is unavailable. A mailto link opens the visitor's configured
mail app, not necessarily Gmail, and does not itself send anything.

## External automation gate — reconfirmed for checkpoint push

Owner has now reconfirmed Connect repository in Cloudflare Builds, Supabase
production deployment OFF and automatic branching unavailable on Free. Final
pre-push check cleared the documentation-only security checkpoint for the existing
branch and draft PR #7. No merge/deployment/hosted changes are authorized. The
pending status below is historical and superseded by this confirmation.

Latest owner instruction supersedes the earlier confirmation below: Supabase
production deployment OFF is confirmed, but Cloudflare automation confirmation
is pending. **Do not make a further push until reconfirmed.** See
SECRET_EXPOSURE_RELEASE_CHECK.md. The earlier push/PR already occurred; this note
does not claim to undo it.

Owner confirmed during this preparation: Cloudflare Worker repository integration
disconnected, no automatic deployment triggers; Supabase Deploy to production OFF,
no production branch, automatic branching OFF, preview limit 0; no other deployment
automation identified. No setting was changed. Repository release-checks.yml has
read-only contents permissions and build/test/dry-run steps, no deploy/migration.

For future checks, inspect only:
- Cloudflare → Workers & Pages → takween-labs-preview → Settings → Builds. An
  initial Connect-to-repository dialog means no link is established; do not click
  Connect. Also check scheduled/build hooks and other deployment integrations.
- Supabase → project GitHub integration/Branching settings. The connected repo
  alone does not mean deploy is enabled; verify the four settings above. Do not
  resume the project, create a branch or toggle settings for Stage 1.
- GitHub Actions workflows/webhooks/installed deployment integrations. Stop if an
  unexpected deploy or hosted migration path appears.

Push only codex/business-operations-sprint; draft PR targets codex/combined-release,
never master. Verify CI on the pushed SHA; no auto-merge. The full branch preserves
Stage 2 work but does not activate it.

## Stage 1 exact sequence — NOT deployment authorization

1. Finish the two release-only corrections above, run affected tests, and record
   screenshots. Reuse unchanged animation/backend evidence; do not restart audits.
2. Verify final branch SHA/clean tree, draft PR and passing CI. Obtain separate
   approval naming the exact SHA and replacement of the existing preview Worker.
   Neither a PR nor CI deploys the site. A merge into master is unnecessary.
3. On the already-authorized build machine, verify Wrangler account and active
   version using read-only commands. Record the active version ID, bindings and
   routes privately without exporting secret values. Confirm Workers Free and
   no paid bindings. Do not remove existing secrets merely because they are unused.

```powershell
npx wrangler whoami
npx wrangler deployments list --config wrangler.jsonc
npx wrangler versions list --config wrangler.jsonc
```

4. Build from the approved clean source using the established working environment.
   Do not deploy retained disposable-stack artifacts or a stale .open-next folder.
   Check local env files by key names/approved flags, never print their contents.
   The currently inspected .env.production.local has only SITE_URL/indexing keys.
   No local Supabase fixture, .dev.vars test bindings or REQUEST_ORIGIN override
   belongs in the release. Retain the existing OpenNext/Workers architecture.

```powershell
$ErrorActionPreference = 'Stop'
$env:SITE_URL = 'https://takween-labs-preview.abdzeez000.workers.dev'
$env:SITE_INDEXING_ENABLED = 'false'
$env:ENQUIRY_ENABLED = 'false'
$env:PERSISTENT_ENQUIRIES_ENABLED = 'false'
$env:OPERATIONS_ENABLED = 'false'
$env:BUSINESS_OPERATIONS_ENABLED = 'false'
$env:ENQUIRY_NOTIFICATIONS_ENABLED = 'false'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:WRANGLER_SEND_METRICS = 'false'
Remove-Item Env:REQUEST_ORIGIN -ErrorAction SilentlyContinue
npm run build:preview -- --check
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed' }
npm run build:preview
if ($LASTEXITCODE -ne 0) { throw 'OpenNext build failed; do not deploy stale output' }
npx wrangler deploy --config wrangler.jsonc --dry-run --outdir artifacts/stage1-worker-dry-run
if ($LASTEXITCODE -ne 0) { throw 'Worker dry run failed' }
```

build:preview invokes the installed OpenNext builder, including Next production
build. It never deploys. If the known Windows environment build issue recurs,
stop and use the established Linux build environment with the same approved SHA
and flags; do not change production config or reinstall dependencies speculatively.
The existing preview script forces indexing off but DOES NOT force all operational
gates off: the environment AND tracked wrangler vars above must be reviewed.

5. Test this exact public-mode build locally: contact-only UI, inaccessible owner
   operations, inert intake/dispatch, no uploaded files, noindex/robots/sitemap,
   favicon/share asset, desktop/phone T and gear. Rebuild/retest after code changes.
6. Only under the separately granted deployment approval, from that exact build:

```powershell
npx wrangler deploy --config wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw 'Deployment not confirmed' }
```

7. Record the actual URL/version and independently verify public HTTPS, current T,
   gear, touch/scroll/reset, navigation, manual Gmail, no send/upload/login path,
   noindex and assets. Test in the Instagram in-app browser on an actual phone
   where available; emulation is not a substitute. Do not promote a failing URL.
   Expected URL: https://takween-labs-preview.abdzeez000.workers.dev/ . No domain
   purchase, DNS, pages.dev migration or indexing change is needed for promotion.

## Rollback — separate production action

Before deployment record the active **Worker version ID**, not merely a Git SHA.
Confirm that version and its static assets are retained/redeployable. Record a
known-good source SHA, build flags and lockfile as a rebuild fallback. A rollback
is a deployment action: obtain an explicit recovery authorization with the launch
approval, or ask before executing it. No rollback is authorized by this document.

```powershell
$PreviousVersionId = Read-Host 'Recorded known-good Worker version ID'
npx wrangler rollback $PreviousVersionId --config wrangler.jsonc
```

Wrangler rollback syntax was checked locally with --help. Rollback creates a new
deployment of the selected version; validate bindings/gates, assets and routes
again. Older already-open pages may request newer assets: check both fresh and
existing tabs. If the version is unavailable, rebuild the recorded known-good
source in the same environment and request/execute the approved redeployment.
There is no Stage 1 DB rollback because no DB migration or activation occurs.
Never reset Supabase, rotate secrets or delete customer data as a website rollback.

## Stage 2 — separate controlled activation

Follow FRESH_HOSTED_BASELINE_RUNBOOK.md and HOSTED_ACTIVATION_PACKAGE.md:
protected baseline backup → isolated restoration proof → approved frozen 001–011
migration → catalog/security checks → separately reviewed 012–015 → signup/owner
invitation/allowlist/MFA recovery → hosted synthetic Auth/RLS/concurrency tests →
approved persistence/business gates → verified sender/secure notification recovery
and separately authorized real-email testing. No automatic promotion from Stage 1.
Customer uploads, payments and public catalogue publishing remain deferred.

No hosted backup, migration, invitation, email or operational activation is needed
to publish the brand website. These remain independent approval gates.

References:
https://developers.cloudflare.com/workers/ci-cd/builds/ and
https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/ ;
https://supabase.com/docs/guides/deployment/branching/github-integration .
Stage 1 update: both planned corrections are now implemented locally. See STAGE_1_RELEASE_CANDIDATE.md and HANDOFF.md for current results; the earlier NOT implemented wording above records the historical planning checkpoint. Production activation remains unauthorized.
