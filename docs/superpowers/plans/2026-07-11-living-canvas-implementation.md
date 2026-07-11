# Living Canvas Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild mklab.se as a chapter-based scroll story over one generative particle
canvas, per `docs/superpowers/specs/2026-07-11-living-canvas-website-design.md`.

**Architecture:** A single fixed `<canvas>` behind all content, driven by
`assets/js/canvas.js` (vanilla ES module, no dependencies), which ports the validated
prototype `docs/prototypes/living-canvas-v6.html` into a scroll-driven engine. Chapters
are `<section data-scene="...">` blocks; an IntersectionObserver switches scenes.
Jekyll/GitHub Pages pipeline unchanged.

**Tech Stack:** Jekyll (github-pages gem), vanilla JS, CSS on existing DS tokens,
Playwright (via MCP) for local verification.

## Global Constraints

- No em dashes or en dashes anywhere, any language (hard rule).
- No emoji, no hype adjectives, sentence case (DS voice).
- Ember `#ff4d1c` is the only chromatic accent; candle `#f5a623` sparingly.
- URLs `/apps/t-banan/se/` and `/apps/t-banan/en/` must not change.
- `docs/`, `design-system/` stay excluded from the build; add `moody-photos/`.
- No JS libraries, no build steps beyond Jekyll.
- Content readable with JS off and under `prefers-reduced-motion`.
- Tokens files under `assets/css/tokens/` are verbatim DS copies: never edit.

---

### Task 1: Housekeeping and canvas mount

**Files:**
- Modify: `_config.yml` (exclude `moody-photos`)
- Modify: `_layouts/default.html` (canvas element + script include)
- Create: `assets/js/canvas.js` (engine, Task 2 fills it)

**Interfaces:**
- Produces: `<canvas id="mk-canvas" class="mk-canvas" aria-hidden="true"></canvas>`
  as `body`'s first child; `<script src="/assets/js/canvas.js" defer>` in head area;
  chapters opt in via `data-scene` attributes read by the engine.

- [x] Step 1: Add `moody-photos` to the `exclude:` list in `_config.yml`.
- [x] Step 2: In `_layouts/default.html`, insert the canvas right after `<body ...>`
  and add `<script src="{{ '/assets/js/canvas.js' | relative_url }}" defer></script>`
  before `</head>` equivalent position (after site.css link).
- [x] Step 3: `bundle exec jekyll build` passes.
- [x] Step 4: Commit `chore: canvas mount and moody-photos exclude`.

### Task 2: The engine (`assets/js/canvas.js`)

**Files:**
- Create: `assets/js/canvas.js`

**Interfaces:**
- Consumes: `#mk-canvas`, `[data-scene]` sections, `sessionStorage['mk-intro']`,
  `matchMedia('(prefers-reduced-motion: reduce)')`.
- Produces: scenes keyed by name: `constellation`, `ai`, `cloud`, `gantt`, `route`,
  `speak`, `contact`, `photo`, `tbanan`; global `window.mkCanvas = { setWaypoint(i) }`
  for the route scene; automatic logo intro on scenes list containing
  `constellation` when `sessionStorage['mk-intro']` unset.

Port from `docs/prototypes/living-canvas-v6.html` with these production changes:

- [x] Step 1: Scene registry keyed by string name; scroll driver: observer on each
  `[data-scene]` section (rootMargin so the switch lands as the opener dominates the
  viewport); nearest-section-to-center wins on load.
- [x] Step 2: Logo intro: only on pages whose first scene is `constellation`; runs
  once per session (`sessionStorage`), skipped by wheel/touch/key/click or
  reduced-motion; page content visible underneath from first paint.
- [x] Step 3: T-banan scene: particles form a bold sans "T" (offscreen-canvas text
  sampling, same technique as the logo PNG sampling).
- [x] Step 4: Performance: particle budget 520 desktop / 260 when
  `matchMedia('(max-width: 720px)')`; dpr capped at 2; `visibilitychange` pause;
  full-canvas periodic clear to prevent ghost streak accumulation; rAF stops when
  reduced motion (draw one static composed frame instead).
- [x] Step 5: `window.mkCanvas.setWaypoint(i)` drives the route scene's active
  waypoint; case cards register via `data-waypoint` observer (in this module).
- [x] Step 6: Commit `feat: living canvas engine`.

### Task 3: Chapter CSS

**Files:**
- Modify: `assets/css/site.css`

**Interfaces:**
- Produces classes: `.mk-canvas` (fixed, z-index -1), `.mk-chapter` (position
  relative), `.mk-chapter__opener` (min-height 100svh flex column, justify center),
  `.mk-chapter__body` (content blocks), `.mk-kicker` (chapter number eyebrow),
  `.mk-case--active` state, transparent-surface variants so the canvas shows through
  (`.mk-section--band` replaced by translucent panel `.mk-panel`).

- [x] Step 1: Add canvas + chapter layout styles; ensure `body { background: var(--surface-base) }`
  stays as fallback while sections stop painting opaque full-bleed backgrounds.
- [x] Step 2: Cards over canvas: keep `--surface-card` opaque (readability) but allow
  `backdrop-filter` variant for large statement blocks.
- [x] Step 3: Responsive: chapters stack cleanly at 390px wide; opener type scales via
  existing clamps; grids collapse (reuse existing 960px breakpoint).
- [x] Step 4: Production build passes. Commit `feat: chapter layout styles`.

### Task 4: Swedish homepage rebuild (`index.html`)

**Files:**
- Modify: `index.html` (full rewrite of body content)

Chapters in order (variant A), each `<section class="mk-chapter" id="..." data-scene="...">`:
`hem/constellation`, `ai/ai`, `moln/cloud`, `program/gantt`, `uppdrag/route`,
`foredrag/speak`, `om/constellation`, `kontakt/contact`.
Copy: evolve current site copy per spec section 5; program chapter states agility
explicitly; stats line in Ankomst; principles inside Om; cases as `data-waypoint`
cards; footnote preserved.

- [x] Step 1: Write the full page.
- [x] Step 2: Build + local render check (desktop viewport, all chapters, scenes
  switch on scroll).
- [x] Step 3: Commit `feat: Swedish homepage on the living canvas`.

### Task 5: English homepage rebuild (`en/index.html`)

**Files:**
- Modify: `en/index.html`

- [x] Step 1: Mirror Task 4 in English (translate evolved copy, keep front matter
  permalink `/en/`, `alt_lang_path: /`).
- [x] Step 2: Build + render check; language switcher round-trips.
- [x] Step 3: Commit `feat: English homepage on the living canvas`.

### Task 6: Navigation and footer

**Files:**
- Modify: `_data/i18n.yml` (nav anchors for new chapter ids; footer links to /photo
  and t-banan)
- Modify: `_includes/site-footer.html` (extra column links)

- [x] Step 1: Update sv/en nav lists: AI `#ai`, Moln/Cloud `#moln|#cloud`... use the
  same ids in both languages (`#ai`, `#moln`, `#program`, `#uppdrag`, `#foredrag`,
  `#om`, `#kontakt`) and translated labels; English page uses same ids for parity.
- [x] Step 2: Footer gains quiet links: MKLab Foto (`/photo/`) and T-banan
  (`/apps/t-banan/se/` resp `/apps/t-banan/en/` by lang).
- [x] Step 3: Build passes; header/footer links resolve on both languages. Commit
  `feat: navigation for chapter structure`.

### Task 7: /photo landing page

**Files:**
- Create: `_pages/photo.html` (permalink `/photo/`, `data-scene="photo"`, Swedish)

- [x] Step 1: Page: Foto scene opener ("Hantverk, även bakom kameran."), two short
  paragraphs (photography as separate MKLab offering, craft promise), assignment list
  (företagsporträtt, profilbilder, marknadsföringsbilder, arkitektur, interiör,
  familjeporträtt, bröllop utan specialisering), contact block (email). Footer-only
  discovery; `robots` normal.
- [x] Step 2: Build + render check. Commit `feat: photo landing page`.

### Task 8: t-banan pages and 404 on the engine

**Files:**
- Modify: `_pages/t-banan-se.html`, `_pages/t-banan-en.html` (add
  `data-scene="tbanan"` opener, scrub en/em dashes, keep permalinks and content)
- Modify: `_pages/404.md` (constellation backdrop)

- [x] Step 1: Wrap existing content in chapter structure with T scene opener; scrub
  dashes; URLs unchanged.
- [x] Step 2: 404 gets `data-scene="constellation"` and existing copy.
- [x] Step 3: Build; `_site/apps/t-banan/se/index.html` and `.../en/index.html` exist.
  Commit `feat: t-banan and 404 on the living canvas`.

### Task 9: Full local verification

- [x] Step 1: `JEKYLL_ENV=production bundle exec jekyll build` and
  `bundle exec jekyll doctor` clean.
- [x] Step 2: Serve `_site` locally; Playwright: desktop 1440x900 and mobile 390x844.
  For each of `/`, `/en/`, `/photo/`, `/apps/t-banan/se/`, `/apps/t-banan/en/`, 404:
  zero console errors, screenshots reviewed for polish, scenes switch while
  scrolling, intro plays once then not again (sessionStorage), reduced-motion
  emulation shows static frame, JS-disabled load shows all content.
- [x] Step 3: Fix everything found; iterate until clean. Commit fixes.

### Task 10: Publish and verify live

- [x] Step 1: Push `main` to origin (Kristofer granted publish permission
  2026-07-11).
- [x] Step 2: Poll https://mklab.se until the new deploy is live; spot-check `/`,
  `/en/`, `/photo/`, t-banan URLs over HTTPS.
- [x] Step 3: Update memory (site shipped; brand skill sync note) and report.
