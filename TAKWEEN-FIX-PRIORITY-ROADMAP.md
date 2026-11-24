# TAKWEEN fix priority roadmap

Research and testing only. Wait for owner approval before application changes.

## First five proposed fixes

1. H04 verification and Q01 coverage. Confirm rendered pixels actually respond to inputs, then fix demand invalidation if reproduced. Preserve working lower assembly.
2. H01/H02. Front-facing neutral pose, slow bounded symmetric idle, smooth handoff and reset. Choose whether idle resumes after a delay with the owner. No sudden pose replacement.
3. H03. Consistent bounded yaw for drag and keyboard, keep existing pitch guard and vertical touch scrolling.
4. Owner visual review. Compare exact contours against the approved logo at desktop/mobile sizes. Tune depth and lighting before changing geometry. Supply genuine default/side captures and short idle/drag/reset recordings of the proposed version.
5. S01. Resolve tooling advisories with compatible upstream versions after approval, retest production Worker output. Do not apply forced downgrades.

Then propose least-privilege CI and a tested report-only CSP. Reconcile future upload specifications and secure backend plan separately, with no live migrations or activation.

## Approval gates

Hero remains a release blocker for this feature because the owner rejected it. No deployment or merge. Existing public foundation is not newly approved or revoked by this limited audit. Zero confirmed Critical/High exploit findings does not mean the site is proven secure. Missing backend controls block backend activation, not the honest static preview.

## Remaining verification

Fresh isolated production build, OpenNext bundle inspection, production benchmarks, Chrome/Edge/Firefox/WebKit coverage, physical iPhone/Android, performance traces, memory soak, backgrounding and lifecycle stress, full accessibility/contrast/keyboard review, slow-network/offline/blocked-assets cases, thorough safe injection and source-map checks, historical secret scanning and remote CI settings. Validate live storage/RLS only with separately authorized credentials and read-only scope. No credentials requested in chat.

## Scope preserved

Application source is unchanged by this audit. Existing local hero changes were neither discarded nor committed. Local port 3100 is retained. No push, merge, deployment, database mutation, indexing activation or new paid service occurred.
