# Milestones and acceptance

## Active v1.7 gate

Verify exact simulation-time scoring boundaries and separate persistence, sustained late crossbow cadence, simultaneous and overlapping lightning batches, flame target-set non-repetition, actual cross-family active overlap, complete-wave/disclosure fairness, production offline reload and inspected phone captures. Store new evidence only in `docs/evidence/v17/`.

## Active v1.6 gate

Verify candidate versus accepted/played spatial coverage, lightning relay length and nonoverlap, full-lane flame count/orientation choices, late warning and active timing, mixed lightning occurrence, whole-wave/disclosure fairness, production offline reload and inspected phone-size timed frames. Store new evidence only in `docs/evidence/v16/`.

## Historical v1.5 gate

`REVISION_V1_5.md` supersedes conflicting historical milestones. Verify disclosure-aware rejection of hidden commitment traps, one projectile per source warning, uniform ordinary arrow speed, one strike duration per lightning wave, the revised five flame and four ground-fire structures, progressive group ignition gates, full-wave fairness replay, production offline reload and inspected phone-size timed frames.

## Active v1.4 gate

`REVISION_V1_4.md` is authoritative. Verify full-lane flame geometry, interwoven safe-pocket and asymmetric variants, stage-specific windup and pressure, instant and sustained lightning collision, complete-wave fairness replay, production offline reload and inspected phone-size timed frames. Older milestone descriptions below are historical where conflicting.

## Active v1.3 revision gate

`REVISION_V1_3.md` supersedes conflicting historical milestone family, catalog and pacing descriptions below. The active gate requires damage-lifetime audits, twenty dedicated patterns and mixed composition, compressed effective-time pressure, complete-wave witness replay, production build, browser flows, offline reload and inspected phone frames. Keep the historical M0–M7 log for provenance.

## C. Implementation milestones — sequential, self-verified

Proceed to the next milestone after its internal gate passes. Do not stop to ask “shall I continue?” There is no separate human sign-off between stages in this authorized run.

| ID | Deliverable | Internal gate |
| --- | --- | --- |
| M0 | Read repository instructions; preserve baseline; create product/architecture/asset/milestone docs and project instructions; scaffold toolchain | Existing work preserved; dependencies pinned; typecheck/build execute; no extra scope |
| M1 | Pure movement, input adapters, continuous collision, simulation lifecycle, seeded attack timeline | Meaningful tests for queue saturation, edge commands, in-motion hits, swept collision, pause/retry; playable local arena |
| M2 | Arrow and spike families; fairness search and validated fallback | Reproducible path witness tests include unreachable safe tiles, flame-like blocking intervals, active movement/queue; neither warning nor fallback lies |
| M3 | Final-quality visual slice and audio foundation | Inspect phone-size screenshots; align art/collider/warnings; fix style/readability problems before expansion |
| M4 | Flame and boulder; complete catalog; difficulty weights/caps/chains | All four families and seven pattern categories appear in deterministic fixtures; seeded validator suite passes and runtime remains bounded |
| M5 | Tutorial, homepage, HUD, results, pause, independent sound/haptics, reduced motion, local persistence | Browser flows work; Retry clears state; capabilities degrade correctly; no repeated tutorial |
| M6 | PWA/offline, responsive portrait/desktop, lifecycle/performance | Production build runs; offline cached reload plays full game; focus/orientation pause checked; screenshots and measured resource report |
| M7 | Full regression, visual cleanup, README, acceptance evidence and handoff | No known fixable critical issue; report PASS/PENDING/BLOCKED honestly; runnable v1 candidate, not scaffold |

Each milestone updates docs/PROGRESS.md and captures reproducible evidence. If a test fails, fix the cause; do not relax expectations to hide the defect. If a full run hits context/time limits, persist the exact checkpoint, commands and next task so continuation is precise.

## D. Verification and release-candidate evidence

Required commands: package scripts for dev, build, typecheck, test and browser tests. Document Node version and clean-install instructions. Run a production preview rather than validating only the development server.

Important deterministic cases:
- One swipe exactly one move, ambiguous/released/cancelled/multi-touch input, full queue ignores, invalid boundary direction leaves queue available.
- Mid-move queue executes at destination; keyboard repeat ignored; pause/death/retry never replays commands.
- Arrow crosses between frames without tunneling; previously passed lane becomes safe; spikes/fire active intervals; boulder impact near movement boundaries.
- Fixed targets after telegraph; all batch timings reflected visually; no damage from aftermath.
- Wave completes once, death wins a simultaneous boundary, no point for partial chain.
- Fairness rejects a reachable-in-space but unreachable-in-time destination; checks an already queued move; accounts for reaction delay, swipe cadence, continuous segments and conservative margins.
- Candidate exhaustion does not produce an unvalidated attack; seed reproduces schedule/witness.

Seeded suite initial target: at least 1000 generated candidate states across tier profiles, cell positions, mid-move and queued states. Validate accepted witness paths by replay through the actual collision/simulation rules. Track rejection/fallback rates and runtime. Include explicit adversarial fixtures rather than relying only on random coverage.

Browser integration: Play/tutorial/skip/retry, pause/resume, sound and unavailable haptics, persistence failure, reduced motion, focus and orientation, narrow/short portrait layouts, mouse/keyboard, production offline reload. Use Playwright Chromium/Firefox/WebKit where runnable, report missing engines honestly. Keep a deterministic development capture mode out of normal UI.

Capture portrait idle/warning/compound/death, narrow/short portrait, desktop and pause/settings screenshots. Inspect them, do not merely save unseen screenshots. Perform an actual local browser play session if tooling allows; still do not claim a physical-phone user test.

Final acceptance report separates:
1. Automated rules/build checks, with commands/results and paths.
2. Browser runtime checks, engine and viewport.
3. Visual inspection, screenshots and remaining art limitations.
4. Human/device pending checks: real swipe feel, real hardware haptics, fresh iPhone/Android install/offline behavior, perceived fairness and replay motivation.

Completion categories: IMPLEMENTED and VERIFIED are separate; full v1 candidate can be implemented while human acceptance is PENDING. No test, art file, browser session, imagegen access, deployment or completion claim may be fabricated.

