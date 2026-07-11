# MKLab.se: The Living Canvas. Website redesign specification

Date: 2026-07-11
Status: awaiting Kristofer's review
Prototype: `docs/prototypes/living-canvas-v6.html` (self-contained HTML, open with the
white logo PNG served as `/files/logo.png`, or adjust the image path locally)

## 1. Vision

The site should feel like the reference photos: a dark, expensive room where the light
itself is alive. It sells experience, not help: "when you need experience, not just
help". One generative canvas of ember-and-graphite light lives behind the entire page
and re-forms itself into what the visitor is reading about. The website behaves like a
crafted application, not a document, while staying calm, fast, and readable.

Everything is custom-coded. No stock imagery, no icon-pack decoration, no photos in the
final design (the four moody photos remain art direction only).

## 2. Design language

Canonical source: `design-system/` in this repo plus `assets/css/tokens/` (verbatim
copies). Dark only. Ink scale surfaces, Ember `#ff4d1c` as the single chromatic voice,
Candle amber `#f5a623` as rare warm secondary. Spectral Light for display type, Hanken
Grotesk for UI/body, JetBrains Mono for eyebrows/labels/data. Restrained motion
(`--ease-out`, 140 to 600 ms), ember glow only on primary moments, hairline borders.
No em dashes anywhere, in any language. No emoji. Sentence case. The website leads the
brand; the mklab-brand skill follows the website.

Existing site-level a11y override stays: small tracked mono labels read
`--text-secondary`, not `--text-tertiary`.

## 3. The Living Canvas engine

One `<canvas>` fixed behind all content (z-index below, `pointer-events: none`),
owning a single particle system (~520 particles on desktop) plus a structural line
layer. Validated by the v6 prototype.

Core mechanics (as prototyped):

- Particles are shared across scenes. Each scene is a layout function (assigns per
  particle home positions, roles, alpha, size) plus a per-frame targets function
  (drift, flights, waves). Particles chase their targets with per-particle easing
  factors (k in 0.03 to 0.08), which makes every scene transition an organic morph of
  the same lights, never a cut.
- Glow is pre-rendered radial-gradient sprites (ember, flame, white, candle), drawn
  with `lighter` compositing. No per-frame shadowBlur.
- A translucent black fade rect (alpha ~0.42) instead of a hard clear gives cinematic
  trails. Production must add a periodic full clear or slightly higher fade to prevent
  the faint ghost streaks visible in long-exposure screenshots.
- Structural layer draws hairlines per scene (links, racks, gantt outlines, route
  path, viewfinder) with scene-fade so lines glow in after each morph.
- Scene switching is driven by scroll position (IntersectionObserver on chapter
  sentinels; the canvas cross-fades scenes as chapter openers enter the viewport).
  The v6 buttons emulate this.

Performance and degradation budget:

- 60 fps target on desktop; frame work capped (skip frames under 15 ms deltas).
- `document.hidden` and off-screen: animation pauses.
- Mobile: reduced particle budget (~250), simplified scenes, devicePixelRatio capped
  at 2.
- `prefers-reduced-motion`: no canvas animation; a static composed frame of the
  current scene (drawn once) or plain ink background. All content readable.
- No JavaScript: content fully readable on flat ink background (reveal classes must
  not hide content without JS, same pattern as today).
- Lighthouse: no regression below the current site on LCP/CLS; canvas initializes
  after first paint, never blocks content.

## 4. Scene vocabulary

Validated in v6 unless noted. Copy samples are directional, final copy at
implementation.

1. Ankomst (logo + constellation). Once per browser session (sessionStorage flag) the
   particles assemble the MKLab mark center-screen out of embers, hold ~1.8 s, then
   breathe apart into the constellation while the headline fades in. The mark is only
   hinted at by the particles (no image overlay): visitors should feel they saw the
   logo. Any scroll, click, or keypress skips instantly. Repeat visits within the
   session: constellation only. The constellation itself: 7 deliberate clusters with
   crisp 1-to-2-nearest links, dim scatter, rare large bokeh; copy zone (left) stays
   dark.
2. AI-transformation (ai-regn). Columns of falling light traces, ember/white, subtle
   Matrix homage ("if you know you know"), small and dim enough to hold text.
3. Molntransformation (rack-migrationer). Four hairline racks with 11 units each.
   Server = the cluster of particles in a unit. Every 1.7 to 3.4 s a crowded server
   decides to move: 70 to 100 percent of its particles stream from the middle of its
   unit toward a roomier server in another rack, launching straight at the target with
   a gentle mid-route bend, accelerating then decelerating. The route is a wake: each
   segment appears only after the flock passes and dissolves origin-end first
   (~2.2 s). Occupancy genuinely drifts forever.
4. Programledning (gantt). Cascading outlined plan bars, two ember-highlighted, glowing
   milestones at bar ends, slow ember "today" line sweeping. Copy must pair
   "förutsägbar takt" with explicit agility (Agile Software Development practices;
   predictable pace comes from agility, not rigidity).
5. Utvalda uppdrag (rutten). Thin ascending path 2010 to IDAG, five ember waypoints
   with orbiting team swarms, year labels in mono, slow travelers along the path. One
   waypoint active at a time with a ripple ring. On the real page the active waypoint
   is driven by which case card is in view.
6. Föredrag och utbildning (ringar i publiken). Warm stage point (candle glow), seven
   concentric audience rows fanned below, a ripple of brightness propagating outward
   through the rows every few seconds, sparse idea sparks rising from the stage.
7. Kontakt (ljuset på bordet). All particles come to rest as a breathing candle flame
   with a slow dim halo orbit and faint warmth rising. Contact actions sit beside it.
8. Foto (for /photo). Viewfinder corner brackets and rule-of-thirds hairlines, a
   seven-blade particle iris rotating and breathing at the center, drifting bokeh
   behind, ember autofocus square gliding between thirds intersections and locking
   with a pulse.
9. T-banan (for /apps/t-banan/*, to be prototyped at implementation). Particles form
   the classic T of Stockholms tunnelbana, same assemble-and-hint language as the
   logo entrance.

## 5. Site structure (variant A, story first)

One long page per language: `/` (Swedish, default) and `/en/` (mirror). Each chapter
opens full-viewport with its scene and a Spectral headline; chapter content scrolls
over the canvas on ink surfaces (cards use `--surface-card` with hairlines; large
text sits directly on the dark).

01 Ankomst. Logo entrance, headline ("När ni behöver erfarenhet, inte bara hjälp." or
   evolved), one-paragraph positioning, primary CTA (mailto) + secondary (Se utvalda
   uppdrag), stats line (30+ år, 17 år på Microsoft, Azure sedan 2010, Stockholm).
02 AI-transformation. Offer: AI-strategi och styrning, pilot till produktion,
   införande och utbildning.
03 Molntransformation. Offer: Azure-arkitektur och migrering,
   plattformsmodernisering och DevOps, säkerhet/skala/kostnad.
04 Programledning. Offer: teknisk programledning, interimt ledarskap,
   styrning/risk/intressenter, med agila arbetssätt explicit.
05 Utvalda uppdrag. The four existing cases as cards (AI i R&D, global programledning,
   Azure sedan dag ett, DevOps-transformation) mapped to route waypoints; rosters and
   the career-spanning footnote preserved.
06 Föredrag och utbildning. Keynotes and hands-on AI/cloud workshops, boka-CTA.
07 Om Kristofer. Bio (current three paragraphs as base), portrait photo, highlights
   list, the three principles (Börja med varför, Teknik ska tjäna människor, Mätbara
   resultat) folded in here.
08 Kontakt. Candle scene, email + LinkedIn, response promise.

Nav: thin sticky bar over the canvas (blur backdrop as today), logo left, chapter
links (desktop), SV/EN switcher, one ember CTA. Footer: logo, kort beskrivning,
chapter links, quiet links to /photo and t-banan pages, språkval, fineprint.

Nothing from the current site's content is lost: services grid becomes chapters 02 to
04, "Hur vi arbetar" principles move into Om, stats into Ankomst, speaking into 06,
contact into 08.

## 6. Sub-pages

- `/photo`: small landing page (tax/administrative need). Foto scene, a few
  paragraphs: photography as a separate MKLab offering, assignment types (corporate
  headshots, profile pictures, promotional photos, architecture, interior, family
  portraits, weddings without specializing in them), contact details. Same nav shell
  but minimal; linked from footer only so the consultancy positioning stays clean.
  Portfolio comes later.
- `/apps/t-banan/se/` and `/apps/t-banan/en/`: URLs unchanged (App Store references).
  Redesigned on the engine with the T scene, existing app content preserved.
- `404`: ink background, constellation scene, link home.

## 7. Technical implementation

- Jekyll on GitHub Pages as today; no build-step dependencies. The engine is one
  hand-written ES module (`assets/js/canvas.js`, no bundler, no libraries), loaded
  `defer`. Scene definitions in the same file or a sibling module.
- CSS stays on the existing token files (verbatim DS copies) + `site.css` component
  layer, extended for chapter layouts. No renames of existing tokens.
- Layouts: extend `_layouts/default.html` with the canvas mount and chapter
  scaffolding; content chapters authored in `index.html` / `en/index.html` as today.
- i18n: same approach as current site (two authored pages, hreflang alternates,
  visible switcher).
- Housekeeping at implementation: add `moody-photos/` to Jekyll excludes (or move
  into `docs/`), keep `.superpowers/` gitignored, remove `.codex/` from status noise
  if unwanted.
- Bilingual copy: Swedish first, English mirrored, no em dashes in either language.

## 8. Accessibility

- Canvas is decorative: `aria-hidden`, no information exists only in the animation.
- Copy contrast per DS a11y override; focus rings per tokens; skip link preserved.
- Reduced motion and no-JS paths as in section 3.
- Logo entrance never traps: content is composed underneath and any input skips.

## 9. Testing and acceptance

- All eight scenes render without console errors in Chromium, Firefox, Safari
  (desktop) and iOS/Android viewports.
- Scroll-driven morphs trigger at chapter boundaries in both directions.
- Entrance plays once per session, skippable, absent under reduced motion.
- `JEKYLL_ENV=production bundle exec jekyll build` clean; jekyll doctor clean.
- Lighthouse desktop: performance not worse than current site; a11y >= current.
- t-banan URLs return 200 with unchanged paths.
- Language switcher round-trips between `/` and `/en/` on every page that has both.

## 10. Out of scope (later iterations)

- /photo portfolio galleries and possible standalone photo site.
- Case study detail pages.
- Contact form (mailto remains for now).
- Analytics.

## 11. Decisions log

- Concept: C "Living Canvas" chosen over photo-led A/B (2026-07-11).
- Structure: variant A, story first (2026-07-11).
- Logo entrance: cinematic, once per session, skippable.
- Cloud scene: migrations are the particles' own decision; wake-style traces.
- Speaking scene ripple and contact candle approved as prototyped.
- Photography: separate quiet sub-page at /photo, not a headline service.
- Program management copy must carry agility explicitly.
