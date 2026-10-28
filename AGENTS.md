# Repository Guidelines

The MKLab AB website, served at https://mklab.se. A static site built with
[Zola](https://www.getzola.org/) and deployed to GitHub Pages by GitHub Actions. There is no
theme: every page is hand-written HTML on top of a small custom design system (Ember).

## Commands

```bash
brew install zola        # once; single binary, no Ruby or Node toolchain
zola serve               # live-reloading preview at http://127.0.0.1:1111
zola build               # production build into public/ (never edit or commit it)
zola check --skip-external-links   # catch template and link errors
```

Pushing to `main` runs `.github/workflows/pages.yml`, which builds with the Zola version pinned
in `ZOLA_VERSION` and deploys. Keep that pin in step with the version you build with locally.

## Project structure

- `config.toml`: site title, base URL, `extra.email`, default `meta_image`, and the list of quiz
  categories (see below).
- `content/`: one small Markdown file per page holding only TOML front matter: `title`,
  `description`, `path` (the URL), `template`, and an `[extra]` table. The page body is not here.
  `content/_index.md` is the Swedish home page.
- `templates/`: the page bodies and layouts, written in Tera.
  - `base.html`: layout for regular pages (header, footer, hreflang, reveal animations).
  - `talk.html`: layout for particle-animated tech talk decks, including the password gate.
  - `game.html`: layout for the quiz; inlines the whole question bank as JSON.
  - `home.html`, `home-en.html`, `pages/*.html`, `talks/*.html`: one body per page, each
    starting with `{% extends "<layout>.html" %}` and filling `{% block content %}`.
  - `partials/`: site header, footer and favicon tags.
  - `404.html`: the not-found page (it has no content file).
- `data/`: YAML read with `load_data()`.
  - `i18n.yml`: navigation and chrome strings per language (`sv`, `en`).
  - `talks.yml`: the cards on `/talks/` and `/en/talks/`.
  - `quiz/<id>.yml`: one quiz category per file.
  - `ui-text.yml`: legacy, unused by any template.
- `static/`: copied as-is to the site root: `static/assets/` (CSS, JS, images, favicons) and
  `CNAME`.
- `design-system/` and `docs/`: reference material and specs; not published.

## Page front matter

`[extra]` keys the layouts understand:

- `lang`: `"sv"` (default for `base.html` and `game.html`) or `"en"` (default for `talk.html`).
- `alt_lang_path`: URL of the same page in the other language; drives the SV|EN switch and
  hreflang links.
- `homepage`: use the title as-is instead of appending " · MKLab AB".
- `canvas`: particle-scene script for a talk or game, e.g. `/assets/js/talks/mcp.js`.
- `protected` and `password_hash`: show the password gate; the hash is SHA-256 hex of the
  password. The gate is client-side by design (see the comment in `talk.html`).
- `meta_image`, `body_class`, `head_extra`, `hide_header`, `hide_footer`: optional overrides.

## Common tasks

- **New page:** add `content/<name>.md` with `path` and `template`, and the body in
  `templates/pages/<name>.html`. For a bilingual page, add both language versions and point
  their `alt_lang_path` at each other.
- **New tech talk:** `content/talks/<slug>.md` (with `canvas`), `templates/talks/<slug>.html`
  extending `talk.html`, the scenes in `static/assets/js/talks/<slug>.js`, and a card in
  `data/talks.yml`.
- **New quiz category:** add `data/quiz/<id>.yml` and append `<id>` to `quiz_categories` in
  `config.toml`. Templates cannot list a directory, so a file missing from that list is silently
  left out of the game.
- **Navigation or footer text:** edit `data/i18n.yml` for both languages.

## Conventions

- Links and asset URLs are plain root-relative paths (`/assets/css/site.css`).
- Tera autoescapes HTML: output data strings that may contain markup or entities with `| safe`.
- Tera treats `{#` as a comment opener, so avoid that sequence in inline CSS or JS.
- Swedish is the primary language; English pages live under `/en/`.
- Kebab-case file names; two-space indentation in YAML, TOML and templates; wrap prose near 100
  characters.
- No em-dashes anywhere (copy, comments, commit messages).

## Before you push

Run `zola check --skip-external-links` and `zola serve`, click through the pages you touched in
both languages, and watch the browser console for errors. Conventional commits (`feat:`, `fix:`,
`chore:`), subject under 72 characters.
