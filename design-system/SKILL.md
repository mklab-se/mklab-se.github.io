---
name: mklab-design
description: Use this skill to generate well-branded interfaces and assets for MKLab, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

MKLab is a modern, senior consulting firm with a monochrome luxury brand:
graphite grays on near-black, a single ember (`#ff4d1c`) accent that carries
a signature glow, editorial serif + grotesque type, and Leica-quiet
restraint. Voice is confident, spare, and welcoming: MKLab is open to
anyone but specialises in the hard problems others pass on ("Bring us the
hard problems. We have what it takes."). Never gatekeep the reader — the
seniority belongs to the firm, offered generously.

Key files:
- `readme.md` — full brand, content, and visual guidelines (start here).
- `styles.css` — link this for all tokens (imports everything under `tokens/`).
- `tokens/` — colors, typography, spacing, effects (the glow), motion.
- `assets/` — MKLab logo (light/dark), Stockholm skyline, reference photo.
- `components/` — React primitives (Button, Card, Input, Dialog, …).
- `ui_kits/website/` — a full interactive site recreation to reference.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc),
copy assets out and create static HTML files for the user to view, linking
`styles.css` and mounting components from `_ds_bundle.js`
(`const { Button } = window.MKLabDesignSystem_199e26`). If working on
production code, copy assets and read the rules here to become an expert in
designing with this brand.

If the user invokes this skill without other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer
who outputs HTML artifacts _or_ production code, depending on the need.
Remember the mantra: less is more. When in doubt, remove.
