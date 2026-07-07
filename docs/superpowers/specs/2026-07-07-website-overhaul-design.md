---
title: mklab.se overhaul, design spec
date: 2026-07-07
status: approved_pending_user_review
supersedes: 2026-05-20-website-refresh-progress.md (visual direction and positioning; bilingual and factual decisions carried over)
---

# mklab.se overhaul: MKLab Design System + AI/Cloud transformation positioning

## 1. Goal

Complete overhaul of mklab.se. Two changes at once:

1. **Visual**: replace the Gruvbox / glassmorphism / terminal aesthetic with the MKLab
   Design System pulled from claude.ai/design into `design-system/` (monochrome ink
   scale, single ember accent `#ff4d1c` with signature glow, Spectral display serif,
   Hanken Grotesk body, JetBrains Mono labels, Leica-quiet restraint).
2. **Message**: reposition the site around one clear offer: senior leadership for AI
   and cloud transformation programs. All copy rewritten.

Audience: organisations that need senior help with AI or cloud transformation programs
or large projects. The site must make it obvious what MKLab does, why it is credible,
and how to get in touch.

## 2. Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Positioning | AI & Cloud transformation primary; speaking/workshops as one quiet secondary band (no coaching section) |
| 2 | Languages | Bilingual: Swedish default at `/`, English twin at `/en/`, SV/EN switcher in header, no auto-redirect |
| 3 | Cases | 4 curated cases; name clients already public on the site; keep the two confidential ones anonymous by industry |
| 4 | Primary CTA | mailto:kristofer@mklab.se (primary, ember glow) + LinkedIn (ghost). No forms, no booking service |
| 5 | Voice | Firm voice ("we"/"vi") everywhere except About, which is first person ("I"/"jag") |
| 6 | Build approach | Single-page editorial flow per language; pure HTML/CSS port of the design system; no React, no client-side Babel |
| 7 | Hero visual | bar-mood.png photograph, full-bleed, heavily darkened with scrim. Fallback if the file is not yet downloaded: flat near-black + subtle ember radial glow (one CSS swap later) |
| 8 | Headline | "AI and cloud transformation, led by someone who has done it before." / "AI- och molntransformation, ledd av någon som har gjort det förut." |

Standing rules honored throughout:

- **No em-dashes anywhere**, in any language. Comma, period, colon, or hyphen. Year
  ranges written "2018 till 2022" / "2018 to 2022".
- **Facts**: MKLab AB founded 2025-02-28. One person (not stated on the site, but
  nothing may imply otherwise: no invented partner counts, engagement counts, or
  founding years). The design system demo's fictional stats ("6 partners", "40+
  engagements", "EST. MMXIX") are NOT carried over. Cases span Kristofer's career,
  2010 to today, and the site says so.
- **DS voice rules**: sentence case headlines, short certain sentences, no hype
  adjectives, no exclamation marks, no emoji, tracked uppercase mono only for
  eyebrows/labels/meta.

## 3. Page architecture

### 3.1 Main page (twin: `/` Swedish, `/en/` English)

Sticky header + seven sections + footer. Anchor IDs are identical in both languages
(English slugs) so CSS/JS stay shared: `services`, `how`, `work`, `speaking`,
`about`, `contact`.

| Section | Pattern from design system |
|---------|---------------------------|
| Header | `Chrome.jsx` Nav: sticky, `rgba(5,5,5,0.72)` + backdrop blur, hairline bottom border, monogram left, links center/right, SV/EN switcher, small primary button |
| 01 Hero | `Home.jsx` Hero: full-bleed darkened photo + gradient scrim, mono kicker, Spectral light H1 (~76px desktop, fluid down), lead, primary + ghost CTA |
| 02 Services | 3 graphite cards (`Card` default): mono eyebrow, Spectral card titles, body, 3-item list per card |
| 03 How we work | Ethos band on `--ink-900` with hairline top/bottom borders: centered Spectral statement, 3 numbered principles, 4-block stat grid |
| 04 Selected work | 4 interactive cards (hover lift): mono meta, Spectral title, story, client roster line; mono footnote under the grid |
| 05 Speaking | Compact band: eyebrow, short Spectral H2, one paragraph, ghost CTA |
| 06 About | Split layout: first-person copy left; portrait in a graphite card right with mono caption + highlights list |
| 07 Contact | AccessBand pattern: eyebrow, big Spectral ask, body line, glowing primary mailto + ghost LinkedIn |
| Footer | `Chrome.jsx` Footer: low-opacity monogram + tagline, link columns (nav anchors + LinkedIn/email), skyline SVG at low opacity, fine print |

### 3.2 Auxiliary pages (URLs MUST NOT change)

- `/apps/t-banan/en/` and `/apps/t-banan/se/`: Apple-required support pages for the
  T-banan app. Content (privacy policy, support info) unchanged. Restyled: new
  header/footer chrome, old classes (`glass-card`, `scanlines`, `page-header`,
  `badge`) swapped for new DS classes. The two pages act as each other's SV/EN pair
  (`alt_lang_path`).
- `/404.html`: restyled the same way, copy kept ("Lost in transit").

### 3.3 Bilingual mechanics

- Twin tree: root `index.html` (Swedish), `en/index.html` (English). Full section
  markup in each; copy is the only difference by design (structure kept in sync
  manually; the page is small enough that includes-per-section add more indirection
  than value).
- `_data/i18n.yml`: shared chrome strings keyed by language (nav labels, switcher,
  footer fine print, skip-link etc.). Templates read `page.lang`.
- Front matter per page: `lang: sv|en`, `alt_lang_path: /en/` etc.
- Head: `hreflang` alternate links both directions + `x-default` pointing at `/`,
  canonical per page, `<html lang>` from front matter.
- Switcher: `SV | EN` top-right, links to `alt_lang_path`, current language
  non-linked/dimmed.

## 4. Copy deck (final, both languages)

No em-dashes below, by rule. Middle dots (·) are allowed as list/meta separators
(they are not dashes).

### 4.0 Meta

| | SV | EN |
|---|---|---|
| `<title>` | MKLab AB · AI- och molntransformation | MKLab AB · AI and cloud transformation |
| description | MKLab leder AI- och molntransformation med senior erfarenhet: strategi med ledningen, leverans med teamen. Tre decennier i teknikbranschen, sjutton år på Microsoft. | MKLab leads AI and cloud transformation with senior experience: strategy with the boardroom, delivery with the teams. Three decades in technology, seventeen years at Microsoft. |

### 4.1 Header nav

SV: `Tjänster · Uppdrag · Föredrag · Om · Kontakt` + `SV | EN` + button `Kontakta oss`
EN: `Services · Work · Speaking · About · Contact` + `SV | EN` + button `Get in touch`

### 4.2 Hero

- Kicker (mono, tracked caps): `MKLAB AB · STOCKHOLM`
- H1 SV: **AI- och molntransformation, ledd av någon som har gjort det förut.**
- H1 EN: **AI and cloud transformation, led by someone who has done it before.**
- Lead SV: MKLab leder AI- och molntransformation för organisationer som inte har råd
  att misslyckas. Vi sätter strategin med er ledning, bygger med era utvecklare och
  driver programmet från beslut till leverans. Tre decennier i teknikbranschen.
  Sjutton år på Microsoft.
- Lead EN: MKLab leads AI and cloud transformation for organisations that can't
  afford to get it wrong. We set the strategy with your executives, build with your
  engineers, and carry the program from decision to delivered. Three decades in
  technology. Seventeen years at Microsoft.
- CTA primary SV: `Berätta vad ni står inför` → mailto:kristofer@mklab.se
- CTA primary EN: `Tell us what you're facing` → mailto:kristofer@mklab.se
- CTA ghost SV: `Se utvalda uppdrag` → `#work`
- CTA ghost EN: `See our work` → `#work`

### 4.3 Services (`#services`)

Eyebrow SV: `VAD VI GÖR` / EN: `WHAT WE DO`
H2 SV: **Vi gör tre saker.** / EN: **We do three things.**

**Card 1: AI-transformation / AI transformation**
- SV: Från pilot till produktion. Vi hjälper er att välja de problem som är värda att
  lösa, sätta rätt skyddsräcken och ta AI från demo till daglig drift.
- EN: From pilot to production. We help you pick the problems worth solving, put the
  right guardrails in place, and take AI from demo to daily operations.
- Bullets SV: AI-strategi och styrning · Från pilot till produktion · Införande och
  utbildning
- Bullets EN: AI strategy and governance · Pilot to production · Adoption and
  enablement

**Card 2: Molntransformation / Cloud transformation**
- SV: Enterprise-moln sedan Azures första dag 2010. Arkitektur, migrering och
  modernisering som håller för säkerhetsgranskning och kostnadskontroll.
- EN: Enterprise cloud since Azure's first day in 2010. Architecture, migration, and
  modernisation that hold up under security review and cost scrutiny.
- Bullets SV: Azure-arkitektur och migrering · Plattformsmodernisering och DevOps ·
  Säkerhet, skala, kostnad
- Bullets EN: Azure architecture and migration · Platform modernisation and DevOps ·
  Security, scale, cost

**Card 3: Programledning / Program leadership**
- SV: Komplexa program över många team, levererade i förutsägbar takt. Interimt
  tekniskt ledarskap när initiativet är för viktigt för att tappa fart.
- EN: Complex cross-team programs delivered at a predictable cadence, and interim
  technical leadership when the initiative is too important to drift.
- Bullets SV: Teknisk programledning · Interimt ledarskap · Styrning, risk,
  intressenter
- Bullets EN: Technical program management · Interim leadership · Governance, risk,
  stakeholders

### 4.4 How we work (`#how`)

Eyebrow SV: `SÅ ARBETAR VI` / EN: `HOW WE WORK`

Statement (centered Spectral, "både rummen"/"both rooms" may carry ember color):
- SV: Vi arbetar på alla nivåer i er organisation. Strategi med ledningen, detaljer
  med utvecklarna, och samma person i båda rummen.
- EN: We work at every level of your organisation. Strategy with the boardroom,
  detail with the engineers, and the same person in both rooms.

Principles (numbered 01 02 03 in mono):

1. **Börja med varför / Start with why**
   - SV: Inget program överlever ett otydligt varför. Vi ser till att alla inblandade
     kan säga vad vi gör och varför det spelar roll, innan vi använder era pengar.
   - EN: No program survives an unclear why. We make sure everyone involved can say
     what we are doing and why it matters, before we spend your money.
2. **Teknik ska tjäna människor / Technology serves people**
   - SV: Vi bygger för människorna som ska använda, driva och leva med det vi
     levererar. Det är inte mjukt. Det är det som gör att förändringen fastnar.
   - EN: We build for the people who will use, run, and live with what we deliver.
     That is not soft. It is what makes change stick.
3. **Mätbara resultat / Outcomes you can measure**
   - SV: I tid, inom budget och synligt i de siffror som betyder något för er
     verksamhet.
   - EN: On time, on budget, and visible in the numbers your business cares about.

Stat grid (number in Spectral light, label in mono caps):

| Number | SV label | EN label |
|---|---|---|
| 30+ | år i teknikbranschen | years in technology |
| 17 | år på Microsoft | years at Microsoft |
| 2010 | byggt på Azure sedan | building on Azure since |
| STHLM | grundat 2025 | est. 2025 |

### 4.5 Selected work (`#work`)

Eyebrow SV: `UTVALDA UPPDRAG` / EN: `SELECTED WORK`
H2 SV: **Resultatet, inte teatern.** / EN: **The outcome, not the theatre.**

**Case 1**
- Meta SV: `AI · R&D · 2024 till 2025` / EN: `AI · R&D · 2024 to 2025`
- Title SV: AI som accelerator i R&D / EN: AI as an accelerator in R&D
- SV: Ledde införandet av AI i ett R&D-team som utvecklar både hårdvara och mjukvara.
  Fokus på kvalitet, snabbare arbetsflöden och innovation, i nära samarbete med
  ledningsgruppen för att koppla varje initiativ till strategin.
- EN: Led the adoption of AI in an R&D team building both hardware and software.
  Focused on quality, faster workflows, and innovation, working directly with the
  executive team to tie every initiative to strategy.
- Roster SV: Konfidentiell kund · hårdvara och mjukvara
- Roster EN: Confidential client · hardware and software

**Case 2**
- Meta SV: `Programledning · 2018 till 2022` / EN: `Program management · 2018 to 2022`
- Title SV: Leverans över team, i global skala / EN: Cross-team delivery at global scale
- SV: Drev program- och projektledning tillsammans med några av Microsofts största
  kunder. Kravarbete, tydligt scope och riskhantering över många utvecklingsteam,
  med leverans i förutsägbar takt.
- EN: Drove program and project delivery with some of Microsoft's largest customers.
  Requirements, scope clarity, and risk management across many development teams,
  delivered at a predictable cadence.
- Roster: Microsoft, Siemens, Procter & Gamble, Equinor, Vestas

**Case 3**
- Meta SV: `Azure · 2010 till idag` / EN: `Azure · 2010 to today`
- Title SV: Enterprise-moln på Azure, sedan dag ett / EN: Enterprise cloud on Azure,
  since day one
- SV: Med Azure sedan lanseringen 2010: först som evangelist för tidiga användare,
  senare som arkitekt för komplexa enterprise-laster. Ledde globala
  rådgivningsprogram med säkra, skalbara lösningar enligt Microsofts egna
  ingenjörsstandarder.
- EN: On Azure since its 2010 launch: first evangelising the platform for early
  adopters, later architecting complex enterprise workloads. Led global advisory
  programmes delivering secure, scalable solutions to Microsoft's own engineering
  standards.
- Roster: Microsoft, IO Interactive, Kiloo, E.ON, Shell, BP

**Case 4**
- Meta SV: `DevOps · Kultur · 2023 till 2024` / EN: `DevOps · Culture · 2023 to 2024`
- Title SV: DevOps-transformation där IT och utveckling möts / EN: A DevOps
  transformation where IT and development meet
- SV: Byggde en gemensam DevOps-kultur mellan IT och utveckling. Kombinerade
  ledarskap och tekniskt djup för att förbättra utvecklarupplevelsen, förenkla
  arbetsflöden och stötta verksamhetens mål.
- EN: Built a shared DevOps culture between IT and development. Combined leadership
  and technical depth to improve developer experience, streamline workflows, and
  support the organisation's goals.
- Roster SV: Konfidentiell kund · industri / EN: Confidential client · industrial

Footnote (mono, small):
- SV: Uppdragen spänner över Kristofers karriär, 2010 till idag.
- EN: Engagements span Kristofer's career, 2010 to today.

### 4.6 Speaking (`#speaking`)

Eyebrow SV: `FÖREDRAG OCH WORKSHOPPAR` / EN: `SPEAKING AND WORKSHOPS`
H2 SV: **Vi föreläser också.** / EN: **We also speak.**
- SV: Keynotes och praktiska AI-workshoppar som får team att vilja bygga. Från
  inspiration för hela organisationen till hands-on-pass för utvecklingsteam, en
  halvdag eller en heldag.
- EN: Keynotes and hands-on AI workshops that leave teams eager to build. From
  inspiration for the whole organisation to hands-on sessions for engineering teams,
  half day or full day.
- CTA ghost SV: `Boka ett föredrag` → mailto:kristofer@mklab.se?subject=Föredrag
- CTA ghost EN: `Book a talk` → mailto:kristofer@mklab.se?subject=Speaking

### 4.7 About (`#about`)

Eyebrow SV: `OM MKLAB` / EN: `ABOUT MKLAB`
H2 SV: **Jag heter Kristofer.** / EN: **I'm Kristofer.**

- SV P1: Jag har arbetat i teknikbranschen i tre decennier, varav sjutton år på
  Microsoft, där jag ledde storskaliga AI- och molnprogram för några av världens
  största organisationer. Att hålla mig längst fram i teknikutvecklingen är inte ett
  jobbkrav för mig. Det är det roligaste jag vet.
- SV P2: Jag har alltid velat leda så att människor vill följa, inte för att de måste
  utan för att det känns rätt. Jag är tydlig, stöttande och pedagogisk, och få saker
  slår ögonblicket när polletten trillar ner hos någon annan.
- SV P3: Samtidigt håller jag mig nära själva arbetet. Jag trivs i
  arkitekturdiskussioner, i plattformsarbete och sida vid sida med utvecklare. Men
  teknik handlar om människor. Vi är människor först, och det är oftast den insikten
  som skiljer en bra lösning från en riktigt bra.
- EN P1: I have spent three decades in technology, seventeen of them at Microsoft,
  leading large-scale AI and cloud programs for some of the world's largest
  organisations. Staying at the front of the technology curve is not a job
  requirement for me. It is the most fun I know.
- EN P2: I have always wanted to lead in a way that makes people want to follow, not
  because they have to but because it feels right. I am clear, supportive, and
  pedagogic, and few things beat the moment the lightbulb switches on for someone
  else.
- EN P3: At the same time I stay close to the work itself. I am at home in
  architecture discussions, in platform work, and side by side with engineers. But
  technology is about people. We are humans first, and that insight is usually what
  separates a good solution from a great one.

Portrait card: existing `assets/images/headshots/kristofer-square.jpg`.
Caption (mono): `Kristofer Liljeblad · Grundare` / `Kristofer Liljeblad · Founder`

Highlights (mono list):
- SV: 30 år av levererad mjukvara · 17 år på Microsoft · Från styrelserum till kodbas
  · Svenska och engelska · Stockholm, kunder globalt
- EN: 30 years shipping software · 17 years at Microsoft · Boardroom to codebase ·
  Swedish and English · Stockholm based, global clients

### 4.8 Contact (`#contact`)

Eyebrow SV: `VI KAN HJÄLPA` / EN: `WE CAN HELP`
H2 SV: **Berätta vad ni står inför.** / EN: **Tell us what you're facing.**
- SV: Varje förfrågan läses av en senior person: samma person som sedan gör jobbet.
  Vi svarar inom två arbetsdagar.
- EN: Every enquiry is read by a senior person: the same one who will do the work.
  We reply within two business days.
- Primary (glow): `kristofer@mklab.se` → mailto:kristofer@mklab.se
- Ghost: `LinkedIn` → https://www.linkedin.com/in/kristofer-liljeblad/

### 4.9 Footer

- Tagline SV: Erfaret ledarskap för AI- och molntransformation.
- Tagline EN: Senior leadership for AI and cloud transformation.
- Columns: nav anchors; Kontakt/Contact (email, LinkedIn).
- Skyline SVG (inverted, ~0.2 opacity), fine print (mono):
  `© 2026 MKLab AB · Stockholm · grundat 2025` / `© 2026 MKLab AB · Stockholm · est. 2025`
  (year via existing `data-current-year` mechanism)

### 4.10 404 and T-banan pages

- 404: existing copy kept, restyled (DS heading, one primary button "Take me home").
- T-banan (both languages): all content and permalinks unchanged; classes swapped to
  DS equivalents.

## 5. Technical implementation

### 5.1 CSS

- Copy `design-system/tokens/*.css` verbatim to `assets/css/tokens/` (6 files).
  `design-system/` stays the source of truth; the copies are not edited.
- New `assets/css/site.css` (replaces the old one entirely):
  - `@import` the six token files (fonts first).
  - Base: reset-ish body defaults (`--surface-base`, `--text-primary`,
    `--font-sans`), `::selection` ember-quiet, focus-visible ring `--focus-ring`.
  - Components (ported by hand from the DS jsx styles):
    `.mk-nav`, `.mk-btn` + `--primary/--ghost/--outline` (+ sizes), `.mk-card`
    (+ `--interactive` hover lift), `.mk-eyebrow` (from tokens), `.mk-stats`,
    `.mk-case`, `.mk-section` spacing (`--gutter-section`), `.mk-hero` (photo +
    scrim variant and flat + ember radial fallback variant), `.mk-footer`,
    `.mk-highlights`, `.mk-badge`.
  - Responsive: fluid type for H1/H2 (clamp), single-column stacking under 720px,
    nav collapses to logo + switcher + contact button (no hamburger; anchor nav
    hidden on small screens).
- Old styles (`scanlines`, glass cards, streaming text, terminal) deleted.

### 5.2 Templates and data

- `_layouts/default.html`: `<html lang="{{ page.lang | default: 'sv' }}">`, new meta
  (canonical, hreflang pair from `page.alt_lang_path`, `x-default` → `/`), Google
  Fonts (Spectral 300/400/500/600 + italics, Hanken Grotesk 300-700, JetBrains Mono
  400-600), single stylesheet, reveal script inline (small).
- `_includes/site-header.html` / `site-footer.html`: rebuilt per §3/§4, strings from
  `_data/i18n.yml` keyed by `page.lang`.
- `_data/i18n.yml`: `sv:` and `en:` maps: nav items (label + anchor), cta, switcher
  labels, footer strings, skip link.
- `_data/navigation.yml`: replaced by i18n nav data (file removed or emptied).
- `_config.yml`: title/description updated to SV defaults; `lang` defaults per scope
  (root pages `sv`); no new plugins.

### 5.3 Pages

- `index.html`: Swedish page, full new markup. Front matter: `lang: sv`,
  `alt_lang_path: /en/`.
- `en/index.html`: English twin. `lang: en`, `alt_lang_path: /`.
- `_pages/t-banan-*.html`: front matter gains `lang` + `alt_lang_path` (pointing at
  each other); class swap only.
- `_pages/404.md`: class swap.

### 5.4 Assets

- `assets/images/logos/`: add `mklab-white.svg` and `mklab-black.svg` from
  `design-system/assets/logos/`.
- `assets/images/brand/`: add `stockholm-skyline.svg`; add `bar-mood.png` when the
  user has downloaded it manually from claude.ai/design (over the API size cap).
  Until then the hero ships the flat fallback.
- Portrait and favicons unchanged.

### 5.5 JavaScript

Single small inline script in the default layout:
- IntersectionObserver reveal: `.reveal` → `.is-visible`, opacity/translate
  transition on `--ease-out` 380ms, honors `prefers-reduced-motion`, graceful
  no-observer fallback (all visible).
- `data-current-year` injection (kept from current site).
- Nothing else. No React, no Babel, no external scripts except Google Fonts CSS.

### 5.6 Out of scope

- No booking service, no contact form, no analytics changes, no blog.
- No AI coaching section (dropped from the May plan).
- The DS `_ds_bundle.js` / React components are not shipped.
- `design-system/` stays excluded from the Jekyll build.

## 6. Verification

1. Local build: fix the Ruby 4.0 / github-pages bundler failure (try `bundle update`
   or pinning Ruby via rbenv/homebrew ruby@3.x). If genuinely stuck, verify via a
   branch push and GitHub Pages build status instead; do not merge unverified.
2. `JEKYLL_ENV=production bundle exec jekyll build` passes; `bundle exec jekyll doctor` clean.
3. URL contract: `/`, `/en/`, `/apps/t-banan/en/`, `/apps/t-banan/se/`, `/404.html`
   all render. T-banan permalinks byte-identical to before.
4. hreflang: `/` and `/en/` reference each other + x-default; t-banan pair likewise.
5. Copy rules: `grep -R "—"` over built site returns nothing (em-dash ban);
   no "partners", "40+", "MMXIX" fictional claims anywhere.
6. Visual pass in browser (desktop + ~390px mobile): nav sticky + blur, glow on
   primary CTA and focus states, cards lift, stat band, reveal animation, fonts load.
7. Anchor nav works from both languages; SV/EN switcher round-trips.
8. Lighthouse sanity: contrast (text-secondary on ink-950 passes AA at the sizes
   used), no layout shift from font loading (font-display: swap comes from the
   Google Fonts URL in tokens/fonts.css).

## 7. Rollout

- Feature branch `feat/website-overhaul-ds`; commits per implementation-plan task.
- Merge to `main` only after verification (§6) passes; GitHub Pages deploys from
  `main` automatically.
- The May 2026 progress doc stays in the repo for history, superseded by this spec.
