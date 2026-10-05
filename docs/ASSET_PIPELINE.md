# Asset pipeline

## Active v1.7 presentation

Display current-stage, live cumulative and best five-stage survival time to tenths of a second. Multi-location lightning points each receive a local cue; overlapping relay cues follow individual announced starts. Repeated flame geometry must not masquerade as a restarted burn. Mixed-stage capture must show simultaneous family effects at phone size. See `REVISION_V1_7.md`.

## Active v1.6 presentation

Warnings, active effects and cleanup continue to read one frozen event timeline. Faster late warnings and shorter visible active phases must match damage exactly. Inspect varied row/column strikes, full-lane five-line flame warnings, multi-path floor ignition and actually played mixed lightning at phone size. See `REVISION_V1_6.md`.

## Historical v1.5 presentation

Every exterior arrow marker belongs to one projectile event; reused sources show separate nonoverlapping warning cycles. Both lightning variants remain downward bolts for the full damage interval, followed by neutral non-damaging residue. No charged floor-field graphics are playable. Ground-fire batch warnings remain local and simultaneous within islands/fragments; chained and progressive paths have individually timed local warnings. Inspect current timed phone frames in `PROGRESS.md`.

## Active v1.4 presentation

Beast-head warnings originate outside the arena and align with full six-cell rows or columns. Active flame artwork reaches the entire lane. The central-pocket pattern has visibly clear exterior regions and a clear pocket between intersecting full lanes; an asymmetric variant is shown as an open channel. Instant lightning uses a brief downward bolt, while sustained lightning keeps a cyan charged tile field visible through its complete damaging interval. Neutral residue is visually distinct. Inspect current timed phone frames in `PROGRESS.md`.

## Active v1.3 asset direction

The current artwork covers exterior crossbow markers with readable slow/medium/fast charge details, local lightning charge and downward strike, beast-head lane flames, upward floor fire on contiguous patches, and distinct non-gory death sequences. Inspect timed phone frames listed in `PROGRESS.md`. Historical spike/boulder instructions below do not apply to the playable v1.3 build. Lightning and ground-fire cleanup use neutral ash/scorch distinct from damaging effects.

## B. Asset pipeline and visual quality gate

### B1. Art bible

Warm sandstone platform, faded bronze machinery, restrained plants and carved ruins; inviting daylight and mystery. Adventurer silhouette uses a deep blue-green short cape, leather and a small pack. Warm stone and amber/white telegraphs remain separate in shape and value. No neon, horror, office jokes, emoji, font-icon stand-ins, oversized cute heads or cloned IP.

Produce reference-size screenshots of: idle arena, one warning, two overlapping warnings, active arrow/flame, boulder impact, death/result. Inspect at actual phone display size as well as enlarged. The terrain must read as one physical platform with 36 natural stone slabs, not a checkerboard of CSS cards.

### B2. Asset inventory

- Platform, outer ruin silhouettes, restrained vegetation, broken walls, carvings, machinery mounts and matching lighting/shadows.
- Adventurer four-direction idle and walk poses. Initial budget: 4 idle and 6 walk frames per direction, or equivalently expressive authored layered animation; feet, body, cape and bag must move coherently.
- Family-specific death presentation: arrow carry, spike knock-up/fall, fire silhouette/smoke, boulder dust. Shared rigs/poses are permitted, but each must remain readable.
- Four family sets: idle, activation/charge, fire/impact, reset; arrow projectile, spike sprites, flame shapes, boulder and impact shadow.
- Separate ground warnings, path marks, particles, dust/smoke/sparks and non-damaging aftermath.
- Original pause, sound on/off, haptics on/off/unavailable and retry icons; PWA app icon using original game art, not text emoji.
- Local movement, warning, launch, impact, clear, death sounds and one restrained music loop.

### B3. Production and reproducibility

Use available authorized image-generation capabilities for original art if present. Otherwise create polished original layered SVG/vector artwork and rasterize into runtime textures as appropriate; this is acceptable stylized 2D if it reaches the quality bar. Do not substitute primitive circles and rectangles for the final character and machinery, and do not falsely label temporary art as final.

Vector art is not a license to leave a flat engineering prototype. Hand-author outlines, irregular stone silhouettes, material shading, cape/body poses, machinery motion and controlled texture. Use coherent assets with consistent pivots and world scale. Art sources and regeneration scripts should be checked in along with ready-to-run outputs. If automated art cannot meet the bar, finish the functional game and report an ART QUALITY blocker with concrete missing assets and screenshots, not a fake v1 acceptance.

Maintain assets-manifest.json with asset ID, path, source/author, original/license status, size/frame layout, pivot, world scale, and intended use. No unlicensed copied sprites or remote hotlinks. SVGs must not depend on external fonts/resources for icons. Use a consistent atlas or structured texture list; verify transparency, trim and frame alignment. Keep particles pooled and deterministic enough for review screenshots.

If audio tools or licensed libraries are absent, original Web Audio synthesis and rendered local WAV/OGG assets are acceptable, provided they sound intentionally designed and the music is not an unmusical placeholder beep loop. Balance loudness and avoid startling volume jumps. Core warnings remain visually complete.

