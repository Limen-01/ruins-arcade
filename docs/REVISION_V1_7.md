# Approved v1.7 survival-time and temporal-overlap revision

This is the active product authority. Preserve the five death-only stages, finite waves, deterministic continuous collision, disclosure-aware complete-wave fairness, player controls, art, accessibility settings and offline PWA. Where this document conflicts with v1.6 or older revisions, this document wins.

## Score and clock

Player score is survival time in seconds, measured by the simulation. Formal gameplay and normal inter-wave recovery count. Tutorial, pause, resume countdown, death presentation, results and menus do not count. Stop the stage clock at the first lethal collision instant. Keep full floating-point precision through the five-stage sum and best-record comparison; display tenths of a second. Stage death stores its final time, next stage begins at zero, and retry clears only the current run. Store best five-stage survival time under a new versioned key, without interpreting old wave-count records as seconds. Wave completion controls scheduling and a clear cue, and awards no points.

## Family changes

- Crossbow: retain the opening. Later pressure adds lanes/projectiles, overlapping batches and sustained finite sequences. Ordinary waves lock one speed across all arrows; later ordinary variants travel faster and warn for less time where fairness permits. The authored slow/fast motif may vary speed between batches, with later slower slow arrows and faster fast arrows, while remaining bounded. One exterior source warning belongs to exactly one projectile.
- Lightning: early point-strike batches should usually cover several distinct scattered cells. The random point relay is a finite sequence of multi-location batches; later warning starts can precede earlier strike endings. Each target gets a visible cue. Early short-line patterns announce and strike their horizontal and vertical segments together. Timing and active duration are uniform within a wave; all damage remains a descending strike, never an electric field.
- Beast-head flame: avoid identical full-lane damaging geometry in consecutive batches or immediately across waves. Compare row/column target sets, independent of pattern names, event IDs and source direction. Keep full six-cell lanes, fair dense warnings and the dedicated relay's 0.5-second warning-start spacing.
- Mixed stage: build coherent finite compositions with a deliberate offset that produces cross-family active/warning and, where feasible, active/active overlap. Measure actual intervals, not just family membership. Keep lightning present at a perceptible accepted frequency. Do not require all four families in every wave.

All generated and fallback waves retain full collision validation, disclosure checks and replayed escape witnesses. Spatial and timing choices freeze before their warnings. Do not weaken hazard lifetimes to force difficulty.

## Evidence

Use a new `docs/evidence/v17/` directory. Record before/after timing and density, point-strike batch sizes, flame geometry repeats, mixed overlap intervals, survival-clock boundaries, candidate rejection/fallback and timing extensions. Run rules/fairness tests, typecheck, production build and available browser/offline checks; inspect phone captures. Automated checks do not prove human fun or real-device feel.
