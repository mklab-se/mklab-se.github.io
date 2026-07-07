# mklab.se Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild mklab.se on the MKLab Design System (ink/ember, Spectral + Hanken Grotesk + JetBrains Mono) with all-new bilingual copy positioning MKLab as senior AI & Cloud transformation leadership.

**Architecture:** Jekyll static site on GitHub Pages. Design-system token CSS copied verbatim into `assets/css/tokens/`; one hand-written `site.css` ports the component look (no React). Twin-tree bilingual: Swedish at `/` (root `index.html`), English at `/en/`, shared chrome strings in `_data/i18n.yml`, `hreflang` pairs in the head. T-banan app support pages keep their exact URLs, restyled only.

**Tech Stack:** Jekyll (github-pages gem), plain CSS with custom properties, one inline vanilla JS snippet. No new plugins, no external JS.

**Spec:** `docs/superpowers/specs/2026-07-07-website-overhaul-design.md` (copy deck in §4 is authoritative for all text).

## Global Constraints

- **No em-dashes (—) anywhere**, any language, any file this plan touches. Year ranges: "2018 till 2022" / "2018 to 2022". Middle dot (·) is allowed as separator.
- **No fictional claims**: never "partners", "40+ engagements", "MMXIX". MKLab AB founded 2025. Cases span Kristofer's career 2010 to today.
- **URL contract**: `/apps/t-banan/en/`, `/apps/t-banan/se/`, `/404.html` permalinks must not change.
- **Anchor IDs identical in both languages**: `services`, `how`, `work`, `speaking`, `about`, `contact`.
- **Voice**: firm "we"/"vi" everywhere except About (first person). Sentence case headlines. No exclamation marks, no emoji, no hype adjectives.
- `design-system/` is the token source of truth; copies in `assets/css/tokens/` are never edited by hand.
- All work on branch `feat/website-overhaul-ds`. Conventional commits, subject < 72 chars.
- Every commit message ends with the two standard trailer lines (Co-Authored-By + Claude-Session) used in this session.

---

### Task 1: Working local Jekyll build

The local build is currently broken: Homebrew Ruby 4.0.5 is incompatible with the pinned `github-pages` gem stack (`bundle exec jekyll` errors out of `vendor/bundle/ruby/4.0.0`). Nothing else in this plan can be verified without a working build.

**Files:**
- Possibly modify: `.gitignore` (only if a new vendor path needs ignoring; check before adding)
- No source files change in this task.

**Interfaces:**
- Produces: a `bundle exec jekyll build` command that exits 0, used by every later task. If a Ruby-3 prefix is required, record the exact working command in `docs/superpowers/plans/2026-07-07-website-overhaul.md` under this task as a note, and use it verbatim in later tasks wherever `bundle exec jekyll build` appears.

- [ ] **Step 1: Try the current toolchain**

Run:
```bash
cd /Users/kristofer/repos/mklab-se/mklab-se.github.io
bundle install
```
Expected: either success, or a Ruby 4.0 incompatibility error (native extension / bundler stack trace).

- [ ] **Step 2 (only if Step 1 failed): Install Ruby 3.3 and re-bundle**

Run:
```bash
brew install ruby@3.3
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
gem install bundler
bundle config set --local path vendor/bundle
rm -rf vendor/bundle/ruby/4.0.0
bundle install
```
Expected: `Bundle complete!`. Note: `vendor/` is already in both the Jekyll `exclude` list and `.gitignore` (verify with `git check-ignore vendor/bundle`; if not ignored, add `vendor/` to `.gitignore`).

- [ ] **Step 3: Verify the build works**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -3
```
Expected: `done in X.XXX seconds.` and a populated `_site/` directory. If Step 2's PATH export was needed, every later `bundle exec` in this plan must be run with that same PATH export active.

- [ ] **Step 4: Commit (only if .gitignore changed)**

```bash
git add .gitignore
git commit -m "chore: ignore local bundle path for Ruby 3.3 toolchain"
```

---

### Task 2: Feature branch, tokens, and brand assets

**Files:**
- Create: `assets/css/tokens/fonts.css`, `assets/css/tokens/colors.css`, `assets/css/tokens/typography.css`, `assets/css/tokens/spacing.css`, `assets/css/tokens/effects.css`, `assets/css/tokens/motion.css` (verbatim copies)
- Create: `assets/images/logos/mklab-white.svg`, `assets/images/logos/mklab-black.svg`, `assets/images/brand/stockholm-skyline.svg` (verbatim copies)
- Optionally create: `assets/images/brand/bar-mood.png` (only if the user has placed `design-system/assets/brand/bar-mood.png`; skip silently if absent)

**Interfaces:**
- Produces: token files importable as `./tokens/<name>.css` from `assets/css/site.css`; image paths `/assets/images/logos/mklab-white.svg` and `/assets/images/brand/stockholm-skyline.svg` used by Tasks 4-8.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/website-overhaul-ds
```

- [ ] **Step 2: Copy tokens and assets**

```bash
mkdir -p assets/css/tokens assets/images/brand
cp design-system/tokens/*.css assets/css/tokens/
cp design-system/assets/logos/mklab-white.svg assets/images/logos/
cp design-system/assets/logos/mklab-black.svg assets/images/logos/
cp design-system/assets/brand/stockholm-skyline.svg assets/images/brand/
[ -f design-system/assets/brand/bar-mood.png ] && cp design-system/assets/brand/bar-mood.png assets/images/brand/ || echo "bar-mood.png not present, hero ships flat fallback"
```

- [ ] **Step 3: Verify copies are byte-identical**

Run:
```bash
diff -r design-system/tokens assets/css/tokens && echo TOKENS-OK
diff design-system/assets/logos/mklab-white.svg assets/images/logos/mklab-white.svg && echo LOGO-OK
```
Expected: `TOKENS-OK` and `LOGO-OK`, no diff output.

- [ ] **Step 4: Commit**

```bash
git add assets/css/tokens assets/images/logos/mklab-white.svg assets/images/logos/mklab-black.svg assets/images/brand
git commit -m "feat: import design-system tokens and brand assets"
```

---

### Task 3: New stylesheet (full design-system port)

**Files:**
- Modify: `assets/css/site.css` (replace ENTIRE contents with the CSS below)

**Interfaces:**
- Consumes: token custom properties and the `.mk-eyebrow` utility from `assets/css/tokens/*.css` (Task 2).
- Produces: classes used by Tasks 4-8: `mk-shell`, `mk-skip`, `mk-nav` (+`__inner`, `__brand`, `__links`, `__meta`, `__lang`), `mk-btn` (+`--primary`, `--ghost`, `--outline`, `--sm`, `--lg`), `mk-section` (+`--band`), `mk-h2`, `mk-hero` (+`--flat`, `__bg`, `__scrim`, `__content`, `__title`, `__lead`, `__actions`), `mk-card` (+`--interactive`), `mk-list`, `mk-meta`, `mk-roster`, `mk-grid` (+`--services`, `--work`), `mk-statement`, `mk-principles`, `mk-principle` (+`__num`), `mk-stats`, `mk-stat` (+`__num`, `__label`), `mk-footnote`, `mk-speaking`, `mk-about` (+`__body`), `mk-portrait`, `mk-highlights`, `mk-contact`, `mk-footer` (+`__inner`, `__brand`, `__logo`, `__cols`, `__heading`, `__base`, `__skyline`, `__fineprint`), `mk-page-header`, `mk-badge`, `mk-page-title`, `mk-page-lead`, `mk-split` (+`--even`), `reveal`/`is-visible`.

- [ ] **Step 1: Replace `assets/css/site.css` with exactly this content**

```css
/* ============================================================
   mklab.se, built on the MKLab Design System.
   Tokens are verbatim copies from design-system/tokens/.
   Component classes below port the DS component look to
   plain CSS. Edit this file, never the token copies.
   ============================================================ */

@import "./tokens/fonts.css";
@import "./tokens/colors.css";
@import "./tokens/typography.css";
@import "./tokens/spacing.css";
@import "./tokens/effects.css";
@import "./tokens/motion.css";

*,
*::before,
*::after { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--accent-quiet); }

img { max-width: 100%; }

a { color: var(--text-accent); text-decoration: none; }
a:hover { color: var(--ember-300); }

:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-sm);
}

.mk-shell {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--gutter-page);
}

.mk-skip {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  background: var(--surface-overlay);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
}
.mk-skip:focus { left: var(--space-4); top: var(--space-4); }

/* --- Nav ------------------------------------------------- */
.mk-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(5, 5, 5, 0.72);
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  border-bottom: 1px solid var(--border-subtle);
}
.mk-nav__inner {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--gutter-page);
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}
.mk-nav__brand img { height: 30px; display: block; opacity: 0.9; }
.mk-nav__links { display: flex; gap: var(--space-6); }
.mk-nav__links a {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease-standard);
}
.mk-nav__links a:hover { color: var(--text-primary); }
.mk-nav__meta { display: flex; align-items: center; gap: var(--space-4); }
.mk-nav__lang {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-tertiary);
  display: inline-flex;
  gap: var(--space-2);
}
.mk-nav__lang a { color: var(--text-secondary); }
.mk-nav__lang a:hover { color: var(--text-primary); }
.mk-nav__lang [aria-current] { color: var(--ember-300); }

/* --- Buttons ---------------------------------------------- */
.mk-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 42px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-wide);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: var(--transition-control);
}
.mk-btn--sm { height: 34px; padding: 0 14px; font-size: var(--text-xs); }
.mk-btn--lg { height: 52px; padding: 0 28px; font-size: var(--text-base); }
.mk-btn--primary {
  background: var(--accent);
  color: var(--text-on-accent);
  box-shadow: var(--glow-ember-sm);
}
.mk-btn--primary:hover {
  background: var(--accent-hover);
  color: var(--text-on-accent);
  box-shadow: var(--glow-ember-md);
}
.mk-btn--primary:active { transform: translateY(0.5px) scale(0.99); }
.mk-btn--ghost { background: transparent; color: var(--text-secondary); }
.mk-btn--ghost:hover { background: var(--surface-hover); color: var(--text-primary); }
.mk-btn--outline {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-default);
}
.mk-btn--outline:hover { border-color: var(--border-strong); background: var(--surface-hover); }

/* --- Sections --------------------------------------------- */
.mk-section { padding: var(--space-24) 0; }
.mk-section--band {
  background: var(--ink-900);
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.mk-section .mk-eyebrow { display: block; margin-bottom: var(--space-4); }
.mk-h2 {
  font-family: var(--font-display);
  font-weight: var(--weight-light);
  font-size: clamp(32px, 4.5vw, 42px);
  line-height: var(--leading-snug);
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
  margin: 0 0 var(--space-10);
}

/* --- Hero -------------------------------------------------- */
.mk-hero {
  position: relative;
  overflow: hidden;
  min-height: 620px;
  display: flex;
  align-items: center;
  padding: var(--space-24) 0;
}
.mk-hero--flat {
  background:
    radial-gradient(120% 80% at 20% 0%, rgba(255, 77, 28, 0.1), transparent 60%);
}
.mk-hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.5;
}
.mk-hero__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(5, 5, 5, 0.94) 30%, rgba(5, 5, 5, 0.55) 100%);
}
.mk-hero__content { position: relative; max-width: 820px; }
.mk-hero__title {
  font-family: var(--font-display);
  font-weight: var(--weight-light);
  font-size: clamp(40px, 7vw, 76px);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tighter);
  color: var(--text-primary);
  margin: var(--space-6) 0;
}
.mk-hero__lead {
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  max-width: 560px;
  margin: 0 0 var(--space-8);
}
.mk-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

/* --- Cards ------------------------------------------------- */
.mk-card {
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-8);
  transition: var(--transition-control);
}
.mk-card--interactive:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
.mk-card h2,
.mk-card h3 {
  font-family: var(--font-display);
  font-weight: var(--weight-regular);
  font-size: var(--text-xl);
  line-height: var(--leading-snug);
  color: var(--text-primary);
  margin: var(--space-3) 0;
}
.mk-card p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  margin: 0 0 var(--space-4);
}
.mk-card p:last-child { margin-bottom: 0; }

.mk-list { list-style: none; margin: 0; padding: 0; }
.mk-list li {
  position: relative;
  padding-left: var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.9;
}
.mk-list li::before { content: "·"; position: absolute; left: 0; color: var(--accent); }

.mk-meta {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.mk-card .mk-roster,
.mk-roster {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-tertiary);
  margin: var(--space-4) 0 0;
}

.mk-grid { display: grid; gap: var(--space-5); }
.mk-grid--services { grid-template-columns: repeat(3, 1fr); }
.mk-grid--work { grid-template-columns: repeat(2, 1fr); }

/* --- How we work band -------------------------------------- */
.mk-statement {
  font-family: var(--font-display);
  font-weight: var(--weight-light);
  font-size: clamp(24px, 3.4vw, 34px);
  line-height: 1.3;
  color: var(--text-primary);
  max-width: 720px;
  margin: 0 auto var(--space-16);
  text-align: center;
}
.mk-statement em { font-style: normal; color: var(--accent); }
.mk-principles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-8);
  margin-bottom: var(--space-16);
}
.mk-principle__num {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-widest);
  color: var(--ember-300);
}
.mk-principle h3 {
  font-family: var(--font-sans);
  font-weight: var(--weight-semibold);
  font-size: var(--text-md);
  color: var(--text-primary);
  margin: var(--space-2) 0;
}
.mk-principle p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
  margin: 0;
}
.mk-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.mk-stat { background: var(--surface-base); padding: var(--space-10) var(--space-6); text-align: center; }
.mk-stat__num {
  font-family: var(--font-display);
  font-weight: var(--weight-light);
  font-size: 52px;
  line-height: 1;
  color: var(--text-primary);
}
.mk-stat__label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-top: var(--space-3);
}

.mk-footnote {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-tertiary);
  margin-top: var(--space-6);
}

/* --- Speaking ----------------------------------------------- */
.mk-speaking { text-align: center; }
.mk-speaking .mk-h2 { margin-bottom: var(--space-5); }
.mk-speaking p {
  color: var(--text-secondary);
  max-width: 560px;
  margin: 0 auto var(--space-8);
}

/* --- About --------------------------------------------------- */
.mk-about {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--space-10);
  align-items: start;
}
.mk-about__body p { color: var(--text-secondary); margin: 0 0 var(--space-4); }
.mk-portrait img { border-radius: var(--radius-md); display: block; margin-bottom: var(--space-5); }
.mk-highlights { list-style: none; margin: var(--space-5) 0 0; padding: 0; }
.mk-highlights li {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-secondary);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.mk-highlights li:last-child { border-bottom: none; }

/* --- Contact -------------------------------------------------- */
.mk-contact { text-align: center; padding: var(--space-32) 0; }
.mk-contact .mk-h2 { font-size: clamp(36px, 6vw, 56px); margin-bottom: var(--space-5); }
.mk-contact p {
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto var(--space-8);
}
.mk-contact .mk-hero__actions { justify-content: center; }

/* --- Footer ---------------------------------------------------- */
.mk-footer {
  background: var(--ink-900);
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-16) 0 var(--space-10);
}
.mk-footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-10);
}
.mk-footer__logo { height: 34px; opacity: 0.5; margin-bottom: var(--space-4); display: block; }
.mk-footer__brand p { font-size: var(--text-sm); color: var(--text-tertiary); max-width: 280px; margin: 0; }
.mk-footer__cols { display: flex; gap: var(--space-16); }
.mk-footer__heading {
  font-family: var(--font-mono);
  font-size: var(--text-3xs);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: var(--space-4);
}
.mk-footer__cols a {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.mk-footer__cols a:hover { color: var(--text-primary); }
.mk-footer__base {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-6);
  margin-top: var(--space-12);
}
.mk-footer__skyline { height: 26px; filter: invert(1); opacity: 0.22; }
.mk-footer__fineprint {
  font-family: var(--font-mono);
  font-size: var(--text-3xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-tertiary);
}

/* --- Aux pages (t-banan, 404) ----------------------------------- */
.mk-page-header { padding: var(--space-20) 0 var(--space-12); }
.mk-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--ember-300);
  background: var(--accent-quiet);
  border: 1px solid rgba(255, 77, 28, 0.3);
}
.mk-page-title {
  font-family: var(--font-display);
  font-weight: var(--weight-light);
  font-size: clamp(36px, 6vw, 56px);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tighter);
  margin: var(--space-4) 0;
}
.mk-page-lead { color: var(--text-secondary); max-width: 640px; margin: 0; }
.mk-split {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--space-6);
  align-items: start;
}
.mk-split--even { grid-template-columns: 1fr 1fr; }

/* --- Reveal animation -------------------------------------------- */
.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}
.reveal.is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1; transform: none; transition: none; }
}

/* --- Responsive ---------------------------------------------------- */
@media (max-width: 960px) {
  .mk-nav__links { display: none; }
  .mk-grid--services,
  .mk-grid--work,
  .mk-principles,
  .mk-about,
  .mk-split,
  .mk-split--even { grid-template-columns: 1fr; }
  .mk-stats { grid-template-columns: repeat(2, 1fr); }
  .mk-footer__inner { flex-direction: column; }
  .mk-footer__base { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 2: Build to verify the CSS compiles into _site**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2 && grep -c "mk-btn--primary" _site/assets/css/site.css
```
Expected: `done in ...` and a count of at least 1.

- [ ] **Step 3: Commit**

```bash
git add assets/css/site.css
git commit -m "feat: replace stylesheet with design-system port"
```

---

### Task 4: i18n data + default layout

**Files:**
- Create: `_data/i18n.yml`
- Modify: `_layouts/default.html` (replace ENTIRE contents)
- Delete: `_data/navigation.yml`

**Interfaces:**
- Consumes: `assets/css/site.css` (Task 3).
- Produces: `site.data.i18n[lang]` with keys `home`, `nav` (list of `label`/`href`), `header_cta`, `footer_tagline`, `footer_nav_heading`, `footer_contact_heading`, `footer_fineprint`, `skip_link`. Layout renders `hreflang` pair when `page.alt_lang_path` is set; `page.homepage` suppresses the `· MKLab` title suffix. Used by Tasks 5-8.

- [ ] **Step 1: Create `_data/i18n.yml` with exactly this content**

```yaml
sv:
  home: "/"
  nav:
    - label: "Tjänster"
      href: "/#services"
    - label: "Uppdrag"
      href: "/#work"
    - label: "Föredrag"
      href: "/#speaking"
    - label: "Om"
      href: "/#about"
    - label: "Kontakt"
      href: "/#contact"
  header_cta: "Kontakta oss"
  footer_tagline: "Erfaret ledarskap för AI- och molntransformation."
  footer_nav_heading: "Navigera"
  footer_contact_heading: "Kontakt"
  footer_fineprint: "MKLab AB · Stockholm · grundat 2025"
  skip_link: "Hoppa till innehållet"
en:
  home: "/en/"
  nav:
    - label: "Services"
      href: "/en/#services"
    - label: "Work"
      href: "/en/#work"
    - label: "Speaking"
      href: "/en/#speaking"
    - label: "About"
      href: "/en/#about"
    - label: "Contact"
      href: "/en/#contact"
  header_cta: "Get in touch"
  footer_tagline: "Senior leadership for AI and cloud transformation."
  footer_nav_heading: "Navigate"
  footer_contact_heading: "Contact"
  footer_fineprint: "MKLab AB · Stockholm · est. 2025"
  skip_link: "Skip to content"
```

- [ ] **Step 2: Replace `_layouts/default.html` with exactly this content**

```html
---
---
<!DOCTYPE html>
{% assign lang = page.lang | default: 'sv' %}
<html lang="{{ lang }}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{% if page.homepage %}{{ page.title }}{% elsif page.title %}{{ page.title }} · {{ site.title }}{% else %}{{ site.title }}{% endif %}</title>
  <meta name="description" content="{{ page.description | default: site.description }}" />
  <link rel="canonical" href="{{ page.url | absolute_url }}" />
  {% if page.alt_lang_path %}
  {% if lang == 'sv' %}{% assign other_lang = 'en' %}{% else %}{% assign other_lang = 'sv' %}{% endif %}
  <link rel="alternate" hreflang="{{ lang }}" href="{{ page.url | absolute_url }}" />
  <link rel="alternate" hreflang="{{ other_lang }}" href="{{ page.alt_lang_path | absolute_url }}" />
  {% if lang == 'sv' %}
  <link rel="alternate" hreflang="x-default" href="{{ page.url | absolute_url }}" />
  {% else %}
  <link rel="alternate" hreflang="x-default" href="{{ page.alt_lang_path | absolute_url }}" />
  {% endif %}
  {% endif %}
  {% if page.meta_image or site.meta_image %}
  {% assign og_image = page.meta_image | default: site.meta_image %}
  <meta property="og:image" content="{{ og_image | absolute_url }}" />
  <meta name="twitter:image" content="{{ og_image | absolute_url }}" />
  {% endif %}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="{{ '/assets/css/site.css' | relative_url }}" />
  <link rel="icon" href="{{ '/favicon.ico' | relative_url }}" />
  {% if page.head_extra %}{{ page.head_extra }}{% endif %}
</head>
<body class="{{ page.body_class | default: '' }}">
  {% assign t = site.data.i18n[lang] %}
  <a class="mk-skip" href="#main">{{ t.skip_link }}</a>
  {% unless page.hide_header %}
    {% include site-header.html %}
  {% endunless %}

  {{ content }}

  {% unless page.hide_footer %}
    {% include site-footer.html %}
  {% endunless %}

  <script>
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    var revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      revealElements.forEach(function (el) { observer.observe(el); });
    } else {
      revealElements.forEach(function (el) { el.classList.add('is-visible'); });
    }
  </script>
</body>
</html>
```

Note: the streaming-text script from the old layout is intentionally removed.

- [ ] **Step 3: Delete the legacy nav data**

```bash
git rm _data/navigation.yml
```

- [ ] **Step 4: Build (expect include errors are NOT possible yet: header/footer still exist with old content, so build must pass)**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2
```
Expected: `done in ...`. (The old header/footer includes still reference old classes; they are replaced in Task 5. The site is visually broken mid-branch, which is fine.)

- [ ] **Step 5: Commit**

```bash
git add _data/i18n.yml _layouts/default.html
git commit -m "feat: bilingual layout with hreflang, i18n data, DS fonts"
```

---

### Task 5: Header and footer includes

**Files:**
- Modify: `_includes/site-header.html` (replace ENTIRE contents)
- Modify: `_includes/site-footer.html` (replace ENTIRE contents)

**Interfaces:**
- Consumes: `site.data.i18n` keys (Task 4), CSS classes (Task 3), `/assets/images/logos/mklab-white.svg` and `/assets/images/brand/stockholm-skyline.svg` (Task 2).
- Produces: header with SV/EN switcher shown only when `page.alt_lang_path` is set; footer with `data-current-year` span.

- [ ] **Step 1: Replace `_includes/site-header.html` with exactly this content**

```html
{% assign lang = page.lang | default: 'sv' %}
{% assign t = site.data.i18n[lang] %}
<header class="mk-nav">
  <div class="mk-nav__inner">
    <a class="mk-nav__brand" href="{{ t.home | relative_url }}" aria-label="MKLab">
      <img src="{{ '/assets/images/logos/mklab-white.svg' | relative_url }}" alt="MKLab" />
    </a>
    <nav class="mk-nav__links" aria-label="Primary">
      {% for item in t.nav %}
      <a href="{{ item.href | relative_url }}">{{ item.label }}</a>
      {% endfor %}
    </nav>
    <div class="mk-nav__meta">
      {% if page.alt_lang_path %}
      <span class="mk-nav__lang">
        {% if lang == 'sv' %}
        <span aria-current="true">SV</span><span>|</span><a href="{{ page.alt_lang_path | relative_url }}">EN</a>
        {% else %}
        <a href="{{ page.alt_lang_path | relative_url }}">SV</a><span>|</span><span aria-current="true">EN</span>
        {% endif %}
      </span>
      {% endif %}
      <a class="mk-btn mk-btn--primary mk-btn--sm" href="mailto:{{ site.email }}">{{ t.header_cta }}</a>
    </div>
  </div>
</header>
```

- [ ] **Step 2: Replace `_includes/site-footer.html` with exactly this content**

```html
{% assign lang = page.lang | default: 'sv' %}
{% assign t = site.data.i18n[lang] %}
<footer class="mk-footer">
  <div class="mk-shell">
    <div class="mk-footer__inner">
      <div class="mk-footer__brand">
        <img class="mk-footer__logo" src="{{ '/assets/images/logos/mklab-white.svg' | relative_url }}" alt="MKLab" />
        <p>{{ t.footer_tagline }}</p>
      </div>
      <div class="mk-footer__cols">
        <div>
          <div class="mk-footer__heading">{{ t.footer_nav_heading }}</div>
          {% for item in t.nav %}
          <a href="{{ item.href | relative_url }}">{{ item.label }}</a>
          {% endfor %}
        </div>
        <div>
          <div class="mk-footer__heading">{{ t.footer_contact_heading }}</div>
          <a href="mailto:{{ site.email }}">{{ site.email }}</a>
          <a href="https://www.linkedin.com/in/kristofer-liljeblad/">LinkedIn</a>
        </div>
      </div>
    </div>
    <div class="mk-footer__base">
      <img class="mk-footer__skyline" src="{{ '/assets/images/brand/stockholm-skyline.svg' | relative_url }}" alt="" />
      <span class="mk-footer__fineprint">© <span data-current-year></span> {{ t.footer_fineprint }}</span>
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Build and verify the header renders the switcher only with alt_lang_path**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2
grep -c "mk-nav__lang" _site/index.html || echo "no switcher on old index (expected until Task 6)"
grep -c "mk-nav" _site/index.html
```
Expected: build ok; `mk-nav` present in `_site/index.html` (old index has no `alt_lang_path` front matter yet, so no switcher: that arrives with Task 6).

- [ ] **Step 4: Commit**

```bash
git add _includes/site-header.html _includes/site-footer.html
git commit -m "feat: DS header with language switcher and DS footer"
```

---

### Task 6: Swedish homepage

**Files:**
- Modify: `index.html` (replace ENTIRE contents)

**Interfaces:**
- Consumes: CSS classes (Task 3), layout/i18n (Task 4), includes (Task 5), portrait `assets/images/headshots/kristofer-square.jpg` (already in repo).
- Produces: anchors `#services`, `#how`, `#work`, `#speaking`, `#about`, `#contact` that Task 7 mirrors and i18n nav (Task 4) targets.

- [ ] **Step 1: Replace `index.html` with exactly this content**

(Copy is authoritative from spec §4; hero photo renders only if `assets/images/brand/bar-mood.png` exists, else the flat variant.)

```html
---
layout: default
title: MKLab AB · AI- och molntransformation
description: MKLab leder AI- och molntransformation med senior erfarenhet. Strategi med ledningen, leverans med teamen. Tre decennier i teknikbranschen, sjutton år på Microsoft.
homepage: true
lang: sv
alt_lang_path: /en/
---
{% assign hero_photo = site.static_files | where: "path", "/assets/images/brand/bar-mood.png" | first %}
<main id="main">
  <section class="mk-hero{% unless hero_photo %} mk-hero--flat{% endunless %}">
    {% if hero_photo %}
    <img class="mk-hero__bg" src="{{ hero_photo.path | relative_url }}" alt="" />
    <div class="mk-hero__scrim"></div>
    {% endif %}
    <div class="mk-shell">
      <div class="mk-hero__content reveal">
        <span class="mk-eyebrow">MKLab AB · Stockholm</span>
        <h1 class="mk-hero__title">AI- och molntransformation, ledd av någon som har gjort det förut.</h1>
        <p class="mk-hero__lead">MKLab leder AI- och molntransformation för organisationer som inte har råd att misslyckas. Vi sätter strategin med er ledning, bygger med era utvecklare och driver programmet från beslut till leverans. Tre decennier i teknikbranschen. Sjutton år på Microsoft.</p>
        <div class="mk-hero__actions">
          <a class="mk-btn mk-btn--primary mk-btn--lg" href="mailto:{{ site.email }}">Berätta vad ni står inför</a>
          <a class="mk-btn mk-btn--ghost mk-btn--lg" href="#work">Se utvalda uppdrag</a>
        </div>
      </div>
    </div>
  </section>

  <section id="services" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Vad vi gör</span>
      <h2 class="mk-h2 reveal">Vi gör tre saker.</h2>
      <div class="mk-grid mk-grid--services">
        <article class="mk-card reveal">
          <span class="mk-meta">01</span>
          <h3>AI-transformation</h3>
          <p>Från pilot till produktion. Vi hjälper er att välja de problem som är värda att lösa, sätta rätt skyddsräcken och ta AI från demo till daglig drift.</p>
          <ul class="mk-list">
            <li>AI-strategi och styrning</li>
            <li>Från pilot till produktion</li>
            <li>Införande och utbildning</li>
          </ul>
        </article>
        <article class="mk-card reveal">
          <span class="mk-meta">02</span>
          <h3>Molntransformation</h3>
          <p>Enterprise-moln sedan Azures första dag 2010. Arkitektur, migrering och modernisering som håller för säkerhetsgranskning och kostnadskontroll.</p>
          <ul class="mk-list">
            <li>Azure-arkitektur och migrering</li>
            <li>Plattformsmodernisering och DevOps</li>
            <li>Säkerhet, skala, kostnad</li>
          </ul>
        </article>
        <article class="mk-card reveal">
          <span class="mk-meta">03</span>
          <h3>Programledning</h3>
          <p>Komplexa program över många team, levererade i förutsägbar takt. Interimt tekniskt ledarskap när initiativet är för viktigt för att tappa fart.</p>
          <ul class="mk-list">
            <li>Teknisk programledning</li>
            <li>Interimt ledarskap</li>
            <li>Styrning, risk, intressenter</li>
          </ul>
        </article>
      </div>
    </div>
  </section>

  <section id="how" class="mk-section mk-section--band">
    <div class="mk-shell">
      <p class="mk-statement reveal">Vi arbetar på alla nivåer i er organisation. Strategi med ledningen, detaljer med utvecklarna, och <em>samma person i båda rummen</em>.</p>
      <div class="mk-principles">
        <div class="mk-principle reveal">
          <span class="mk-principle__num">01</span>
          <h3>Börja med varför</h3>
          <p>Inget program överlever ett otydligt varför. Vi ser till att alla inblandade kan säga vad vi gör och varför det spelar roll, innan vi använder era pengar.</p>
        </div>
        <div class="mk-principle reveal">
          <span class="mk-principle__num">02</span>
          <h3>Teknik ska tjäna människor</h3>
          <p>Vi bygger för människorna som ska använda, driva och leva med det vi levererar. Det är inte mjukt. Det är det som gör att förändringen fastnar.</p>
        </div>
        <div class="mk-principle reveal">
          <span class="mk-principle__num">03</span>
          <h3>Mätbara resultat</h3>
          <p>I tid, inom budget och synligt i de siffror som betyder något för er verksamhet.</p>
        </div>
      </div>
      <div class="mk-stats reveal">
        <div class="mk-stat"><div class="mk-stat__num">30+</div><div class="mk-stat__label">år i teknikbranschen</div></div>
        <div class="mk-stat"><div class="mk-stat__num">17</div><div class="mk-stat__label">år på Microsoft</div></div>
        <div class="mk-stat"><div class="mk-stat__num">2010</div><div class="mk-stat__label">byggt på Azure sedan</div></div>
        <div class="mk-stat"><div class="mk-stat__num">STHLM</div><div class="mk-stat__label">grundat 2025</div></div>
      </div>
    </div>
  </section>

  <section id="work" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Utvalda uppdrag</span>
      <h2 class="mk-h2 reveal">Resultatet, inte teatern.</h2>
      <div class="mk-grid mk-grid--work">
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">AI · R&amp;D · 2024 till 2025</span>
          <h3>AI som accelerator i R&amp;D</h3>
          <p>Ledde införandet av AI i ett R&amp;D-team som utvecklar både hårdvara och mjukvara. Fokus på kvalitet, snabbare arbetsflöden och innovation, i nära samarbete med ledningsgruppen för att koppla varje initiativ till strategin.</p>
          <p class="mk-roster">Konfidentiell kund · hårdvara och mjukvara</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">Programledning · 2018 till 2022</span>
          <h3>Leverans över team, i global skala</h3>
          <p>Drev program- och projektledning tillsammans med några av Microsofts största kunder. Kravarbete, tydligt scope och riskhantering över många utvecklingsteam, med leverans i förutsägbar takt.</p>
          <p class="mk-roster">Microsoft, Siemens, Procter &amp; Gamble, Equinor, Vestas</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">Azure · 2010 till idag</span>
          <h3>Enterprise-moln på Azure, sedan dag ett</h3>
          <p>Med Azure sedan lanseringen 2010: först som evangelist för tidiga användare, senare som arkitekt för komplexa enterprise-laster. Ledde globala rådgivningsprogram med säkra, skalbara lösningar enligt Microsofts egna ingenjörsstandarder.</p>
          <p class="mk-roster">Microsoft, IO Interactive, Kiloo, E.ON, Shell, BP</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">DevOps · Kultur · 2023 till 2024</span>
          <h3>DevOps-transformation där IT och utveckling möts</h3>
          <p>Byggde en gemensam DevOps-kultur mellan IT och utveckling. Kombinerade ledarskap och tekniskt djup för att förbättra utvecklarupplevelsen, förenkla arbetsflöden och stötta verksamhetens mål.</p>
          <p class="mk-roster">Konfidentiell kund · industri</p>
        </article>
      </div>
      <p class="mk-footnote reveal">Uppdragen spänner över Kristofers karriär, 2010 till idag.</p>
    </div>
  </section>

  <section id="speaking" class="mk-section mk-section--band mk-speaking">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Föredrag och workshoppar</span>
      <h2 class="mk-h2 reveal">Vi föreläser också.</h2>
      <p class="reveal">Keynotes och praktiska AI-workshoppar som får team att vilja bygga. Från inspiration för hela organisationen till hands-on-pass för utvecklingsteam, en halvdag eller en heldag.</p>
      <a class="mk-btn mk-btn--outline reveal" href="mailto:{{ site.email }}?subject=F%C3%B6redrag">Boka ett föredrag</a>
    </div>
  </section>

  <section id="about" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Om MKLab</span>
      <h2 class="mk-h2 reveal">Jag heter Kristofer.</h2>
      <div class="mk-about">
        <div class="mk-about__body reveal">
          <p>Jag har arbetat i teknikbranschen i tre decennier, varav sjutton år på Microsoft, där jag ledde storskaliga AI- och molnprogram för några av världens största organisationer. Att hålla mig längst fram i teknikutvecklingen är inte ett jobbkrav för mig. Det är det roligaste jag vet.</p>
          <p>Jag har alltid velat leda så att människor vill följa, inte för att de måste utan för att det känns rätt. Jag är tydlig, stöttande och pedagogisk, och få saker slår ögonblicket när polletten trillar ner hos någon annan.</p>
          <p>Samtidigt håller jag mig nära själva arbetet. Jag trivs i arkitekturdiskussioner, i plattformsarbete och sida vid sida med utvecklare. Men teknik handlar om människor. Vi är människor först, och det är oftast den insikten som skiljer en bra lösning från en riktigt bra.</p>
        </div>
        <aside class="mk-card mk-portrait reveal" aria-label="Kristofer Liljeblad">
          <img src="{{ '/assets/images/headshots/kristofer-square.jpg' | relative_url }}" alt="Kristofer Liljeblad" />
          <span class="mk-meta">Kristofer Liljeblad · Grundare</span>
          <ul class="mk-highlights">
            <li>30 år av levererad mjukvara</li>
            <li>17 år på Microsoft</li>
            <li>Från styrelserum till kodbas</li>
            <li>Svenska och engelska</li>
            <li>Stockholm, kunder globalt</li>
          </ul>
        </aside>
      </div>
    </div>
  </section>

  <section id="contact" class="mk-section mk-contact">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Vi kan hjälpa</span>
      <h2 class="mk-h2 reveal">Berätta vad ni står inför.</h2>
      <p class="reveal">Varje förfrågan läses av en senior person: samma person som sedan gör jobbet. Vi svarar inom två arbetsdagar.</p>
      <div class="mk-hero__actions reveal">
        <a class="mk-btn mk-btn--primary mk-btn--lg" href="mailto:{{ site.email }}">{{ site.email }}</a>
        <a class="mk-btn mk-btn--ghost mk-btn--lg" href="https://www.linkedin.com/in/kristofer-liljeblad/">LinkedIn</a>
      </div>
    </div>
  </section>
</main>
```

- [ ] **Step 2: Build and assert the Swedish page**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2
grep -c 'id="services"\|id="how"\|id="work"\|id="speaking"\|id="about"\|id="contact"' _site/index.html
grep -c 'hreflang="en"' _site/index.html
grep -c "—" _site/index.html || echo EMDASH-CLEAN
```
Expected: build ok; anchor count 6; hreflang count 1; `EMDASH-CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Swedish homepage with new positioning and DS markup"
```

---

### Task 7: English homepage

**Files:**
- Create: `en/index.html`

**Interfaces:**
- Consumes: identical structure and classes as Task 6 (anchors must match exactly).
- Produces: `/en/` page whose `alt_lang_path` is `/`.

- [ ] **Step 1: Create `en/index.html` with exactly this content**

Identical markup to Task 6 with translated copy; structural elements repeated in full:

```html
---
layout: default
title: MKLab AB · AI and cloud transformation
description: MKLab leads AI and cloud transformation with senior experience. Strategy with the boardroom, delivery with the teams. Three decades in technology, seventeen years at Microsoft.
homepage: true
lang: en
alt_lang_path: /
permalink: /en/
---
{% assign hero_photo = site.static_files | where: "path", "/assets/images/brand/bar-mood.png" | first %}
<main id="main">
  <section class="mk-hero{% unless hero_photo %} mk-hero--flat{% endunless %}">
    {% if hero_photo %}
    <img class="mk-hero__bg" src="{{ hero_photo.path | relative_url }}" alt="" />
    <div class="mk-hero__scrim"></div>
    {% endif %}
    <div class="mk-shell">
      <div class="mk-hero__content reveal">
        <span class="mk-eyebrow">MKLab AB · Stockholm</span>
        <h1 class="mk-hero__title">AI and cloud transformation, led by someone who has done it before.</h1>
        <p class="mk-hero__lead">MKLab leads AI and cloud transformation for organisations that can't afford to get it wrong. We set the strategy with your executives, build with your engineers, and carry the program from decision to delivered. Three decades in technology. Seventeen years at Microsoft.</p>
        <div class="mk-hero__actions">
          <a class="mk-btn mk-btn--primary mk-btn--lg" href="mailto:{{ site.email }}">Tell us what you're facing</a>
          <a class="mk-btn mk-btn--ghost mk-btn--lg" href="#work">See our work</a>
        </div>
      </div>
    </div>
  </section>

  <section id="services" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">What we do</span>
      <h2 class="mk-h2 reveal">We do three things.</h2>
      <div class="mk-grid mk-grid--services">
        <article class="mk-card reveal">
          <span class="mk-meta">01</span>
          <h3>AI transformation</h3>
          <p>From pilot to production. We help you pick the problems worth solving, put the right guardrails in place, and take AI from demo to daily operations.</p>
          <ul class="mk-list">
            <li>AI strategy and governance</li>
            <li>Pilot to production</li>
            <li>Adoption and enablement</li>
          </ul>
        </article>
        <article class="mk-card reveal">
          <span class="mk-meta">02</span>
          <h3>Cloud transformation</h3>
          <p>Enterprise cloud since Azure's first day in 2010. Architecture, migration, and modernisation that hold up under security review and cost scrutiny.</p>
          <ul class="mk-list">
            <li>Azure architecture and migration</li>
            <li>Platform modernisation and DevOps</li>
            <li>Security, scale, cost</li>
          </ul>
        </article>
        <article class="mk-card reveal">
          <span class="mk-meta">03</span>
          <h3>Program leadership</h3>
          <p>Complex cross-team programs delivered at a predictable cadence, and interim technical leadership when the initiative is too important to drift.</p>
          <ul class="mk-list">
            <li>Technical program management</li>
            <li>Interim leadership</li>
            <li>Governance, risk, stakeholders</li>
          </ul>
        </article>
      </div>
    </div>
  </section>

  <section id="how" class="mk-section mk-section--band">
    <div class="mk-shell">
      <p class="mk-statement reveal">We work at every level of your organisation. Strategy with the boardroom, detail with the engineers, and <em>the same person in both rooms</em>.</p>
      <div class="mk-principles">
        <div class="mk-principle reveal">
          <span class="mk-principle__num">01</span>
          <h3>Start with why</h3>
          <p>No program survives an unclear why. We make sure everyone involved can say what we are doing and why it matters, before we spend your money.</p>
        </div>
        <div class="mk-principle reveal">
          <span class="mk-principle__num">02</span>
          <h3>Technology serves people</h3>
          <p>We build for the people who will use, run, and live with what we deliver. That is not soft. It is what makes change stick.</p>
        </div>
        <div class="mk-principle reveal">
          <span class="mk-principle__num">03</span>
          <h3>Outcomes you can measure</h3>
          <p>On time, on budget, and visible in the numbers your business cares about.</p>
        </div>
      </div>
      <div class="mk-stats reveal">
        <div class="mk-stat"><div class="mk-stat__num">30+</div><div class="mk-stat__label">years in technology</div></div>
        <div class="mk-stat"><div class="mk-stat__num">17</div><div class="mk-stat__label">years at Microsoft</div></div>
        <div class="mk-stat"><div class="mk-stat__num">2010</div><div class="mk-stat__label">building on Azure since</div></div>
        <div class="mk-stat"><div class="mk-stat__num">STHLM</div><div class="mk-stat__label">est. 2025</div></div>
      </div>
    </div>
  </section>

  <section id="work" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Selected work</span>
      <h2 class="mk-h2 reveal">The outcome, not the theatre.</h2>
      <div class="mk-grid mk-grid--work">
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">AI · R&amp;D · 2024 to 2025</span>
          <h3>AI as an accelerator in R&amp;D</h3>
          <p>Led the adoption of AI in an R&amp;D team building both hardware and software. Focused on quality, faster workflows, and innovation, working directly with the executive team to tie every initiative to strategy.</p>
          <p class="mk-roster">Confidential client · hardware and software</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">Program management · 2018 to 2022</span>
          <h3>Cross-team delivery at global scale</h3>
          <p>Drove program and project delivery with some of Microsoft's largest customers. Requirements, scope clarity, and risk management across many development teams, delivered at a predictable cadence.</p>
          <p class="mk-roster">Microsoft, Siemens, Procter &amp; Gamble, Equinor, Vestas</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">Azure · 2010 to today</span>
          <h3>Enterprise cloud on Azure, since day one</h3>
          <p>On Azure since its 2010 launch: first evangelising the platform for early adopters, later architecting complex enterprise workloads. Led global advisory programmes delivering secure, scalable solutions to Microsoft's own engineering standards.</p>
          <p class="mk-roster">Microsoft, IO Interactive, Kiloo, E.ON, Shell, BP</p>
        </article>
        <article class="mk-card mk-card--interactive reveal">
          <span class="mk-meta">DevOps · Culture · 2023 to 2024</span>
          <h3>A DevOps transformation where IT and development meet</h3>
          <p>Built a shared DevOps culture between IT and development. Combined leadership and technical depth to improve developer experience, streamline workflows, and support the organisation's goals.</p>
          <p class="mk-roster">Confidential client · industrial</p>
        </article>
      </div>
      <p class="mk-footnote reveal">Engagements span Kristofer's career, 2010 to today.</p>
    </div>
  </section>

  <section id="speaking" class="mk-section mk-section--band mk-speaking">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">Speaking and workshops</span>
      <h2 class="mk-h2 reveal">We also speak.</h2>
      <p class="reveal">Keynotes and hands-on AI workshops that leave teams eager to build. From inspiration for the whole organisation to hands-on sessions for engineering teams, half day or full day.</p>
      <a class="mk-btn mk-btn--outline reveal" href="mailto:{{ site.email }}?subject=Speaking">Book a talk</a>
    </div>
  </section>

  <section id="about" class="mk-section">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">About MKLab</span>
      <h2 class="mk-h2 reveal">I'm Kristofer.</h2>
      <div class="mk-about">
        <div class="mk-about__body reveal">
          <p>I have spent three decades in technology, seventeen of them at Microsoft, leading large-scale AI and cloud programs for some of the world's largest organisations. Staying at the front of the technology curve is not a job requirement for me. It is the most fun I know.</p>
          <p>I have always wanted to lead in a way that makes people want to follow, not because they have to but because it feels right. I am clear, supportive, and pedagogic, and few things beat the moment the lightbulb switches on for someone else.</p>
          <p>At the same time I stay close to the work itself. I am at home in architecture discussions, in platform work, and side by side with engineers. But technology is about people. We are humans first, and that insight is usually what separates a good solution from a great one.</p>
        </div>
        <aside class="mk-card mk-portrait reveal" aria-label="Kristofer Liljeblad">
          <img src="{{ '/assets/images/headshots/kristofer-square.jpg' | relative_url }}" alt="Kristofer Liljeblad" />
          <span class="mk-meta">Kristofer Liljeblad · Founder</span>
          <ul class="mk-highlights">
            <li>30 years shipping software</li>
            <li>17 years at Microsoft</li>
            <li>Boardroom to codebase</li>
            <li>Swedish and English</li>
            <li>Stockholm based, global clients</li>
          </ul>
        </aside>
      </div>
    </div>
  </section>

  <section id="contact" class="mk-section mk-contact">
    <div class="mk-shell">
      <span class="mk-eyebrow reveal">We can help</span>
      <h2 class="mk-h2 reveal">Tell us what you're facing.</h2>
      <p class="reveal">Every enquiry is read by a senior person: the same one who will do the work. We reply within two business days.</p>
      <div class="mk-hero__actions reveal">
        <a class="mk-btn mk-btn--primary mk-btn--lg" href="mailto:{{ site.email }}">{{ site.email }}</a>
        <a class="mk-btn mk-btn--ghost mk-btn--lg" href="https://www.linkedin.com/in/kristofer-liljeblad/">LinkedIn</a>
      </div>
    </div>
  </section>
</main>
```

- [ ] **Step 2: Build and assert the twin pair**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2
test -f _site/en/index.html && echo EN-OK
grep -c 'hreflang="sv"' _site/en/index.html
grep -o 'id="[a-z]*"' _site/index.html | sort > /tmp/sv-ids.txt
grep -o 'id="[a-z]*"' _site/en/index.html | sort > /tmp/en-ids.txt
diff /tmp/sv-ids.txt /tmp/en-ids.txt && echo IDS-MATCH
```
Expected: `EN-OK`, hreflang count 1, `IDS-MATCH`.

- [ ] **Step 3: Commit**

```bash
git add en/index.html
git commit -m "feat: English homepage twin at /en/"
```

---

### Task 8: Restyle T-banan pages and 404 (URLs unchanged)

**Files:**
- Modify: `_pages/t-banan-en.html` (front matter + class swaps only; ALL prose byte-identical)
- Modify: `_pages/t-banan-se.html` (same)
- Modify: `_pages/404.md` (class swaps only)

**Interfaces:**
- Consumes: `mk-page-header`, `mk-badge`, `mk-page-title`, `mk-page-lead`, `mk-section`, `mk-shell`, `mk-split`, `mk-card`, `mk-list`, `mk-btn` (Task 3); `lang`/`alt_lang_path` behavior (Tasks 4-5).
- Produces: unchanged permalinks `/apps/t-banan/en/`, `/apps/t-banan/se/`, `/404.html`.

- [ ] **Step 1: Apply these exact edits to `_pages/t-banan-en.html`**

Front matter: add two lines below `permalink`:
```yaml
lang: en
alt_lang_path: /apps/t-banan/se/
```
Class swaps (prose untouched):
- `<main class="page-main">` → `<main id="main">`
- `<section class="page-header scanlines">` → `<section class="mk-page-header">`
- every `<div class="site-shell">` → `<div class="mk-shell">`
- `<div class="site-shell section--split">` → `<div class="mk-shell mk-split">` (first split section), `<div class="mk-shell mk-split mk-split--even">` (second split section, the two-article one)
- `<span class="badge mono">App</span>` → `<span class="mk-badge">App</span>`
- `class="page-title"` → `class="mk-page-title"`, `class="page-lead"` → `class="mk-page-lead"`
- every `class="glass-card"` → `class="mk-card"`
- `<section class="section">` → `<section class="mk-section">`
- `<ul class="card-list">` → `<ul class="mk-list">` and remove the literal `• ` prefixes from its three `<li>` items (the CSS now renders the marker)

- [ ] **Step 2: Apply the same edits to `_pages/t-banan-se.html`**

Front matter addition:
```yaml
lang: sv
alt_lang_path: /apps/t-banan/en/
```
Identical class swaps as Step 1, prose untouched.

- [ ] **Step 3: Replace `_pages/404.md` body (front matter unchanged) with**

```html
<main id="main">
  <section class="mk-page-header">
    <div class="mk-shell">
      <h1 class="mk-page-title">Lost in transit</h1>
      <p class="mk-page-lead">The page you're looking for isn't here. Try heading back to the homepage or using the navigation above.</p>
      <p style="margin-top: 32px;"><a href="{{ '/' | relative_url }}" class="mk-btn mk-btn--primary">Take me home</a></p>
    </div>
  </section>
</main>
```
Also add `lang: en` to its front matter (404 serves any URL; English is the safer default for it, and without `alt_lang_path` the switcher hides).

- [ ] **Step 4: Build and verify the URL contract and prose integrity**

Run:
```bash
bundle exec jekyll build 2>&1 | tail -2
test -f _site/apps/t-banan/en/index.html && test -f _site/apps/t-banan/se/index.html && test -f _site/404.html && echo URLS-OK
grep -c "glass-card\|scanlines\|page-header " _site/apps/t-banan/en/index.html || echo OLD-CLASSES-GONE
grep -c "does not collect, store, or share" _site/apps/t-banan/en/index.html
grep -c "samlar inte in, lagrar eller delar" _site/apps/t-banan/se/index.html
```
Expected: `URLS-OK`, `OLD-CLASSES-GONE`, both privacy-policy greps return 1.

- [ ] **Step 5: Commit**

```bash
git add _pages/t-banan-en.html _pages/t-banan-se.html _pages/404.md
git commit -m "feat: restyle t-banan support pages and 404, URLs unchanged"
```

---

### Task 9: Config cleanup + full verification suite

**Files:**
- Modify: `_config.yml` (three value changes)

**Interfaces:**
- Consumes: everything from Tasks 2-8.
- Produces: a verified branch ready for PR.

- [ ] **Step 1: Update `_config.yml` values**

Change exactly these three lines (rest of file untouched):
- `title: MKLab` → `title: MKLab AB`
- `description: Technical leadership, program management, architecture, and DevOps for modern product teams.` → `description: MKLab leder AI- och molntransformation med senior erfarenhet. Strategi med ledningen, leverans med teamen.`
- `lang: en` → `lang: sv`

- [ ] **Step 2: Run the full verification suite**

Run each; every expectation must hold:
```bash
JEKYLL_ENV=production bundle exec jekyll build 2>&1 | tail -2       # done in ...
bundle exec jekyll doctor                                            # "Everything looks fine."
test -f _site/index.html && test -f _site/en/index.html && \
test -f _site/apps/t-banan/en/index.html && \
test -f _site/apps/t-banan/se/index.html && \
test -f _site/404.html && echo URL-CONTRACT-OK                       # URL-CONTRACT-OK
grep -rl "—" _site --include="*.html" | grep -v "^_site/design-system" ; echo "exit=$?"   # exit=1 (no matches)
grep -ril "MMXIX\|40+ engagements\|6 partners" _site --include="*.html" ; echo "exit=$?"  # exit=1
grep -c 'hreflang="x-default"' _site/index.html _site/en/index.html  # 1 each
grep -c "fonts.googleapis.com" _site/assets/css/tokens/fonts.css     # >= 1 (Google Fonts load)
grep -c "mk-hero" _site/index.html                                   # >= 1
```

- [ ] **Step 3: Serve locally and do the visual pass**

Run:
```bash
bundle exec jekyll serve --detach 2>&1 | tail -1
```
Then check in a browser (desktop width and ~390px): `http://127.0.0.1:4000/`, `/en/`, `/apps/t-banan/se/`, checking: sticky blurred nav, ember glow on primary CTA, hero (photo or flat fallback), card hover lift, stat band, reveal animation on scroll, SV/EN switcher round-trips, anchor links land on sections, fonts are Spectral/Hanken Grotesk/JetBrains Mono (inspect computed styles). Kill the server after (`pkill -f jekyll`).

- [ ] **Step 4: Commit**

```bash
git add _config.yml
git commit -m "chore: Swedish-default site config for bilingual overhaul"
```

---

### Task 10: Push branch and open PR

**Files:** none (git operations only)

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin feat/website-overhaul-ds
gh pr create --title "Website overhaul: MKLab Design System + AI/Cloud positioning" --body "$(cat <<'EOF'
Complete overhaul of mklab.se per docs/superpowers/specs/2026-07-07-website-overhaul-design.md:

- MKLab Design System (ink/ember, Spectral + Hanken Grotesk + JetBrains Mono) ported to plain HTML/CSS
- New positioning: senior AI & Cloud transformation leadership; all copy rewritten
- Bilingual: Swedish at /, English at /en/, hreflang pair, SV/EN switcher
- T-banan app support pages restyled, URLs unchanged (Apple requirement)
- No React, no new plugins, no forms

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01P18CMPJLuk6cshUc5t9RnL
EOF
)"
```

- [ ] **Step 2: Confirm GitHub Pages builds the branch merge cleanly**

After user review and merge to `main`, watch the Pages deployment (`gh run list --limit 3`) and spot-check https://mklab.se/ and https://mklab.se/apps/t-banan/se/.

---

## Self-Review Notes

- Spec coverage: §3 architecture → Tasks 5-8; §4 copy deck → Tasks 6-7 verbatim; §5.1 CSS → Task 3; §5.2 → Tasks 4-5; §5.3 → Tasks 6-8; §5.4 → Task 2; §5.5 → Task 4 (script); §5.6 honored (nothing added); §6 verification → Task 9; §7 rollout → Tasks 2 and 10. Legacy `_data/ui-text.yml` intentionally untouched (out of scope).
- Class names cross-checked between Task 3 CSS and Tasks 5-8 markup.
- The em-dash grep in Task 9 covers built HTML only; source prose in Tasks 6-8 was authored without em-dashes.
