# Photo Portfolio Wall, design spec

Date: 2026-07-11
Status: approved (brainstormed with visual companion; frame, hang, sections, particles and
lightbox each picked by Kristofer)

## Purpose

Turn the `/photo/` landing page into a portfolio that sells the photography: a gallery wall
of 14 framed photographs, split into commissioned work and personal fine art street work.
The page must impress potential photo clients while staying inside the Ember design system
and the Living Canvas motion language.

## Decisions (user-selected)

1. **Frame treatment: gallery ink + ember fillet.** Near-black lacquered moulding with light
   catching the top and left edges, a 2px ember gradient fillet between frame and mat, warm
   white passepartout with a bevel-cut opening shadow, and a drop shadow lifting the frame
   off the wall. Frames must read as physical objects, not colored borders.
2. **Hang: curated rows with level tops.** Photos are uncropped at native aspect ratio,
   arranged in hand-tuned rows of equal height. No masonry, no uniform cropping.
3. **Sections: two named walls, commissioned first.**
   - "Beställt uppdrag": the six Carina photos (personal and commercial branding
     commission). First name only, no surname, until consent is confirmed.
   - "Egna projekt": the eight street photographs, sold as prints.
   One short factual sentence per section, no per-photo captions, no slogan copy,
   no em-dashes.
4. **Lightbox: simple.** Click opens the photo near full-screen, still framed and matted,
   over a dimmed page. Esc, click, or a close button dismisses. Scroll lock while open,
   `aria-modal` semantics, fade respects `prefers-reduced-motion`.
5. **Particles: bokeh calm.** The existing `photo` scene keeps bokeh and dust but drops the
   aperture-iris ring. Bokeh spreads across the viewport with a warm ember tint. Alphas stay
   whisper-quiet; particles must never compete with the photographs.

## Page structure (`_pages/photo.html`, Swedish, URL `/photo/` unchanged)

1. Existing opener (eyebrow, title, lead) stays.
2. Commissioned wall: heading, one sentence, two rows of three (portrait-landscape-portrait,
   then landscape-portrait-landscape).
3. Personal wall: heading, one sentence, rows of 3, 3, 2 with per-row height tuning via
   `clamp()` so portrait-heavy rows do not tower.
4. Existing "Uppdrag vi tar" / "Boka eller fråga" cards move below the walls; footnote link
   back to the consulting site stays last.
5. Frames use the site's `reveal` animation. Mobile collapses rows to a single column with
   proportionally smaller mat and moulding.

## Assets

- Photos move from the `portfolio/` staging folder to `assets/images/portfolio/`.
- Resize to max 1600px long edge (sips), JPEG quality that keeps files roughly under 300KB.
- `carina-01.jpg` to `carina-06.jpg` keep their names; the eight street photos are renamed
  `street-01.jpg` to `street-08.jpg`.
- All `<img>` elements get explicit `width`/`height` and `loading="lazy"` below the fold.

## Implementation surfaces

- `_pages/photo.html`: sections, wall markup, lightbox markup and page-local script include.
- `assets/css/site.css`: frame construction, row layout, lightbox, responsive rules.
- `assets/js/lightbox.js`: new, dependency-free.
- `assets/js/canvas.js`: `layouts.photo` and the photo branch of the scene renderer.

## Verification

Build with Ruby 3.1.6 (`chruby ruby-3.1.6`), serve `_site`, drive with Playwright at
1440x900 and 390x844: capture console errors and page errors, exercise the lightbox
(open, Esc, click-outside, close button), screenshot both walls and review the screenshots
visually. Production build must pass before commit. Deployment is a push to `main`.
