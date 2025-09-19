# Repository Guidelines

## Project Structure & Module Organization
This site uses Jekyll with the Minimal Mistakes remote theme. Publish static pages in `_pages/`, time-ordered updates in `_posts/`, and service writeups in `_services/`; create new Markdown files in kebab-case with YAML front matter. Shared Liquid snippets go in `_includes/`, page skeletons in `_layouts/`, while `_data/` holds navigation and UI copy. Styling overrides live in `_sass/`, and images or icons belong under `assets/`. The `_site/` directory is generated output—never edit or commit its contents.

## Build, Test, and Development Commands
Install Ruby gems with `bundle install` after cloning or updating the `Gemfile`. Run `bundle exec jekyll serve --livereload` to preview the site at `http://127.0.0.1:4000`. Produce a production build with `JEKYLL_ENV=production bundle exec jekyll build`, which refreshes `_site/` for deployment. Use `bundle exec jekyll doctor` before pushing to catch configuration or front matter issues.

## Coding Style & Naming Conventions
Write Markdown with Kramdown syntax, wrapping prose near 100 characters to keep diffs readable. Indent YAML front matter and Liquid logic by two spaces, and prefer `{% comment %}` blocks instead of inline notes. Name Liquid variables with snake_case, keep Markdown and asset filenames in kebab-case (e.g., `_pages/t-banan-en.md`, `assets/images/kristofer-portrait.jpg`), and place reusable data in `_data/*.yml`. Extend styling via new partials in `_sass/` rather than modifying theme files.

## Testing Guidelines
Before submitting changes, run `bundle exec jekyll serve` and verify that modified pages render without Liquid errors or console warnings. When altering navigation or localization strings, click through header, footer, and service links to confirm `_data/navigation.yml` and `ui-text.yml` changes load as expected. Note any manual QA steps or outstanding checks in the pull request so reviewers can reproduce them.

## Commit & Pull Request Guidelines
Follow the conventional commit style already in history (`feat:`, `fix:`, `chore:`) and keep subject lines under 72 characters, expanding in the body if context is needed. Group related edits per commit, especially when touching content and styling together. Pull requests should include a clear summary, reference to the related issue or request, and screenshots or screen recordings for UI-facing updates, plus confirmation that the production build command succeeds.
