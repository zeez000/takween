# TAKWEEN security audit

Audit date 2026-11-08. Review only. Branch codex/hero-layered-t, base 4be226869043ed8ed7d23ac7494da5eb4573d02e plus existing uncommitted hero work. No application changes, dependency upgrades, SQL, pushes or deployment were performed.

## Executive summary

Eight confirmed findings are consolidated in TAKWEEN-BUG-AND-LOOPHOLE-REPORT.md. Zero Critical, zero High, five Medium and three Low. One additional rendering suspicion was NOT reproduced by the pixel probe, which confirmed changed canvas pixels after keyboard rotation. Counts describe this bounded investigation, not proof of complete security. Hero publication remains blocked by owner rejection and motion/pose defects. No exploitable critical issue was demonstrated against the existing public foundation preview. Future backend activation remains blocked by missing security implementation.

## Executed checks

- Lint and TypeScript passed. Nine unit tests passed.
- Six existing homepage browser tests passed against localhost development mode using a separate audit config, Chromium and reduced motion. The mobile-menu test can pass without exercising a mobile menu at desktop width. This is not full browser coverage.
- Seven viewport checks with active hero WebGL passed overflow checks. No pageerror events captured in that run.
- Read-only GET probes returned 404 for /.env.local, /.git/config and /api/quote. /admin and /track returned honest placeholder pages, not customer data.
- Only .env.example is tracked among .env files. Ignore rules cover .env files, .dev.vars, generated Worker output and artifacts. No claim of exhaustive Git-history secret scanning is made.
- Source inspection found escaped JSON-LD HTML insertion, no demonstrated attacker-controlled HTML sink. No implemented quote API or authentication mutation was found in App Router files. CSRF, SQL injection and authenticated authorization are not passed tests of a nonexistent backend.
- Three production GET requests verified HTTP 200, noindex/nofollow, robots Disallow / and empty sitemap. DENY and nosniff present. CSP absent.

## Dependency research and applicability

The initial sandbox npm registry lookup failed. Read-only retry succeeded and returned 12 moderate package entries, zero high/critical. These are propagated dependency entries from TWO advisories, not twelve independent exploitable vulnerabilities.

| Advisory | Published | Affected / installed | Applicability |
|---|---|---|---|
| [Glob GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | 2026-10-27, updated Oct 30 | 9.0.0 through 14.0.1 / 10.5.0 | Affected package confirmed in OpenNext/minifier tooling. Continued traversal after cancellation. Untrusted public input reaching this path not demonstrated. |
| [Minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | 2026-10-27, updated Nov 4 | >=7 <11.0.1 / 9.0.9 and 10.2.6 | Pattern amplification with optimizationLevel >=2. Build/lint chains confirmed. Attacker-controlled production pattern not demonstrated. |
| [Next October security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) | 2026-10-14 | Fix in 16.4.1 / installed 16.4.5 | Installed version exceeds this patch release. Do not label this advisory an active project exploit. This comparison does not certify all future advisories. |

React/react-dom lockfile versions are 19.3.1. Next bundles RSC internals, so React's top-level version alone is insufficient security evidence. npm audit did not flag Next/React in this run. No claim of supply-chain integrity from an audit result. Avoid npm audit fix --force, whose offered downgrades are not validated fixes. Resolve tooling-compatible patches after approval and verify built Worker inclusion before assigning runtime exposure.

## Configuration and operational review

Wrangler uses OpenNext, nodejs_compat, global_fetch_strictly_public, explicit Worker/account and self-reference binding. SITE_INDEXING_ENABLED is false and SITE_URL matches the preview. Observability is disabled. This limits diagnosis but is not a demonstrated outage. No .github/workflows directory exists on this checkout, so CI protections cannot be credited. Account permissions, dashboard settings, billing and deployed bundle identity were not revalidated. Rollback must preserve the prior known-good Worker version and preview variables, no rollback performed.

## Future upload security — not current exposure

schema.proposed.sql enables RLS but provides no policies or storage definitions. Its positive size constraint does not enforce approved limits. Do not execute it as production-ready implementation. Require 30 MiB/file, 3 files/enquiry and 50 MiB combined, atomic reservations, private quarantine, random object paths and ownership enforcement. Generic ZIP remains disabled. 3MF is ZIP internally and needs entry/count/decompressed-byte/compression-ratio/time limits, canonical path checks, duplicate-name rejection, XML entity/external reference disabling and required-package structure checks. Numeric archive limits must be recovered from the approved design and tested, not invented here. STL needs bounded triangles, finite coordinates and parser budgets. STEP requires a separate bounded parser. MIME/extension alone is insufficient. Preview parsing belongs in a bounded worker with triangle and GPU budgets. Privileged credentials stay server-side. Deny-by-default RLS tests must cover customer cross-access, invitation-only MFA admin authorization and private object access. Guest tokens need strong entropy, hashes, expiration, revocation, rate limits and minimal returned data. Retention remains provisional.

[OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), retrieved 2026-11-08, supports layered validation and private storage. [OpenNext Cloudflare documentation](https://opennext.js.org/cloudflare) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) were consulted. No new live configuration was applied.

## Limitations

No full Git history secret scan, authenticated Supabase tests, production bundle reachability analysis, destructive payloads, load testing, third-party scanning, physical-device testing or multi-browser matrix. XSS, traversal, redirects, CORS and prototype pollution have not received exhaustive adversarial coverage. CSP absence is not proof of XSS. No production build was rerun, to avoid conflicting with the retained development server output. No fresh production Lighthouse scores. This is an evidence-backed partial audit, not a completed penetration-test certification.

Evidence in artifacts/red-team includes npm-audit.json, live-summary.json, live-robots.txt, live-sitemap.xml, browser-results.json, regression.json, screenshots and recording.
