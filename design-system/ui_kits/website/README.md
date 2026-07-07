# MKLab — Website UI kit

The MKLab consulting firm's public site. A recreation composed entirely
from the design-system primitives (`Button`, `Card`, `Input`, etc.).

## Screens / flow
`index.html` is an interactive click-through:

1. **Home** — hero over the bar-mood photograph ("Do you have what it
   takes?"), selected-work grid, the "we scale by saying no" ethos band
   with stat blocks, and a closing access band.
2. **Request access** — click any *Request access* button to enter the
   gated enquiry flow: a "black card" left rail + a form on the right.
3. **Confirmation** — submitting the form shows the "You're on the list"
   state.

## Files
- `Chrome.jsx` — `Nav` (sticky, blurred) + `Footer` (with skyline).
- `Home.jsx` — `Hero`, `Work`, `Ethos`, `AccessBand`.
- `Apply.jsx` — the gated `Apply` access flow + confirmation.
- `index.html` — routes between home and apply.

## Notes
- Icons are Lucide (loaded from CDN).
- Everything reads brand tokens from `../../styles.css`; the dark theme
  is the only theme.
