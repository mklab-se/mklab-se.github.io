# design-sync notes

- 2026-07-07: This repo received a PULL-DOWN of the claude.ai/design project
  "MKLab Design System" (projectId 199e265e-1ff8-47e7-b571-a82a378d1428) into
  `design-system/`. This was NOT a push sync: the repo is a Jekyll static site
  with no component build, so the normal /design-sync converter never ran.
- Deliberately NOT pinning a `projectId` in `.design-sync/config.json`: a pin
  would make a future /design-sync run treat that remote project as a push
  target and risk overwriting the hand-authored design system on claude.ai
  with converter output from this Jekyll repo.
- Skipped on download (app-generated, derivable): `_ds_bundle.js`,
  `_ds_manifest.json`.
- Could NOT be downloaded (larger than the DesignSync get_file 256 KiB cap,
  returned truncated): `assets/brand/bar-mood.png`,
  `uploads/ChatGPT Image Jul 7, 2026 at 09_54_01 PM.png`,
  `uploads/pasted-1783456084993-0.png`. To get these, download them manually
  from the project at https://claude.ai/design (they are the bar-mood
  reference photo; the two uploads are duplicates/sources of it).
- `design-system/` is excluded from the Jekyll build in `_config.yml` so it is
  reference material, not published site content.
- The remote project's `uploads/` directory holds the original source assets
  (logos, skyline, reference photos) that also exist curated under
  `design-system/assets/`.
- 2026-07-08: token CSS comment banners in design-system/tokens/ (and the site
  copies in assets/css/tokens/) had em-dashes replaced with hyphens to satisfy
  the site-wide no-em-dash rule. This is the ONLY divergence from the remote
  claude.ai project; a future re-sync will re-introduce em-dashes unless the
  remote tokens are updated the same way.
