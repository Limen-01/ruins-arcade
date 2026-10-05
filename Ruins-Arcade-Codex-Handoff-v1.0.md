# Ruins Arcade — Implementation Handoff v1.0

Date: 2026-10-04. Working title only; do not present it as a permanently approved IP name.

## Authority and execution authorization

The PO approved Product Specification v1.0 and then requested a Codex implementation prompt, preferably completing the game in one autonomous run. The embedded specification below is now FROZEN. Earlier language saying to wait for Freeze is historical and is superseded by this authorization.

Product rules remain authoritative. This supplement supplies architecture, implementation defaults, asset workflow, milestones, acceptance evidence, and project instruction content. It does not expand scope. Technical defaults are reversible and may be tuned with documented evidence. A true product conflict must be surfaced, not silently resolved by altering the frozen game.

The previous artwork-sample review becomes an INTERNAL milestone gate for this autonomous run: produce the sample, inspect it, fix issues, then continue without waiting for PO approval. Final aesthetic acceptance, physical-device haptics and human playability remain PO checks. Do not claim they have passed merely because automation passed.

Implement the entire authorized v1.0 locally. Do not stop at a scaffold, two-hazard MVP, or documentation-only delivery. Do not deploy, publish, buy assets, subscribe to services, or access external accounts without separate authorization. Normal dependency installation, local source/art generation, reversible edits, tests, builds, and local preview are authorized. Respect repository and runtime permissions.

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

## E. Project instruction content

Create AGENTS.md at the project root and a project-specific SKILL.md in the repository using the content below (adapt relative paths only). This is repository instruction material, not installation of a personal/global ChatGPT skill. Do not overwrite existing instructions; integrate or reference safely. If the repository is under Git, keep these files with project source and document the change set; do not make destructive resets or publish commits remotely.

### Suggested project SKILL.md content

```markdown
---
name: ruins-arcade-development
description: Implement and maintain the frozen phone-first ruins arcade game, including its deterministic core, authored art, fair attack patterns, PWA delivery and evidence-based acceptance.
---

# Ruins Arcade Project Workflow

Read AGENTS.md, docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/ASSET_PIPELINE.md and docs/MILESTONES.md before editing. Product rules outrank reversible technical defaults. User-approved scope changes must be recorded.

Implement v1 end to end through the ordered milestones. Verify each gate and continue without routine confirmation. Never stop at a prototype and label it final. Maintain docs/PROGRESS.md with exact state and next steps.

Preserve existing user edits, unrelated files and secrets. No destructive resets, paid assets, remote publication or new product systems without authorization. Use the repository's tooling and dependency lockfile.

Keep rule logic deterministic and testable outside rendering. Use a shared attack schedule for damage and visual warnings. One released swipe equals one tile, one buffered command maximum, no repeat or move invulnerability. Score is one point per completed wave. All random waves and fallbacks need time-path validation with declared reaction/movement assumptions.

Deliver four machinery families and the complete pattern catalog. Use original finished art and authored icons, never emoji, Unicode pictograms, copied IP, generic red warning cells or final placeholder primitives. Inspect phone-size screenshots for silhouette, stone-grid clarity, warning timing, simultaneous attacks and death/retry.

Sound and haptics have separate master buttons and persistent preferences. Unsupported vibration is unavailable, not simulated success. Hidden/blur/orientation changes pause; no offscreen catch-up. Test production offline reload after caching.

Run typecheck, meaningful unit/fairness tests, production build and available browser tests. Preserve failing seed fixtures. Do not weaken assertions or invent evidence. Report physical-device and human-aesthetic acceptance separately from automation.

At completion provide run/build commands, file change summary, test evidence, screenshot paths, supported/tested environments, known blockers and pending PO checks. User-facing communication uses Traditional Chinese; code identifiers and implementation documents may use English.
```

## F. Immediate Codex assignment

Read this entire handoff, materialize its frozen product specification and architecture/pipeline/milestone/instruction sections into the repository, and implement M0–M7 in order. The PO has authorized the whole local v1 implementation. Persist progress so sessions can resume; do not require prior chat context. Follow the prompt accompanying this file.

---

# Appendix: Frozen Product Specification

The following is the PO-approved specification, preserved in Traditional Chinese. Planning-era references to future architecture refer to the now-completed supplement above. Where those references imply waiting for review, the execution authorization above applies. Frozen mechanics and scope remain unchanged.

# 奇幻遺跡街機遊戲 — Product Specification v1.0

日期：2026-10-04（Asia/Taipei）  
產品名稱：未定；本文使用描述性專案名稱，不代表最終 IP 名稱。  
狀態：Frozen；PO 於 2026-10-04 確認並授權準備 Codex 完整實作交接。  
角色：PO 決定產品方向與驗收；Tech Lead／Product Designer 維護規格、架構與審查；Coding Agent 於正式交接後實作。

## 1. 文件權限與變更規則

本文件整理已確認的 64 項設計提案，以及新增的聲音／震動按鈕。不授權立即寫遊戲程式。只有 PO 確認本文件 Freeze 後，才進入 Architecture、Implementation Milestones、專案 SKILL.md 與 Coding Agent 交接。

標示「調校起點」的數值可依實測調整，但不得藉調校改變單格滑動、一次命中死亡、無移動無敵、計分單位、首版機關家族或產品範圍。上述規則變更須 PO 確認。技術細節、最終命名、素材尺寸、音量及完整攻擊參數表不在本階段假裝已完成。

## 2. 產品目標

手機優先、直式、單機的 Web／PWA 2D Arcade Game。靈感來自 Mr.Oops!! 的快速判讀與躲避循環，但使用自己的角色、美術、名稱、世界觀與玩法細節。

核心樂趣：閱讀機關、辨識危險與可達安全位置，在攻擊交錯時完成精準移動。死亡原因應可理解，重開成本低。

核心循環：觀察預警 → 判斷模式 → 找出可達安全格與路徑 → 移動 → 攻擊發生 → 完整躲過一波 → 加分 → 下一波。

體驗目標：新玩家約 20–60 秒一局；熟練玩家約 1–3 分鐘。不是強制結束時間，實際分布待測試。

優先順序：移動手感、預警公平、快速讀圖、模式趣味、難度挑戰、重玩意願、完成品美術。功能數量不作為成功指標。

## 3. v1.0 Scope

包含：一個無盡生存模式、一名冒險者、一座 6×6 遺跡競技場、四種機關家族、受限制的隨機攻擊組合、漸進難度、一次命中死亡、快速重開、首次短教學、分數／本機最高分、暫停、聲音與震動開關、降低動態效果選項、首次完整載入後離線遊玩與加入主畫面。

不包含：帳號、後端、雲端同步、線上排行榜、商城、課金、貨幣、任務、Battle Pass、多人、劇情流程、Boss、每日挑戰、關卡選單、多角色、角色技能、血量、護盾、局內復活、永久障礙、地形變化。巨大石輪與能量雕像保留至後續版本。

## 4. 場地

- 6×6 共 36 個可移動位置，四方向相鄰連通，所有格可走。
- 格子由古老石製平台上的主要石板及接縫自然構成，不是 36 個 UI 按鈕。
- 每格的主要邊界需清楚，雕刻、磨損及裝飾裂紋不得形成誤導格線。
- 角色出生於中央四格中的固定一格；確切座標於後續規格細化指定，跨局一致。
- 機關、牆體、植物、建築與浮雕位於場外；不能遮住有效場地、角色或預警。
- 玩家越界輸入不移動，不自行掉出平台；死亡演出可以擊飛出場。
- 手機完整顯示正方形場地，不裁切、不拉伸；上下空間承載機關與 UI。
- 桌面保留直式構圖並置中；左右留白或延伸背景。

## 5. Movement Rules

### 5.1 手機

每次獨立手勢「按下 → 滑動 → 放開」產生最多一格指令。持續按住不連走。可在主要遊戲區域起滑，不必從角色起滑；控制按鈕區不產生移動。

只接受上下左右，斜向滑動按主方向判定；短距離或方向過於模糊不執行。手勢門檻、方向判定容差與觸控取消處理在後續操作參數中明確定義並實測，不在此擅自固定。

### 5.2 緩衝與移動

- 一步開始後完成至目的格，途中不取消、不轉彎。
- 移動途中可保留一個下一步指令，到格後立即執行。
- 緩衝已滿時額外輸入忽略，不覆蓋、不累積。
- 越界指令不占緩衝，提供輕微碰壁回饋。
- 每格約 120 ms 為調校起點；速度整局一致，不隨難度變化。
- 角色到達邏輯格中心；畫面動畫需跟隨實際位置，不能讓碰撞位置與外觀脫節。
- 暫停、死亡或重開不得把舊手勢或待執行指令帶入新操作階段。

### 5.3 桌面

方向鍵／WASD 每次按下移動一格；按住不連走，忽略作業系統鍵盤自動重複。採同一個單步緩衝規則。

## 6. 命中與死亡

- 依角色實際位置與較小的碰撞範圍判定；披風、背包等裝飾不算受擊區。
- 移動途中可命中，沒有移動無敵時間。
- 一次命中即死亡；只結算一次，不重複計分或觸發多次死亡。
- 預警區可以通過；攻擊生效的碰撞範圍不可接觸。
- 危險判定須與可見攻擊一致；粒子與殘留裝飾不自動造成傷害。
- 不做血腥 Gore。
- 箭矢：帶飛；尖刺：短促彈起／倒下，無血腥穿刺；火焰：短暫剪影與煙塵；巨石：塵霧吞沒。
- 命中後約 0.3–0.5 秒顯示結果與 Retry，為調校起點。剩餘演出不能阻止重開。

## 7. Attack Pattern System

### 7.1 機關家族與模式分離

機關決定世界表現、預警及命中行為；Pattern 決定空間與時間排列。禁止為增加模式數量而要求每個排列都新增素材家族。

| 家族 | 預警 | 攻擊及有效危險 |
| --- | --- | --- |
| 古代弩機 | 機構展開、拉弦、可辨識射擊路徑 | 箭矢實際沿行／列飛過，碰撞跟隨物件；已飛過區域可再進入 |
| 地板尖刺 | 石板震動、縫隙亮起、碎屑 | 指定格或格群啟動，維持短暫危險後收回 |
| 獸首火焰 | 獸首啟動、煙霧、熱氣、路徑刻紋 | 沿行／列噴射，持續封鎖路徑，結束後解除危險 |
| 墜落巨石 | 落點陰影、塵粒、陰影收束 | 落地瞬間命中，短暫停留並快速清除；不形成永久障礙 |

巨石陰影及預警需完整表達受擊範圍；陰影方向符合場景光源，但不能為物理真實而誤導落點。各攻擊寬度、速度、持續時間與清除時間待後續參數表及實測確定。

### 7.2 模式目錄

| 模式 | 行為 | 適用與約束 |
| --- | --- | --- |
| 單線 | 一行或一列 | 弩機／火焰；箭矢移動與火焰持續封路不可混為同一種碰撞 |
| 平行雙線 | 兩條平行路徑 | 弩機／火焰；檢查逃生距離與中間通道 |
| 十字交叉 | 一行與一列 | 弩機／火焰組合；交點與時間差須可辨識 |
| 分散落點 | 少量指定格 | 巨石／尖刺；不得只保證有安全格而忽略可達性 |
| 集中格群 | 相鄰格形成局部危險 | 尖刺或適合的落石排列；覆蓋範圍需清楚 |
| 分批連鎖 | 已預告的批次按順序發生 | 每批有獨立蓄勢進度，禁止無提示的長序列記憶題 |
| 異種疊加 | 不同家族同波組合 | 例如箭矢加落石；控制視覺負荷並驗證完整時間路徑 |

支援旋轉、鏡像、換位置等變體，但不任意把所有模式套用每種機關。實際模式參數與允許組合清單在架構／細化設計階段完成。

### 7.3 波與選取目標

一波是完整攻擊組合，可包含多項攻擊與不同發動時刻。最後一個有效危險消失且玩家存活，才完成該波並加分。波內事件不另計分。下一波在本波結束後開始；第一版不做不同波之間的危險交疊。

可以於預警開始時根據玩家位置選取目標；開始後固定受擊範圍、落點、方向與順序，不追蹤、不突改。模式抽選採有限制的隨機，避免同類連續重複。

## 8. Telegraph Rules 與公平性

每項攻擊同時提供場外／環境機關啟動提示，以及場內危險範圍提示。玩家不必一直轉移注意力到邊框才能知道危險位置。

統一節奏：啟動 → 蓄勢增強 → 發動。機關動作、亮度、脈動與音效表達進度。場內採刻紋、細窄路徑光、陰影或裂縫等世界內提示，禁止廉價整格紅色覆蓋。Readability 優先；不能只靠顏色或聲音。

初期簡單攻擊預警約 1.2–1.5 秒，熟悉後基本攻擊約 0.8–1.1 秒，均為調校起點。複雜模式依移動距離與辨識負擔延長，不採後期所有攻擊一律極短預警。

連鎖批次有持續可見的蓄勢與先後資訊。正常遊玩不直接亮出安全格答案；教學可以示範一次。

### 8.1 可躲避條件

每波依玩家實際位置、進行中的步伐、已有緩衝、各危險時間與範圍，檢查完整的可行逃生路徑。安全終點存在只是必要條件；沿途穿過持續火焰或趕不上落石不算可行。

必須給人類辨識與反應餘裕，不能接受只靠零延遲／零誤差的理論解。第一版避免全場瞬間只剩一個安全格。公平性參數、檢查方法及失敗時的候選淘汰／替代機制由後續架構定義，實作須有可重現的測試證據。

## 9. Difficulty Curve

移動速度不變。難度依覆蓋範圍、同波攻擊數、逃生距離、持續封路、時間差與不同家族組合增加；縮短預警只占部分。

| 分數／已完成波數 | 調校草案 |
| --- | --- |
| 0–5 | 單機關、易讀、短距離逃生 |
| 6–15 | 格群與雙線，逐步介紹四家族 |
| 16–30 | 同波兩項攻擊，開始要求選路 |
| 31–50 | 時間差、持續封路與異種組合 |
| 51+ | 更豐富模式與緊湊節奏，維持公平下限 |

以上門檻為起點，不代表已驗證的平衡。高壓波間穿插較簡單波，新機關第一次出現時單獨展示。有難度上限，分數無上限；達上限後靠模式變化維持挑戰，不縮至人類無法反應。最高並發數、恢復節奏及各階段權重待實測。

## 10. Scoring 與資料

完整躲過一波 +1 分。沒有擦彈、連擊、快速移動、時間或機關數量加分。最高分保存於當前裝置／瀏覽器，不跨裝置同步，不作防作弊競賽紀錄。

必要本機資料：Best Score、聲音開關、震動偏好、降低動態效果偏好、首次教學完成狀態。即使本機儲存不可用也不能阻止正常遊玩；最高分與設定保存能力依瀏覽器實際條件處理。無個人資料收集或帳號資料模型需求。

## 11. Art Direction

乾淨 2D × 精緻手繪／Stylized Flat 2D × 奇幻遺跡競技場。明亮、有冒險與神秘感，不做陰暗恐怖地下城、霓虹科技、Cyberpunk、辦公室或 AI／Excel／Quota 搞笑題材。

場地近正俯視；角色與場外雕像可有少量側面，保留披風、獸首、機構辨識。暖灰、砂岩米色、褪色青銅、低飽和植物綠為基底；少量高辨識度火焰／能量色。危險共同啟動語言採琥珀與暖白，並搭配形狀及動作。

無名冒險者：小比例，深藍綠短披風、棕色皮革、小背包，剪影與明度差優先；適度可讀性誇張但不過度 Q 版。世界觀是仍運作的古代試煉遺跡，以畫面呈現，不加長篇敘事。

禁止 Emoji 或 Unicode 符號代替角色、機關、素材、UI 圖示；文字本身可正常使用字型。禁止直接複製靈感作品的角色、美術、名稱、素材或世界觀。

## 12. Animation／VFX／SFX

角色需四方向待機與移動；起步、落腳與披風跟隨完整，不能僅平移圖片。受擊為死亡動畫起始，不另做受傷後恢復。依四家族有不同死亡表現，可共享部分動畫與粒子。

各機關需待機、預警／蓄勢、攻擊、恢復表現。塵土、火焰、碎屑等不得遮蔽有效預警；短暫殘留粒子與危險結束需可區分。

短促畫面震動用於命中與重型機關，不改變格子判讀；減少全畫面閃白。觸覺震動用於命中與重型機關，普通移動不震動。降低動態效果選項需降低強烈晃動與閃爍，但保留危險時序與範圍資訊。

音效包含移動、機關啟動、發動、過波、死亡；一首低干擾冒險感循環音樂。完全靜音仍可判讀與遊玩。

## 13. UI Flow

流程：載入 → 首頁（名稱、Best、Play、完成的競技場背景）→ 首次可略過教學／正式遊玩 → 死亡結果 → Retry → 新局。

首次短教學包含滑動一步、辨識一次預警、躲過一次攻擊；不計最高分，重開不重播。

遊玩上方：Score、較小 Best、Pause、聲音按鈕、震動按鈕。場地保持視覺中心。死亡顯示本局分數、最高分與大面積 Retry，一次點擊立即開始新局。

### 13.1 聲音與震動新增規則

- 上方 Pause 旁有兩個獨立小巧按鈕，使用自製圖示及明確啟閉狀態。
- 聲音一鍵控制全部音樂與音效；此最終一鍵方案取代先前音樂／音效分別開關的提案，不增加額外混音選單。
- 震動一鍵控制所有觸覺回饋。裝置／瀏覽器不支援時顯示不可用，不能假裝啟用成功。
- 兩者偏好跨局、跨重新開啟保留。實際聲音啟動仍遵守瀏覽器互動限制。
- 不支援震動不能阻擋遊戲；震動不是預警的唯一管道。
- 初始預設、確切圖示與排列在介面細化時決定，不在本文件宣稱已確認。

### 13.2 暫停與恢復

Pause、切換頁面／App、失去焦點或鎖屏時暫停，不扣分、不推進危險。回來需 Resume 並給短倒數，不直接恢復到瞬間命中。手機轉橫向時提示轉回直式並暫停。處理過程不累積輸入或在恢復時補跑離開期間的攻擊。

## 14. 平台與非功能需求

手機優先，桌面瀏覽器可玩；Web 無需安裝，PWA 可加入主畫面。首次完整載入後可離線遊玩。具體支援裝置／瀏覽器版本、效能與資源預算需於架構階段提出，不預先承諾所有環境。

低幀率不能造成穿透、漏判、預警縮水或一次輸入多步。嚴重延遲情況的保護策略在架構中定義。音效、震動、本機儲存與安裝支援有差異時正常降級；所有核心玩法不能依賴上述可選能力。

## 15. Asset Pipeline 產品要求

先產出代表最終品質的靜態遊戲畫面，由 PO 檢查角色尺寸、石板邊界、機關位置、預警與整體風格，再擴展整套素材。

背景、角色、機關、預警、攻擊 VFX、UI 分層。概念圖不能直接替代全部可玩素材。可用 AI 輔助概念與原始素材，但正式輸出需統一視角、比例、光源、輪廓及透明邊緣；角色動畫須可控制一致性，不能只靠逐張獨立生成。

後續 Asset Pipeline 文件需定義素材清單、方向／幀／支點、檔名、輸出尺寸、透明邊緣、來源與使用權紀錄、打包及驗證流程。當前不製作素材或鎖定工具。

## 16. MVP 與開發階段意圖

| 階段 | 目標 |
| --- | --- |
| 內部玩法驗證 | 6×6、移動、兩機關、預警、可躲避性；可用暫時素材，非交付完成品 |
| 美術／玩法整合樣板 | 小段達最終品質的可玩內容，驗證手機表現與素材流程 |
| v1.0 | 四家族、完整模式組合／難度、音畫、死亡、UI、本機最高分、PWA |

正式 Milestones 等 Freeze 後建立。預期依賴順序：操作／碰撞 → 單機關公平性 → 美術整合樣板 → 模式／難度 → 完整音畫／UI → 手機驗收。本文不構成程式實作任務書或引擎選型。

## 17. Testing／Acceptance Criteria

### 17.1 可重現的功能與公平性驗收

- 有效滑動恰好一步，無漏步／重複步；長按無連走；模糊手勢不意外移動。
- 緩衝最多一步，滿載忽略；越界不留延遲指令；死亡／暫停／重開清理不適用輸入。
- 移動途中碰撞依實際位置；裝飾不擴張受擊範圍。
- 預警與實際危險範圍、時序相符；預告後目標不變。
- 箭矢過後可回到路徑；火焰等持續危險按可見起訖命中。
- 完整過波才 +1，連鎖不重複加分，死亡不獲未完成波分數。
- 多種可重現模式與隨機組合驗證存在有反應餘裕的安全時間路徑；包括遠端安全格、封路、交錯與已緩衝動作案例。
- 暫停／恢復／橫向／低幀率不改變公平性，不補跑離開期間的事件。
- Retry 一次操作開始，舊攻擊與輸入不殘留；教學不反覆出現。
- 聲音與震動按鈕互相獨立，跨局保存，靜音可玩，震動不可用有清楚狀態。
- 首次完整載入後離線進入並完成一局；最高分和偏好正常保存或明確降級。

### 17.2 遊玩驗收

邀請少量未參與設計的玩家，在實際手機上測試。記錄教學後能否自行操作、能否解釋死亡原因、主動重開意願、局長分布及不同階段的失敗原因。區分辨識、操作、路徑與節奏問題再調校。不以「能跑／沒報錯」替代好玩與公平驗收。

### 17.3 視覺與音畫驗收

實際手機尺寸下，角色、格線、預警、機關與安全路徑清楚；風格一致、透明邊緣乾淨；動畫無明顯跳格或漂移。無 Emoji、占位圖、廉價紅格或遮蔽玩法的特效。死亡有衝擊力但不拖慢重開。聲音／震動關閉不損失必要資訊。

## 18. Freeze 後待完成的文件

1. Architecture Proposal：引擎／框架比較、平台能力、遊戲時序／碰撞／輸入、攻擊資料與公平性檢查、儲存、資源與 PWA、效能及測試策略。
2. 細化設計：攻擊參數矩陣、並發上限、模式權重、反應餘裕、輸入門檻、恢復倒數及瀏覽器驗收矩陣。
3. Asset Pipeline：素材與動畫清單、品質樣板、製作／整合／驗證流程。
4. Implementation Milestones：每階段交付、依賴、驗收、風險與範圍界線。
5. 專案 SKILL.md 與 Agent-neutral Handoff Prompt：實作權限、工作規則、引用規格、測試／建置證據、不可擅改產品決策。

上述文件不得反向擴大 v1.0 範圍。重大玩法、IP 或交付範圍變更提交 PO；可逆實作細節由 Tech Lead 提案與審查。

## 19. Freeze 確認

目前：Frozen。架構、素材流程、里程碑與專案指令已於本交接包補齊；PO 授權 Codex 依里程碑完成本機 v1.0 實作，保留最終真機／美術驗收。
