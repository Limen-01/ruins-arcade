# Architecture

## Active v1.7 architecture

`Run.stageTime` is the simulation-authoritative current-stage survival clock; completed stage times are stored separately and summed without rounding. `Wave.scored` remains a completion/scheduling flag and never increments player score. Collision resolves the earliest lethal time within a simulation step. The pattern builder snapshots attack timing and speed, checks flame target geometry, and composes mixed motifs with intentional temporal overlap. The validator still checks the complete schedule and disclosure, then replays a witness. See `REVISION_V1_7.md`.

## Active v1.6 architecture

Pattern generators apply bounded random spatial transforms before fairness validation; selection evidence distinguishes raw candidates from accepted and played schedules. The builder snapshots family warning and active duration independently, with explicit dense-flame lead extension. A bounded mixed-stage family-diversity hint alters only unannounced candidate selection. Full-wave swept collision, disclosure validation and simulation witness replay remain mandatory. See `REVISION_V1_6.md`.

## Historical v1.5 architecture

The wave validator first finds and replays a complete swept-collision escape witness. `validateDisclosure` also builds the prefix visible before the first post-reaction warning, tests each initially viable direction, and requires a complete escape when correction input is withheld until that warning plus the declared reaction allowance. This bounded check rejects hidden early-commitment traps; it does not prove every possible human decision fair. Catalog entries own pattern-specific warning intervals. Ordinary arrow waves snapshot one speed, all lightning in a wave snapshots one visible strike duration, and progressive ground-fire batches record a shared cycle so later groups warn only after the previous cycle's final ignition. Rendering consumes the unchanged event timeline.

## Active v1.4 architecture

Every beast-head flame attack is a complete six-cell row or column. `Simulation.addWave` rejects incomplete lanes and source mismatches. Collision and rendering use the same full-lane cells. Lightning events snapshot `instant` or `field`; both use the existing continuous tile collision, while the renderer distinguishes brief impact from a persistent charged region. Balance functions receive stage identity so the longer stage-3 opening and elevated stage-5 profile do not leak into other stages. Whole-wave fairness and witness replay remain authoritative.

## Historical v1.3 architecture

`scheduleWave` snapshots pressure, sequence spacing, warning leads, speed class and occupancy on creation. Its builder emits ordered batches and events. `Simulation.addWave` checks ownership, unique event IDs, warning alignment and uniform arrow speed per batch, then freezes announcements. The stage-five composer chooses a compatible family pair, uses the first motif as the lead, appends a finite supporting motif and validates the whole composition. `nextWave` searches at most 20 candidates plus three validated delayed simple fallbacks; failure retains state and retries after 0.12 seconds. `validateWave` searches continuous movements including the input buffer with a 0.25-second reaction allowance, 0.16-second swipe cadence and 0.08-second hazard margin. Every accepted path is replayed with `Simulation` before announcement.

Keep the deterministic `Simulation` and authoritative `Attack` timeline. Audit all four damage intervals before pattern tuning. A catalog entry is now an authored finite sequence of batches with a stable pattern ID, spatial transforms, timing, speed/occupancy rules and bounded cycle count. Each `Attack` records its batch ID. The wave scheduler announces one complete candidate after previous damage and recovery. Fairness searches every batch and replays the witness with actual swept collision. Stage time pressure uses a faster smooth curve after a preserved 0–5 second opening. `REVISION_V1_3.md` contains the approved structures; older sections are historical.

## Historical v1.2 architecture

`Run` owns one current `Wave` at a time. Each wave owns finite immutable `Attack` events and scores once after its final damage interval. `Simulation` advances effective `stageTime` only during real, unpaused gameplay. `Arena` starts the next wave only after the prior wave's final damage and a recovery beat. Pressure is sampled before building a wave; event warnings, projectile speeds, targets and occupancy do not change after announcement. The validator searches the complete wave against current motion and queued input, then replays every accepted witness through `Simulation`. Art and audio read the same event schedule. `REVISION_V1_3.md` is the active product source; sections below describe historical implementations.

## Historical v1.1 design

The approved revision in `REVISION_V1_1.md` supersedes the historical wave/endless design below. `Simulation` owns one five-stage run, a list of independently scored attack groups, and the current stage score. Groups contain immutable attack events with individual `warn`, `active`, `end` and `cleanup` times. The renderer and audio consume that same schedule. `Simulation.nextStage()` is legal only after death in stages 1-4; `retryRun()` clears all five scores after stage 5 death.

`Arena` schedules new group announcements on simulation time from the previous group start, regardless of previous group clearance. It passes all existing groups plus the candidate to the fairness validator. Search uses the current continuous step and queued direction, a reaction delay, action cadence and inflated timing, then replays the witness through `Simulation`. Only an accepted candidate is appended. Failed generation retries soon without touching existing groups or scores. Search, candidate count, pending group count and pending event count are finite. The catalog weights simple, moderate and advanced patterns per five-point stage tier; it does not impose a minimum number of lanes or tiles.

For row/column events, the source origin is in an exterior gutter. During warning, `Arena` draws only an authored directional marker and animated source machinery outside the grid. Tile events draw only local targeted cues. Active hazard geometry and artwork continue to follow the shared event schedule. The historical architecture/tuning below is retained for provenance where it does not conflict.

## A. Architecture decision

### A1. Stack

Use Phaser 3, TypeScript in strict mode, and Vite. Use the latest compatible stable patch within Phaser 3, verify supported Node/tool versions in the actual environment, and pin dependencies with a committed lockfile. Do not depend on floating CDN scripts. No React, backend, database, general ECS framework, multiplayer stack, or runtime AI calls are needed.

Phaser is chosen for scenes, rendering, animation, audio, particles, and scaling. Canvas-only would require recreating these systems; a full native-engine export introduces unnecessary delivery complexity for this small browser game. Use lightweight HTML/CSS controls over the canvas for accessible score, buttons, pause, tutorial and results; author SVG icons rather than Unicode pictograms.

Use Vitest for pure game rules and Playwright for browser integration and screenshots where available. Prefer a small custom service worker and manifest for this finite asset set; if the repository already has an appropriate PWA setup, reuse it. Document HTTPS/localhost requirements and installation differences.

Primary references, accessed during planning on 2026-10-04:
- https://phaser.io/news/2024/01/phaser-vite-typescript-template
- https://docs.phaser.io/phaser/getting-started/installation
- https://docs.phaser.io/phaser/getting-started/project-templates
- https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API

Check current primary documentation when an API detail is uncertain. Do not invent vibration availability or treat an API return value as proof of physical vibration.

### A2. Modules and ownership

Suggested structure, adapt if an existing repository requires it:

```text
src/core/        pure simulation, movement, collisions, waves, scoring
src/patterns/    catalog, difficulty profiles, generator, fairness validator
src/input/       swipe and keyboard adapters
src/scenes/      loading, arena rendering, animation and effects
src/platform/    persistence, sound, haptics, lifecycle
src/ui/          HTML controls and overlays
src/config/      tunable, versioned balance parameters
public/assets/   checked-in runtime art and audio
scripts/assets/  reproducible asset build tools if used
tests/          rule and browser tests
docs/           product, architecture, milestones, asset guide, acceptance
```

Core rules must be testable without Phaser or a browser. Renderer consumes simulation state and events, never decides damage or score. One attack timeline supplies telegraphs, collision geometry, animations and sound scheduling; do not separately hardcode redrawn warnings and damage masks.

Attack data includes family, pattern ID, origin, direction, targeted tiles/path, telegraph start, activation, active duration/travel curve, cleanup time and explicit damage geometry. Freeze targets before publishing the telegraph. Seeded RNG provides reproduction, not cryptographic security. Logs record seed, balance version, wave ID, starting state and chosen attack schedule.

### A3. Time, movement and collision

Use a fixed simulation step of 1/120 second; keep rendering decoupled. Movement is continuous interpolation between cell centers over initially 120 ms, with a small circular body collider. Use analytic segment/swept collision for fast arrows and player movement; end-point-only checks can tunnel and are unacceptable.

Arrow collision follows the moving projectile; spikes and flames occupy explicit space-time intervals; a boulder is a timed impact event. Split steps at activation boundaries or use time-aware swept checks so a warning does not cause damage early. Decorations and aftermath particles never supply implicit damage.

On document hidden, blur, mobile landscape, or an excessive foreground frame gap (initial threshold 250 ms), pause before advancing further danger. Do not catch up seconds of attacks. Normal shorter frame gaps process fixed steps safely. Reset accumulator, input gesture and queued commands on pause; Resume starts a simulation-frozen countdown. Rendering may interpolate, but collision must remain consistent with the displayed body position.

At a wave boundary finish previous active hazards before awarding exactly one point. Death takes precedence if the player is hit at the same logical instant as clearance. Retry creates a fresh run state and removes old timers, effects and gestures. Use simulation time for gameplay, not untracked browser timeouts.

### A4. Input specifics — adjustable implementation defaults

- Pointer Events; one active pointer; pointer cancellation emits no command.
- Emit at most one command on pointer release. UI pointers never enter the movement adapter.
- Start threshold: max(14 CSS px, 0.20 of the rendered tile width), clamped to 24 CSS px. Dominant axis must be at least 1.25 times the other axis; otherwise reject as ambiguous.
- Apply touch-action only to the play surface; avoid scrolling the arena while preserving control accessibility.
- Keyboard ignores repeat, accepts arrow keys/WASD, and does not capture input in editable elements.
- Validate a queued direction against the committed destination of the current step; out-of-bounds commands do not occupy the queue. Full queue ignores later inputs.
- Spawn initially row 2, column 2 in zero-based indexing, one of the four central cells.
- Initial collider radius: 0.16 tile. Visually ground the body so its collision center is understandable; exact body/art fit is a tuning task.

### A5. Fairness validator

Generate a candidate schedule before displaying it. Search a time-expanded movement graph with WAIT and four legal single-step actions. Include current continuous movement and any already committed queued action. Existing motion may continue during the initial reaction window, but no new voluntary command is assumed during that window.

Initial reaction allowance: 250 ms, with an additional 80 ms safety margin around threatening timing. Reserve initially at least 160 ms between NEW swipe decisions in the witness path, even though a movement lasts 120 ms. These are conservative starting assumptions for human input, not universal human-performance guarantees.

Check every complete transition against continuous/swept damage geometry and validate the surviving witness through the end of ALL wave hazards. A tile-only BFS to a final safe tile is insufficient. Conservatively inflate hazards/time windows where search discretizes; do not accept false-safe paths by only sampling endpoints. Store a witness path and validator diagnostics in development evidence; never show the answer during normal play.

For dense combinations, use a stricter additional constraint that at least two distinct grid centers are simultaneously free during each active phase, while still checking reachability. This is a conservative v1 limit, not a replacement for time-path validation.

Bound generation to initially 24 candidates, then extend the candidate's unshown warning time or select a simple known pattern and VALIDATE it against the current state. Never silently use an unvalidated fallback or retarget an already shown warning. If no valid candidate can be constructed, remain hazard-free and record diagnostics rather than forcing damage.

The validator only establishes an executable escape path under declared assumptions, not survival after arbitrary player mistakes. Repeated seeded tests support confidence but are not a mathematical proof for every possible state.

### A6. Pattern catalog and initial tuning

All numbers below are tuning defaults, not new immutable product decisions.

| Family | Initial warning | Initial active behavior |
| --- | --- | --- |
| Arrow | 1400 ms early; 1000 ms ordinary | projectile traverses six cells in about 550 ms; narrow body, about 0.28 tile lane width |
| Spikes | 1400 ms early; 1000 ms ordinary | active 300 ms; centered footprint about 0.72 tile square |
| Flame | 1500 ms early; 1100 ms ordinary | active 450 ms; centered lane about 0.62 tile wide |
| Boulder | 1500 ms early; 1100 ms ordinary | collision at impact; about 0.76 tile diameter; decorative dust after impact |

Warnings must cover actual inflated danger including the player's body radius where relevant. A visually safe tile center must not be hazardous because of undisclosed art/collider overhang. Boulder cleanup does not keep its tile dangerous after impact unless explicitly specified by a future product change.

Catalog: arrow/flame single line, parallel lines and crossing lines; spike/boulder scattered or compact clusters; up to three clearly previewed batches for sequential patterns; mixed arrow+spike, arrow+boulder, flame+spike, flame+boulder. Crosses can be two events. Do not enable arbitrary combinations without checking readability and fairness.

Start with maximum two simultaneously active damaging events at score 16–30; allow three from score 31 with validators and clear telegraphs. A batch may target several tiles and still be one event. Do not interpret event count as allowed full-board coverage. Chain offsets initially 300–500 ms. Inter-wave gap initially 250 ms. Complex waves may extend warning to 1800–2200 ms rather than demand impossible travel.

Use the score tiers in the product specification. Hard ceiling: no basic warning below 800 ms; chains/complex waves must still satisfy their own travel and reaction budgets. Introduce each family alone before mixing it. Insert a simpler recovery wave after approximately four harder waves. Limit immediate pattern repetition and log weights. These are balance starting points; do not claim the curve is validated without playtest data.

### A7. Layout, controls, persistence and PWA

Design against a 390×844 CSS-pixel portrait reference. Size arena from actual available width AND height, with room for outer machinery, safe-area insets and controls. Preserve all 36 cells and machinery cues. Cap render DPR initially at 2; pool effects; avoid expensive full-screen filters.

Use small, real HTML buttons with authored icons, accessible names, aria-pressed for toggles, visible disabled state and practical touch targets around 44 CSS px. Score/Best remain readable. Reduced motion lives in the pause overlay; it is not a fourth permanent HUD icon.

Defaults: sound enabled as a preference but audio starts only after a user gesture; haptics disabled initially to be opt-in; reduced motion honors OS preference until manually overridden. Remember all preferences in versioned local storage with in-memory fallback. Unsupported haptics show disabled/unavailable status. Capability presence does not verify real motor operation; leave physical testing explicitly pending where unavailable.

Resume countdown initially 1 second. Retry result appears initially at 400 ms. These may be tuned. Audio has one master on/off control for music and effects. Never request autoplay workarounds or use remote runtime sound URLs.

Precache the build shell and all required local assets, including fonts/audio. Use versioned caches, same-origin scope and controlled updates at menu/reload, never mid-run. A cold first visit needs network; offline acceptance starts after successful initial cache installation. Offline navigation and full gameplay must work, not only loading an empty shell. Support deployment subpaths.

Target test matrix: mobile Safari on iOS, Chrome on Android, desktop Chromium, Firefox and WebKit where available. Automated WebKit is not a substitute for an iPhone test. Initial engineering budgets: 60 FPS target on a representative midrange phone; no gameplay dependency on hitting 60 FPS; initial compressed shell+required assets target <=10 MB. Report actual measured sizes/device conditions rather than inventing results. HTTPS hosting setup is documented; no publishing in this assignment.

