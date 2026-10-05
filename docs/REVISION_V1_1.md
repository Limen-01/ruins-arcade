# Approved Five-Stage Gameplay Revision

Status: Approved for local implementation. This document supersedes conflicting gameplay, scoring, warning, progression, and fairness rules in the historical v1.0 product specification and handoff. All unrelated v1.0 features remain required. The title remains provisional.

## Run and scoring

A run has exactly five stages, in this order: Crossbow, Spikes, Flame, Boulder, Mixed machinery. The first four stages use only their named family. The fifth may use all four and must visibly combine families. A stage ends only on death. Survival time and score never auto-complete it.

An attack group is a coordinated schedule of one or more damaging events and has a unique group ID. Fully surviving all events in a group awards exactly one point when its final damaging interval ends. Groups may overlap and score independently. Death at the same logical instant takes precedence; incomplete groups award nothing. Stage score drives difficulty. The current run total is the sum of the five earned stage scores.

After death in stages 1-4, show stage score, cumulative score, and a Next Stage button. One tap starts the next stage with fresh player position, attacks, input queue, gestures, visual effects, timers and stage difficulty; prior stage scores remain. After stage 5 death, show all five stage scores, total, best total and Retry Run. Retry clears current-run scores and starts stage 1. Persist best five-stage total under a new versioned key, separately from the historical endless record. Preserve sound, haptic, reduced-motion and tutorial settings. Use Traditional Chinese player-facing text.

## Warning language

For full-row and full-column attacks, show an original flashing red directional arrow in the exterior gutter at that attack's source edge, aligned to the affected row or column and pointing inward. It must never occupy an outer playable cell or be clipped/obscured. Each source has its own marker. Retain machinery charge motion. Do not draw a full-lane ground path, highlight or equivalent area overlay. Shape, pulse and cadence must communicate direction and timing beyond color alone.

For tile attacks, flash only targeted tiles with local family-specific cracks or impact shadows. Keep multiple targets individually legible. Never mark safe answers. Freeze every target, direction and timing before its warning appears.

## Catalog and difficulty

Simple single-lane/single-tile attacks remain possible at every tier. Their weight falls as moderate and advanced spatial-temporal arrangements become more common. Do not impose a rising minimum count of targeted lanes or tiles. A rapid sequence of individually single-lane or single-tile events can be advanced. The catalog includes isolated simple attacks, simultaneous double lanes/tiles, parallel and crossing directions, staggered clusters, rapid appended single-event sequences, interleaved overlapping groups, and stage-5 mixed-family arrangements.

Difficulty increases every five points within the current stage and resets at the next stage. Starting category weights (simple/moderate/advanced percent) by tier 0-7 are 70/25/5, 60/30/10, 45/35/20, 30/40/30, 20/40/40, 15/38/47, 12/36/52, and 10/35/55. These are tuning defaults, not human-validated balance. All tiers retain nonzero simple weight. Family-specific catalog contents are defined in architecture/configuration.

| Stage score | Speed multiplier | New-group interval multiplier |
| --- | ---: | ---: |
| 0-4 | 1.00 | 1.00 |
| 5-9 | 1.20 | 0.85 |
| 10-14 | 1.45 | 0.70 |
| 15-19 | 1.70 | 0.58 |
| 20-24 | 2.00 | 0.48 |
| 25-29 | 2.20 | 0.42 |
| 30-34 | 2.40 | 0.38 |
| 35+ | 2.50 | 0.35 |

Increase baseline pace from v1.0. Accelerate crossbow traversal, spike deployment, flame onset and boulder descent as appropriate. Keep warning lengths and persistent damaging durations independently configurable; do not divide all timings by speed. Preserve fixed player step duration, one released swipe per tile, one buffered command and no move immunity.

## Staggering, overlap and fairness

Within a group, later warning starts may occur at 0.2 and 0.4 seconds after the first warning while earlier warnings still charge. Each event retains its own activation and duration. The 200 ms interval is between warning starts, not the entire reaction window. Provide deterministic examples for both lane and tile families. A new group may start warning before another group's pending or active attack completes. Do not hold scheduling for prior group clearance.

Before announcing a group, validate all existing active hazards, already announced future events, and every candidate event together against current continuous movement, the committed buffered command, at least 250 ms initial reaction allowance, 160 ms decision cadence and conservative timing margin. Use actual continuous/swept collision rules and replay accepted witnesses through the simulation. Existence of a final safe tile or isolated group escape is insufficient. Preserve already announced geometry/timings when rejecting candidates. Bound search and generation, use only validated fallbacks, and never remove existing hazards or award points due to generation failure. Retry a failed group soon and record diagnostics; tune unannounced arrangements rather than weaken fairness.

## Preserved scope and acceptance

Retain original ruins artwork, authored animation and non-gory deaths, sound/music, independent sound and vibration buttons, reduced motion, pause/resume, keyboard input, local settings, responsive layout and offline PWA. Keep HUD compact with stage, stage score, cumulative score and appropriate best total. Teach the exterior source marker in the tutorial; tutorial points do not affect records.

Verification must cover exact stage/family order, death-only progression and fresh transitions, separated record keys, tier boundaries, group overlap and one-time score, 200 ms staggered lane/tile warning starts, combined-schedule impossibility, movement/buffer and swept collision at high speed, immutable announcements, bounded fallback, pause and offline reload. Run seeded scenarios across stages/tiers and replay accepted paths. Capture and inspect phone screenshots of exterior markers without lane overlay, tile warnings, staggered pending warnings, active hazards with later warnings, Next Stage, final totals and mixed stage. Report actual timings, weights, overlap limits, rejection/fallback rates and observed cadence. Physical-device feel and human enjoyment remain pending until tested.
