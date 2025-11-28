# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MKLab website is a Jekyll-based static site for a consulting company specializing in technical leadership, program management, and software engineering. The site is deployed to GitHub Pages and features a custom design with modern CSS (no remote theme dependency despite historical references in docs).

## Development Commands

```bash
# Install dependencies after cloning
bundle install

# Start local development server with live reload
bundle exec jekyll serve --livereload
# Site available at: http://127.0.0.1:4000

# Production build (for deployment testing)
JEKYLL_ENV=production bundle exec jekyll build

# Validate configuration and catch issues
bundle exec jekyll doctor
```

## Architecture & Structure

### Core Layout System

The site uses a custom layout architecture (not Minimal Mistakes theme):

- `_layouts/default.html` - Base layout with custom HTML structure, meta tags, and JavaScript for reveal animations
- `_includes/site-header.html` - Top navigation bar
- `_includes/site-footer.html` - Footer component
- `_includes/head/` - Additional head-specific includes

### Content Organization

**Collections** (defined in `_config.yml`):
- `_pages/` - Static pages (404, specialized content like t-banan)
- `_services/` - Service offering pages (currently using custom HTML in index.html rather than separate files)

**Posts**: Standard Jekyll posts would go in `_posts/` (not currently used)

### Navigation & Data

- `_data/navigation.yml` - Main menu structure (Home, About, Contact, Services)
- `_data/ui-text.yml` - Large localization/UI text file (112KB+) for internationalization support

### Styling Architecture

**Custom CSS approach** - Site does NOT use Minimal Mistakes theme despite historical documentation:

- `assets/css/site.css` - Main compiled CSS file (8KB, custom styles)
- `_sass/minimal-mistakes/` - Empty directory (legacy, unused)
- All styling is custom-built, includes:
  - Scanlines effect on hero section
  - Glass-card design pattern
  - Reveal animations (IntersectionObserver-based)
  - Terminal-style UI elements
  - Grid layouts for services and work sections

### Content Sections in index.html

The homepage (`index.html`) contains all major content sections:
1. Hero section - Animated intro with terminal aesthetic
2. Services - 5 service cards (technical leadership, program management, cloud computing, architecture/dev, DevOps)
3. Recent work - 6 work examples with customer references
4. About - Split layout with bio and portrait
5. Contact - Email and LinkedIn links

## Development Conventions

### File Naming
- Markdown files: kebab-case (e.g., `t-banan-en.md`)
- Assets/images: kebab-case (e.g., `kristofer-portrait.jpg`)
- Liquid variables: snake_case

### Content Formatting
- Markdown: Kramdown syntax with GFM input
- Line wrapping: ~100 characters for prose (improves diff readability)
- Indentation: 2 spaces for YAML and Liquid
- Comments: Use `{% comment %}` blocks for Liquid, not inline notes

### Front Matter Structure

Standard page front matter:
```yaml
---
layout: default
title: Page Title
description: Meta description for SEO
---
```

### Asset Organization
- Images: `/assets/images/` with subdirectories:
  - `/logos/` - Brand logos (MKLab-0256-white.png, etc.)
  - `/headshots/` - Portrait images (kristofer-square.jpg)
- Favicons: Root `/assets/` directory
- CSS: `/assets/css/site.css` (compiled/direct)

## Important Configuration Details

### Collections Setup (_config.yml)
```yaml
collections:
  pages:
    output: true
  services:
    output: true
```

Default layouts are set per collection path via `defaults` scope.

### Excluded Files
The site excludes from build: `tmp/`, `vendor/`, `Gemfile*`, `README.md`, `AGENTS.md`

### Plugins
- `jekyll-sitemap` - Auto-generates sitemap.xml
- `jekyll-feed` - Auto-generates RSS feed

### Permalink Structure
Default: `/:title/` (defined in _config.yml)

## GitHub Pages Deployment

- **Automatic**: Pushes to `main` branch trigger deployment
- **Gem group**: Uses `github-pages` gem for compatibility
- **Build location**: `_site/` directory (never edit or commit)

## Testing & Quality Checks

Before committing changes:

1. Run local server and verify pages render without Liquid errors
2. Check browser console for JavaScript errors
3. For navigation changes: Click through all header/footer links
4. For data file updates: Verify `_data/navigation.yml` and `ui-text.yml` load correctly
5. Production build test: `JEKYLL_ENV=production bundle exec jekyll build`

## Commit Message Format

Follow conventional commit style from repository history:
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks
- Subject line: <72 characters
- Expand context in commit body when needed

## Key Technical Details

### Custom JavaScript Features
The default layout includes:
- Dynamic year injection (`data-current-year` attribute)
- Reveal animations using IntersectionObserver
- Graceful degradation for browsers without IntersectionObserver support

### CSS Class Patterns
- `.glass-card` - Primary card component style
- `.reveal` / `.is-visible` - Animation trigger classes
- `.scanlines` - Visual effect on hero section
- `.site-shell` - Content container/wrapper
- `.hero__*` - Hero section BEM-style modifiers

### Typography
External fonts loaded from Google Fonts:
- Inter (300, 400, 600, 800) - Body text
- JetBrains Mono (400, 600) - Monospace/terminal text

## Site Identity

- **Company**: MKLab AB
- **Owner**: Kristofer Liljeblad
- **Contact**: kristofer@mklab.se
- **URL**: https://mklab.se
- **Location**: Stockholm, Sweden
- **Timezone**: Europe/Stockholm
