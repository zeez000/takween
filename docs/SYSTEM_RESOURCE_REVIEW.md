# Local resource and dependency review — 26 November 2026

The eleven moderate npm audit entries resolve to two underlying advisories,
not eleven independent defects. No high/critical entries were reported.

| Advisory | Affected / fixed | Applicability |
| --- | --- | --- |
| GHSA-3g3m-2fjr-6pw4, published 27 October, updated 30 October | glob 9.0.0–14.0.1; fixed 14.0.2 | Installed under node-minify and OpenNext CLI. Cancellation can leave filesystem traversal running. Build/cache-population tooling exposure; no direct application import or customer-controlled glob input found. |
| GHSA-g3hv-75wg-m249, published 27 October, updated 4 November | minimatch >=7.0.0 <11.0.1; fixed 11.0.1 | Pattern amplification at optimizationLevel >=2. Installed in glob build tooling and typescript-eslint parser utilities. Repository/tool configuration is relevant; no customer input path found in application source. |

Sources: https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 and
https://github.com/advisories/GHSA-g3hv-75wg-m249 .

Inspected call sites include OpenNext dist/cli/build/bundle-server.js,
bundle-node-middleware.js, load-manifest.js and commands/populate-cache.js;
node-minify dist/index; typescript-estree useProgramFromProjectService.js.
Inherited npm warnings on OpenNext AWS/Cloudflare and typescript-eslint wrappers
reflect these paths. No proven remotely exploitable customer endpoint was found.
This is not a proof that every bundled transitive code path is unreachable.
Do not apply a blanket glob 14/minimatch 11 override across incompatible major
versions merely to erase warnings. A supported upstream tooling update should be
reviewed separately with build regression tests; no dependency changes made here.

Existing verified dry-run upload: 7,685.42 KiB raw / 1,831.42 KiB gzip. This is the
whole upload, not just the 2,278-byte Worker entry shim. No application source has
changed since that build. The current local Worker responded HTTP 200.
One read-only process sample reported workerd RSS 185,764 KiB and lifetime-average
CPU 0.3%. Process RSS includes runtime overhead and is NOT per-isolate heap usage;
this cannot be compared directly with hosted 128 MB isolate limits or treated as
a memory-leak/load result. No hosted CPU request measurement was performed.

The shared owner limiter is 30/minute. List views currently request both records
and choices; this limits rapid browsing and adds reads even for read-only reports.
Treat as a documented usability/capacity constraint until measured under real
owner usage, rather than weakening rate limits. Reports are whole-database
aggregates; name searches use case-insensitive substring matching. Pagination
limits returned rows, not aggregate scans. Current small-business data volumes
are supported by local tests; large-volume latency and hosted CPU headroom are
unverified. No speculative indexes or query refactor were applied.

Migrations 012–015 are additive and transactional. Explicit object revokes and
AAL2/current-owner checks preserve deny-by-default access. Retry ledgers serialize
command UUIDs; stock and reservations lock underlying rows. Finance corrections
append reversal entries. 015 freezes notification body content at first claim,
rejects active lease migration and holds unknown historical attempts. The new
snapshot includes personal data and must be covered by retention and backup.
Actual local integration has freshly passed all 22 groups with these migrations.
The hosted 001–011 package has not been regenerated or changed during this review.

Fresh read-only actual PostgreSQL measurements used five sequential AAL2 RPC
samples per kind against the existing synthetic dataset. Execution ranges (ms):
reports 53.142–61.793; job_costs 4.749–6.044; customers 15.449–16.226;
materials 0.995–1.144; scheduling 4.488–5.067. Evidence:
artifacts/system-query-timings.json. EXPLAIN ANALYZE of the RPC boundary includes
database execution, not network or Worker CPU; it does not expose inner plans.
These small-dataset observations do not justify speculative indexes or guarantee
large-volume scalability. Whole-database reports remain the slowest measured RPC.

Current Cloudflare documentation lists Free 100,000 requests/day, 10ms CPU and
128MB memory. The 4 September 2026 size-limit change raised Worker size to 64MiB
on both plans; older 3MB compressed Free guidance is obsolete. The recorded bundle
is below the new size ceiling, but startup/CPU and memory need actual hosted
measurement before operational activation. Do not equate DB milliseconds with
Worker CPU. Sources:
https://developers.cloudflare.com/workers/platform/limits/ and
https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ .

UI view-load measurements across fourteen views (unthrottled Chromium emulation,
including click/network/render): desktop min/median/max 199/284/998ms;
tablet 195/313/960ms; phone 192/325.5/935ms. These are one matrix run, not
Core Web Vitals, a low-end-phone benchmark or a before/after optimization claim.
Files: artifacts/system-review-{desktop,tablet,mobile}-timings.json.

Remaining resource limits: hosted CPU/usage, long-duration heap behavior,
physical-device performance and representative larger-volume query plans are
unverified. These are explicit activation/capacity checks, not claimed passes.
