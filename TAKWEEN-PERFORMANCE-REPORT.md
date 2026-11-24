# TAKWEEN performance report

This run used development mode on port 3100 and Chromium SwiftShader software WebGL. It is unsuitable for mobile hardware or production speed claims. No new Lighthouse score is asserted.

## Current observations

Hero caps DPR at 1.25, uses procedural geometry without high-resolution textures and a demand-rendered canvas. Idle invalidation occurs every 40 ms, approximately 25 requested frames/second. This cadence is below a typical 60 Hz display and could contribute to perceived stepped movement, but actual hardware frame pacing was not measured. Visibility and reduced-motion paths unmount the scene. Geometry and material disposal are explicitly present. This is source evidence, not proof of leak-free remounting. Three.js [cleanup guidance](https://threejs.org/manual/pages/cleanup.html) requires explicit resource disposal. Renderer counters can retain internal resources and are not by themselves a leak diagnosis.

The new idle has roughly a 10.47-second period and a 26.36-degree total yaw sweep biased toward one side. Shape visibility should be tested across that entire sweep. No constant automatic 360-degree spin exists. Unbounded manual yaw does exist.

## Historical benchmark, not rerun

artifacts/hero-review/lighthouse-matched-baseline.json and lighthouse-matched-candidate.json contain the earlier matched local production comparison. Previously reported mobile scores were 90 baseline and 89 candidate, LCP 2.8 vs 2.9 seconds and TBT 260 vs 310 ms. These are historical, not current certification. Earlier unmatched mobile 62 and desktop 91 results demonstrate sensitivity to test conditions. Do not compare development-mode software rendering against the user's live 77/89 scores to infer regression.

## Repeatable benchmark required before approval

Use isolated production output and identical Next/Node/Chromium versions, identical viewport/DPR/network/CPU settings, same entry-screen state and fresh profiles. Run at least three interleaved baseline/candidate measurements and report median and range. Separately measure idle, drag and scroll frame times on actual hardware, tab backgrounding and 20 mount/unmount cycles, GPU resource plateau, heap trend and input responsiveness. Capture performance traces, not just scores. Keep port 3100 intact. No build ran in this pass because sharing generated output with the retained dev server would weaken reproducibility.

## Findings and outstanding work

H01–H04 and Q01 in the issue report explain the motion and test concerns. No GPU leak, battery regression, low-end Android failure or Safari performance issue is confirmed. Backgrounding implementation is present but real-device battery behavior remains unmeasured. Mobile launch approval requires visual owner review and real-device checks, not only automated state assertions.

# Follow-up — direct-hero optimization and production validation

22 November 2026. Branch codex/hero-layered-t. Existing local work preserved. No push, merge, deploy, purchase, indexing change or backend activation.

## Investigation before changes

The old score of 56 was not reproduced as a fixed universal score. Fresh direct-hero desktop measured 69 / 760ms TBT and mobile 68 / 1870ms TBT using the retained Turbopack server. The initial desktop run overlapped a short diagnostic probe, so treat it as exploratory. Saved older desktop trace shows 3306ms script evaluation versus 128ms rendering/paint, with large tasks in shared Three/R3F and scene chunks. This supports startup JavaScript/scene initialization as a bottleneck; it is not a measured GPU utilization diagnosis.

A direct-hero browser probe found two active canvases: the hero T and the lower mechanical assembly. The lower assembly was only partly visible, but its observer watched the entire multi-screen chapter and initialized immediately on any intersection. Blocking only its identified dynamic chunk kept the T mounted and improved diagnostic desktop 69 to 86, TBT 760ms to 320ms. The blocked run is diagnostic only, not a deployable solution. Probe files causal-probe.json and mobile-probe.json live under artifacts/performance.

## Surgical fix

src/components/assembly/assembly-experience.tsx now observes the sticky assembly stage at 50% intersection instead of the entire chapter at any intersection. The full procedural assembly loads when visitors reach it, preserving native scrolling and deterministic scroll behavior. It no longer competes with the hero on direct desktop entry. On mobile the candidate probe records one hero canvas and zero lower-assembly canvases before scrolling.

No T outline, extrusion, materials, lights, camera, idle waveform, manual input or reset code changed. No geometry was removed or renderer dependency added. No claim of reducing all mobile startup cost: shared renderer loading/initialization remains visible in the mobile traces. Do not arbitrarily delay the T or degrade its approved appearance merely to improve a score.

New test in tests/browser/hero-emblem.spec.ts asserts direct hero loads the T without lower canvas, then confirms the assembly becomes ready on entering its stage. Existing visible-pixel rotation/reset tests pass unchanged.

## Comparable before/after production measurements

Two local sequential Lighthouse rounds using identical Next 16.4.5 webpack builds, same installed dependencies and Chromium, same machine, fresh Lighthouse profiles and /#hero-title entry. Baseline at port 3101, candidate at 3102. Default Lighthouse mobile throttling and desktop preset. Second round reverses candidate/baseline order. This is a small local lab comparison, not a statistical regression guarantee or field Core Web Vitals. Portions of host-side build/file/static-check work overlapped benchmark windows, so ranges should not be treated as clean-room CPU-isolated numbers. No Lighthouse warnings appeared in these four pairs. Older Turbopack scores and normal intro-entry scores are not the matched baseline.

| Metric | Baseline round 1 / 2 | Candidate round 1 / 2 |
|---|---|---|
| Desktop performance | 68 / 72 | 94 / 89 |
| Desktop TBT | 740 / 770ms | 200 / 280ms |
| Desktop LCP | 1.5 / 0.3s | 0.3 / 0.3s |
| Mobile performance | 53 / 52 | 55 / 57 |
| Mobile TBT | 1950 / 2480ms | 1590 / 1170ms |
| Mobile LCP | 5.1 / 5.0s | 5.0 / 5.0s |

Raw matched-*.json and repeat-*.json preserve all samples. Desktop improvement is supported by the loading probe and chunk-block experiment. Mobile remains poor and its precise renderer/shader/task breakdown needs further profiling on representative hardware. Real GPU utilization, battery cost, sustained FPS, heap plateau and physical-device behavior were not measured. No claim of a mobile performance pass.

## Fresh build and runtime results

- Fresh isolated Next production baseline and candidate webpack builds PASS, including build-time TypeScript and generation of 9 static pages. The first isolated Turbopack build stalled with dependency junction/root layout and was interrupted, not passed. Webpack was used only in disposable build copies; application package.json and next.config.ts remain unchanged.
- Root lint/typecheck PASS; all 9 unit tests PASS.
- Candidate production browser tests: 34 PASS, 8 intentional skips, zero failures (~1.6m). Chromium and emulated iPhone WebKit, not physical Safari. Native touch scroll, lower assembly reverse timeline, active T layouts, pixel reset, keyboard and fallbacks pass.
- Full OpenNext build attempted in isolated candidate. Its Next build PASS, packaging FAIL. Shared dependencies caused a nested standalone app path. The actual generated app files were copied into OpenNext's expected location in that disposable output, without fabricated manifests. A second skip-build packaging attempt progressed but failed copying react-dom through the dependency junction (EINVAL) and bundling native Windows sharp .node modules. Neither package attempt is a valid Worker artifact. OpenNext warns Windows is not fully supported.
- Wrangler dry run and Cloudflare runtime tests BLOCKED because no valid fresh Worker bundle was produced. They were not passed or substituted by Next server tests. No stale generated Worker should be deployed.
- Existing Ubuntu WSL was checked as fallback. Linux node is absent and npm resolves to Windows. A clean Linux Node/dependency environment is required before rerunning build/runtime checks. No OS packages or system settings were installed/changed.
- The original port 3100 server was not stopped or rebuilt. It remains the prior unoptimized preview. Candidate port 3102 is the updated isolated production preview. Port 3101 serves the matched baseline.

## Visual and backend regression checks

Updated actual screenshots: artifacts/performance/desktop-front.png, mobile-front.png, front.png, side-angle.png. Recording: idle-drag-reset.webm. At seven sizes 360x800 through 1920x1080 no overflow or pageerrors were captured. Raw-channel comparison against previous approved captures found identical dimensions and zero channels differing by more than 16 in all four images; see visual-comparison.json. This is pixel evidence plus visible test coverage, not owner approval or an exhaustive GPU/browser guarantee.

Local quote form still creates local drafts only, selected files remain local, no mutation fetch is implemented. /admin and /track remain public explanatory placeholders without operational data. Local backend activation checks pass in existing browser tests. SITE_INDEXING_ENABLED remained false throughout isolated builds. Local production metadata regression passed.

The public deployment was not modified. Previous audit found its newer email implementation on a different branch and the old hero. The Resend quantity-regex and false-success findings remain unresolved, and actual inbox delivery remains unverified. These changes do not silently restore that email branch or activate it locally.

## Release decision

NO-GO for the requested .com launch. Remaining blockers:

1. Profile/fix mobile startup and verify on real phones; scores 55–57 with ~5s lab LCP are not an acceptable performance sign-off.
2. Build/package and exercise the final Worker in a clean supported Linux environment; perform Wrangler dry run and local workerd browser/API tests.
3. Reconcile the T branch with verified email code without losing either. Fix prior Resend validation/false-success/rate-limit issues and confirm real delivery under approved test conditions.
4. Obtain visual approval and confirm exact .com ownership/canonical host, safe DNS/TLS rollout and production configuration. Keep indexing disabled until separately approved.

This pass changed only the assembly loading observer and added its regression test, besides ignored harness/build/benchmark/capture files and this report update. All prior work and reports retained. No working T design or interaction changed.
