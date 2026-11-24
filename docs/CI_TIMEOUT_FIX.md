# PR #4 CI timeout investigation

Failed run: https://github.com/zeez000/takween/actions/runs/45002097690
Commit: 88ba96cbc492713559136b3e15dd460cabde9b7b. Job 137145663709. Uploaded browser-failures artifact 14746681634 was downloaded and its Playwright trace inspected locally.

## Cause

The combined hero interaction test exhausted its 60-second total budget on the hosted runner. This was cumulative slow CI action/graphics processing, not a stalled screenshot or a demonstrated incorrect animation.

Trace evidence:

- CDP screenshots completed in 687, 713, 715 and 653ms. None was stuck.
- The drag rendered correctly; the unchanged >3% changed-pixel assertion passed.
- Reset rendered correctly; the unchanged <0.5% changed-pixel and <0.5 mean-channel-difference assertions passed. Uploaded front/drag/reset images were inspected.
- The right-key rotation and +0.600 yaw assertion passed.
- Repeated Enter actions cost roughly 1.4–1.9s each on this runner. The original test combined 21 right/left key actions with pointer steps, startup, four captures, image decoding and reset polling inside one 60-second budget. The timeout occurred near the end of the left-key boundary sequence.
- Other WebGL tests passed in the same run. This evidence does not remove the separately documented mobile startup performance concern or certify real-device animation speed.

## Exact fix

Only tests/browser/hero-emblem.spec.ts changes behavior in this fix. The visible mouse drag, strict screenshot reset and single-key rotation remain in the original test. The repeated left/right clamp coverage moves into a new independent test, starting from a reset pose and still using native keyboard input.

All previous assertions remain: data-ready, absence of old sliced hero, visible pixel rotation, exact reset within existing tolerances, yaw .540/0/.200, and clamps +.600 and -.600 after the same repeated key counts. No tolerance, per-assertion timeout or 60-second test timeout was relaxed. No retries, WebGL skips, geometry, lighting, frame scheduling or application changes were introduced. The additional WebKit skip is the same existing Chromium-only input mechanism, now represented by two independent tests instead of one.

## Local verification

A first attempt used the old temporary localhost:8795 Worker, which had stopped, and failed with connection refused. It was not counted as an application/test fix result. A fresh Next production build passed, then the normal Playwright webServer configuration started the production server on port 3100.

Focused run: both desktop tests passed (8.3s and 2.8s; 15.9s total). Full suite and static validation results are recorded below once complete. GitHub CI must pass on the pushed fix before this work is considered verified remotely.

Raw failure trace, decoded action timings and uploaded images are retained under ignored artifacts/ci-fix. The artifact's temporary download URL and raw workflow logs are not committed.

## Completed local validation

- Focused tests: 2 passed, 15.9 seconds total.
- Full browser suite with the normal production-server configuration: 39 passed, 9 intentional project-specific skips, zero failures, about 1.6 minutes.
- Lint, TypeScript and fresh Next production build: passed.
- Diff contains only this investigation note and the test split. Application/design files, screenshot thresholds, keyboard counts, retries and test timeout are unchanged.

The remote result is to be verified on the new commit's GitHub Actions run and reported with its run URL. The older failed run is historical and is not re-labelled as passing.

## Hosted follow-up and second race

Commit ded0223 passed the complete PR workflow in run [45011697457](https://github.com/zeez000/takween/actions/runs/45011697457). The simultaneous push run 45011693059 passed both hero tests (16.9s visual interaction/reset, 22.4s keyboard boundaries), but exposed an independent assembly scroll-test race.

Its uploaded trace (artifact 14749709601) records initial hash navigation still advancing: scrollY 593 before the wheel, 601 immediately afterwards, then 621 through the failed polling window. The test had accepted an intermediate anchor position as its starting point. It did not establish a settled scene before issuing a native wheel gesture.

The assembly test now loads the page without a competing hash navigation, waits for document fonts, positions the story with an explicit instant scroll, waits for the desktop renderer to be ready, and moves the pointer over the story before issuing the same native wheel input. The >200px scroll assertion and pan-y/overflow assertions remain unchanged. No application scroll handler, animation, geometry, lighting, timeout, retry or screenshot threshold changed.

Five repetitions of each affected case passed locally: 15/15 (hero visible drag/reset, keyboard bounds, story wheel). The expanded production browser suite passed 43 tests with 9 existing platform-specific skips; the same result passed against freshly built local workerd. Added customer tests cover quantity boundaries, invalid values, duplicate submission, slow mocked transport, failed network and idempotent recovery. A real 10-second abort deadline is exercised by the mocked provider unit test. See COMPLETE_QA_RELEASE.md for the full evidence and remaining launch gates.
