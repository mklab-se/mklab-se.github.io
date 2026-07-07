---
title: Website refresh, brainstorming progress
date: 2026-05-20
status: in_progress
resume_from: section 03 review open questions
---

# MKLab website refresh, brainstorming progress

Brainstorming session started 2026-05-19, paused 2026-05-20 evening. Visual companion mockups
live in `.superpowers/brainstorm/23190-1779226850/content/` (gitignored, but persisted on disk).

## Goal

Drastic refresh of mklab.se. Refine messaging, replace the current Gruvbox / glassmorphism /
terminal aesthetic with a more modern editorial direction. Only the logo carries over.

## Audience and positioning

- **Primary**: founders and CTOs at scale-ups (B), then hiring managers / VPs (A). Both
  looking for a hands-on senior tech leader / consultant / contractor.
- **Growth side**: event organisers, training buyers, individuals and teams looking for
  speaking, workshops and personal AI coaching (the "AI personal trainer" framing).
- Kristofer wants to be known as a manager, thought leader, and technical leader. While
  holding primary consulting contracts, he wants the site to actively recruit the
  smaller speaker/workshop/coaching engagements in parallel, not bury them.

## Decisions locked in this session

1. **Visual direction**: A, Editorial Calm.
   - Background `#F2EDDF` (warm cream)
   - Ink `#141413`
   - Single accent: terracotta `#B04A1E`
   - Type: `Fraunces` (serif headlines, italic for emphasis), `Inter Tight` (body),
     `JetBrains Mono` (kickers, labels, meta)
   - Subtle radial warm glow in bottom-right, thin rules, restrained.
   - Selected over D (Dark Aurora). User said: "Let's go with A, Editorial Calm for a
     drastic change."

2. **Headline**: V2, leadership-forward.
   - English: *"Tech leadership for teams that actually ship."*
     (italic emphasis on "that actually ship")
   - Swedish: *"Tekniskt ledarskap för team som faktiskt levererar."*
     (italic emphasis on "som faktiskt levererar")
   - Lead (EN): "I lead engineering organisations, run programs across teams, and stay
     close to the code. Three decades of experience. Seventeen at Microsoft. Available
     for interim leadership, advisory, AI workshops, and keynotes."
   - Lead (SV): "Jag leder utvecklingsorganisationer, driver program tvärs över team,
     och håller mig nära koden. Tre decennier av erfarenhet. Sjutton år på Microsoft.
     Tillgänglig för interimsledarskap, rådgivning, AI-workshops och keynotes."

3. **Page architecture**: 1, Editorial flow + early router.
   - 01 Hero, 02 Available for router (3 lanes), 03 What I do (prose), 04 Selected
     engagements (4 cases), 05 Speaking and workshops, 06 AI coaching, 07 About,
     08 Contact.

4. **Bilingual**: Swedish default at `/`, English at `/en/`.
   - SV / EN switcher top-right in header, no auto-redirect.
   - Implementation plan: twin tree (root + `/en/`), `_data/i18n.yml` for shared chrome,
     each page sets `lang:` and `alt_lang_path:` front matter, `hreflang` link tags,
     no third-party Jekyll plugins (GitHub Pages safe).

5. **Hero CTAs**: "Anlita mig" / "Boka ett föredrag eller en workshop"
   (EN: "Hire me" / "Book a talk or workshop").

6. **Nav**: `Uppdrag / Föredrag / Coaching / Om / Kontakt`
   (EN: `Work / Speaking / Coaching / About / Contact`).

7. **MKLab AB**: founded 2025-02-28, registered with Bolagsverket 2025-03-17.
   Hero kicker reads *"MKLab AB · Stockholm · grundat 2025"* / *"est. 2025"*.
   Case studies span Kristofer's career (2010 to 2025), not MKLab AB only.

8. **Hard rule**: NO em-dashes anywhere in this project (and any project for this user).
   Use comma, period, colon, or hyphen. Saved as feedback memory.

## Sections drafted and approved

### Section 01, Hero (approved)
- Logo + minimal nav + SV/EN switcher
- Kicker, big serif headline (V2), lead, dual CTAs
- Mockup: `section-router-sv.html` (current state, em-dashes scrubbed)

### Section 02, Available for router (approved)
- Three lanes side by side, ~equal weight:
  - **a · Ledarskap**: interim VP/Director of Engineering, technical program management,
    architecture and DevOps advisory
  - **b · Föredrag**: keynotes (45 to 60 min), conference/meetup talks, internal sessions
  - **c · Coaching**: 1:1 AI coaching monthly, team AI workshops (half or full day),
    "AI-tränare" framing
- Status badge: "Bokar uppdrag för hösten 2026 och framåt"
- Mockup: `section-router-sv.html`

## Sections drafted, awaiting review

### Section 03, "Vad jag gör", prose
Left column: title "Hands-on ledarskap, nära beslut och nära koden." + pull quote
*"Modern AI är ett verktyg, inte en strategi. Den lyfter team som redan vet hur man
levererar."*

Right column: 3 paragraphs covering Kristofer's positioning (leader + code), what
engagements work best, and a pragmatic stance on AI.

Mockup: `section-prose-cases.html`

### Section 04, Selected engagements, 4 cases
Magazine-style numbered layout: number · domain/year · title · story · client roster.

1. **Tvärfunktionell leverans i global skala** (Teknisk programledning, 2018 till 2022)
   Microsoft, Siemens, Procter & Gamble, Equinor, Vestas
2. **DevOps-transformation där IT och utveckling möts** (DevOps · Kultur, 2023 till 2024)
   Konfidentiell kund · industri (placeholder)
3. **AI som accelerator i R&D, bortom hypen** (AI · R&D, 2024 till 2025)
   Konfidentiell kund · hårdvara och mjukvara (placeholder)
4. **Enterprise cloud-arkitektur på Azure, sedan dag ett** (Arkitektur · Azure,
   2010 till pågående)
   Microsoft, IO Interactive, Kiloo, E.ON, Shell, BP

Mockup: `section-prose-cases.html`

## Open questions to resolve next session

1. Section 03 pull quote: *"Modern AI är ett verktyg, inte en strategi. Den lyfter team
   som redan vet hur man levererar."* Keep, edit, or remove?
2. Section 04 year ranges accurate, or adjust?
3. Section 04 cases 2 and 3: anonymise differently, or name the clients?
4. Swap one of the 4 cases for *"Build teams that ship"* (people/leadership, Microsoft
   hiring, raising the bar)?
5. Section 03 title *"Hands-on ledarskap, nära beslut och nära koden."* land, or change?

## Sections still to design

- **05 Speaking and workshops**: dedicated section. Need to capture signature talk topics
  (currently only "AI in practice", "engineering leadership", "shipping at scale"),
  workshop formats (half-day, full-day, multi-day), past venues, booking CTA.
- **06 AI coaching**: smaller distinct section. Need to define what "AI personal trainer"
  actually means in concrete terms (cadence, pricing tier, individual vs team, format).
- **07 About**: profile-style. Photo + voice. **Use the `mklab` skill for canonical
  company facts (org number, address, bank, billing)** before drafting copy here.
- **08 Contact**: email + LinkedIn, direct.

Also still to write:
- Footer (copyright, fine print, links to legal pages?)
- Speaking and Coaching sub-pages (if linked from router)

## How to resume

1. **Restart the visual companion server** so the saved mockups are viewable:
   ```bash
   /Users/kristofer/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/brainstorming/scripts/start-server.sh \
     --project-dir /Users/kristofer/repos/mklab-se/mklab-se.github.io
   ```
2. Open the URL printed by the server. The server serves the newest file in the content
   directory, so `touch` whichever screen you want on top.
3. Pick up at the open questions above.

## Files of interest

- Mockups: `.superpowers/brainstorm/23190-1779226850/content/*.html`
  (directions.html, headlines.html, architecture.html, section-router.html,
  section-router-sv.html, section-prose-cases.html)
- Logo assets and portrait copied into the same content dir for inline reference.
- Memory files:
  - `site_positioning.md`
  - `site_bilingual.md`
  - `site_founding_date.md`
  - `feedback_no_em_dashes.md`

## Final deliverables (when done with all sections)

- `docs/superpowers/specs/2026-05-DD-website-refresh-design.md`, the locked design spec
- Implementation plan via `superpowers:writing-plans`
- Implementation under a feature branch, twin tree for SV and EN
