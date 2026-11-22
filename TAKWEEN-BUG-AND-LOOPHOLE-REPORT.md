# TAKWEEN bug and loophole report

Review-only findings. No fixes applied. Severity reflects this preview, not a future transactional product.

| ID | Issue | Severity | Category / affected location | Evidence and reproduction | Impact | Proposed fix / effort | Confidence / status |
|---|---|---|---|---|---|---|---|
| H01 | Idle is biased to one side | Medium | Motion, emblem-scene.tsx useFrame | yaw=-.23+sin(t*.6)*.23 gives -26.36 to 0 degrees, pitch remains 5.16 degrees. Inspect idle recording. | Does not gently oscillate about a front-facing pose, deep perspective obscures negative spaces. | Front-centred bounded 10–15 degree slow motion / half day | High / Confirmed |
| H02 | Abrupt manual handoff and reset | Medium | Motion, both hero components | idle offset becomes zero immediately on pointer down, rotation is assigned directly with no damping. Reset sets manual=true and zero user pose but adds fixed scene pitch/yaw. | Jump at handoff, angled reset, idle never resumes after interaction. | Preserve current rendered pose, ease transitions, explicit front reset and resume policy / half day | High source evidence / Confirmed |
| H03 | Unbounded yaw | Medium | Controls, hero-emblem.tsx | Click right 24 times, data-yaw becomes 6.720. Both drag and buttons add yaw without clamping. | Edge/back presentation loses recognisable logo. Pitch already bounded, do not claim upside-down pitch flipping. | Clamp all input paths to approved viewing range / 1–2 hours | High / Confirmed |
| Q01 | Existing tests miss visual control failures | Medium | QA, hero-emblem.spec.ts | Drag/reset assert data-yaw, not canvas pose. Seven viewport test explicitly enables reduced motion. | Green tests can miss frozen model or poor 3D clarity. | Rendered-pose checks plus actual-size review / half day | High / Confirmed |
| S01 | Two moderate tooling advisories | Medium | Dependencies | npm-audit.json, glob 10.5.0 and minimatch 9.0.9/10.2.6. Reproduce npm audit, no malicious payload necessary. | Potential build-tool resource exhaustion, public runtime path unproven. | Review compatible upstream patches, no force downgrade / half day plus verification | High affected packages / Confirmed |
| S02 | CSP absent | Low | Security headers, next.config.ts and live / | live-summary.json has null CSP. Read-only GET. | Missing defence in depth if an injection is introduced. No current XSS demonstrated. | Design compatible report-only CSP before enforcement / half day | High / Confirmed |
| O01 | CI workflow missing here | Low | Repository .github/workflows | Directory absent in this branch. | No versioned checks on this checkout to enforce future changes. Remote settings not inspected. | Add least-privilege check workflow after approval / half day | High / Confirmed |
| U01 | Preview file limits differ from approved future policy | Low | quote-form.tsx, enquiry.ts | 25*1024*1024, single file, label says MB. Approved future policy is 30 MiB, three files, 50 MiB combined. | Future implementation could inherit outdated validation. Not an active upload bypass. | Align specifications when backend is approved, use MiB labels / 1–2 hours | High / Confirmed |
| H04 | Manual pose may change without rendering | Medium | Demand rendering, emblem-scene.tsx | Interval stops on manual mode, no explicit invalidate when pitch/yaw change. Initial screenshots looked unchanged. Independent render-check.json shows different canvas pixels after keyboard rotation. | Potentially frozen drag/keyboard/reset despite passing state tests. | If reproduced, explicit invalidation and bounded smoothing / half day | High confidence in negative probe / Not Reproduced |

## Visual review

Fresh desktop reset capture shows dark extrusion walls narrowing the visible inter-layer gaps. The outline remains T-shaped, but the owner has rejected recognition and movement. Do not widen or redesign contours on the strength of a mask-overlap score. First compare a neutral, evenly lit orthographic/front-facing render to the reference at actual display size, then tune depth, bevels and materials while retaining the approved contour. This is visual review, not a quantified geometry defect.

## Positive evidence

Seven active-WebGL viewport overflow checks passed. Context-loss fallback appeared. Reduced motion removed the canvas. JavaScript-disabled main content was visible. No pageerror captured. These results do not prove absence of leaks or optimal performance. Context restoration does not retry after failed=true, fallback persists, which is graceful degradation rather than an automatically classified defect.

## Evidence limitations

Current screenshots and recording show the unchanged rejected model. side-angle.png records an attempted drag, not proof the requested angle was rendered. No improved-model screenshot exists. No fresh side-by-side composite, physical Safari/iPhone/Android, Edge, Firefox, long-running soak, real GPU memory, battery measurement, full screen-reader audit, slow-network/offline/asset-block matrix or production performance comparison was completed. These remain outstanding rather than passed.
