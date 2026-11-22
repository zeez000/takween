# Original mechanical assembly preservation

22 November 2026. Branch codex/combined-release, base b32c0f9. No push, merge, commit, deployment, indexing change or production configuration change in this verification pass.

## Was the gear changed?

The mesh, geometry, materials, lighting, camera, idle movement, deterministic explosion timeline and control implementation were never changed by the layered-T work. Loading was changed during audits: the first version preloaded the whole chapter with rootMargin 180px, the pre-launch audit removed that margin, and later performance work gated initialization until half the sticky stage was visible. A prior audit also added six gear-specific short-landscape layout overrides.

On entering this pass, three uncommitted edits were already present: original rootMargin loading, removal of those six gear CSS overrides, and the test expectation reflecting original loading. These were preserved, archived in artifacts/gear-review/starting-local-changes.patch, compared and rebuilt rather than overwritten.

## Is the original fully restored?

Yes, the gear-specific implementation now matches the first Git implementation f0d27a8. Normalized file bytes and SHA-256 match for:

- src/components/assembly/assembly-experience.tsx — includes original loading and interactions.
- src/components/assembly/mechanical-scene.tsx — includes original geometry, lighting, camera and movement.
- src/lib/assembly-timeline.ts — original reversible timeline.
- src/components/part-visual.tsx — original static fallback.
- src/app/globals.css — original shared layout rules.

All original cinematic.css rules are preserved verbatim. Its remaining additions concern entry screen and ordinary section reveals, with no new assembly/tech-callout selectors. Source comparison is saved in artifacts/gear-review/source-comparison.json. This is exact source evidence; no original historical screenshot baseline exists to claim GPU-independent historical pixel equality.

Hero component files, quotation form, email route/handler and Wrangler security configuration have zero diff against b32c0f9. The T and email/security fixes remain intact. No gear redesign, mesh simplification, material/lighting replacement or movement change was applied. Changes remain local for owner appearance approval.

## Actual verification

- Lint and TypeScript PASS.
- Unit tests: 27 PASS.
- Fresh isolated Linux Next production build, OpenNext packaging and Wrangler dry run PASS. Logs saved under artifacts/gear-review/build.log and dry-run.log.
- Actual local workerd preview http://localhost:8788/ . Sending remains disabled, no provider credentials installed and no real email sent.
- Full browser suite: 37 PASS, 8 intentional skips, 1 FAIL. Both T/gear controls, gear forward/backward scroll, reset, native touch rotation/vertical scroll, fallback, metadata and email contract tests pass.
- The failure is original short-landscape behavior at 844x390: Reset view has viewport ratio 0. The removed audit overrides previously addressed this. No test was suppressed and the original layout was not changed again to hide this limitation.
- Desktop and 390x844 portrait capture runs show no pageerrors or horizontal overflow. Gear returns to explosion 0.0000 and T reset yaw 0.000. WebKit coverage is emulation and includes fallback; this is not physical iPhone/Safari testing.
- Recordings show T idle/reset, assembled original gear, progressive explosion, reassembly and reverse scrolling. Geometry/state are independent components; no control/timeline state was shared or rewritten.

## Screenshots and recordings

All are actual captures from the restored production Worker, not mockups:

- artifacts/gear-review/desktop-t.png
- artifacts/gear-review/mobile-t.png
- artifacts/gear-review/desktop-gear-assembled.png
- artifacts/gear-review/mobile-gear-assembled.png
- artifacts/gear-review/desktop-gear-exploded.png
- artifacts/gear-review/mobile-gear-exploded.png
- artifacts/gear-review/desktop-both-animations.webm
- artifacts/gear-review/mobile-both-animations.webm

Browser results, capture-results.json and source-comparison.json are in the same directory. The regression test suite uses actual Chromium WebGL for interactions and emulated mobile inputs/viewports. Physical-device coverage is not claimed.

## Mobile performance investigation, without changing originals

A fresh direct-hero Lighthouse mobile run with both originals enabled scored 45, LCP 7.1s, TBT 4660ms, no run warnings. The prior score 50 was another small local sample, not a controlled benchmark against this restored implementation, so do not claim an exact five-point regression. The current run confirms mobile performance remains a release concern.

Trace main-thread breakdown: script evaluation about 7199ms, style/layout 949ms, parsing/compilation 227ms and paint/render 78ms. Leading script-evaluation chunks are shared 3D runtime/scene startup. This does not support claiming that excessive visual geometry or measured GPU utilization alone caused the score. No geometry sacrifice was made.

Diagnostic-only browser wrappers around WebGL calls recorded both gear and hero contexts on direct entry. In an unthrottled 390px sample, long tasks totalled about 834ms; wrapped compile/link/status calls were short, with the largest measured call about 1ms. The gear performed initial drawing even before being meaningfully visible, consistent with its ORIGINAL early-loading behavior. These wrappers measure CPU-side call durations and add overhead; they are not a GPU-time benchmark or physical-device performance test. CPU sample-profile extraction from the saved trace did not yield profile chunks, so no function-level CPU attribution is claimed.

Do not restore the rejected 50% loading change or remove either animation to inflate a score. Next safe investigation should isolate shared bundle evaluation, procedural resource initialization and scheduling using repeatable traces on real mobile hardware, testing output equivalence for any proposed optimization. No such new performance modification was made in this pass.

## Decision

The original gear is restored and ready for owner visual comparison alongside the T. Appearance approval remains pending. Public release is not signed off because mobile performance and the inherited short-landscape control visibility issue remain, together with the previously documented real-world email verification gates. Live preview unchanged.

## Subsequent approved release-stage adjustment

After the exact-original verification recorded above, the owner approved fixing short-landscape control access while retaining the original gear appearance. That targeted layout exception and the now-passing 844x390 test are documented in RELEASE_STAGE.md. The earlier failure above is historical; it is not the final release-stage result.
