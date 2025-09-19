# MKLab Website - AI Assistant Instructions

## Project Overview
This is a Jekyll-based static website for MKLab, a consulting company specializing in leadership, technical program management, and software engineering. The site uses the **Minimal Mistakes** remote theme and deploys to GitHub Pages.

## Architecture & Key Components

### Theme & Configuration
- **Remote theme**: `mmistakes/minimal-mistakes` (configured in `_config.yml`)
- **Custom collections**: `_services/` directory contains service offering pages
- **Navigation**: Defined in `_data/navigation.yml` with main menu structure
- **Site identity**: Logo at `/assets/images/logo.png`, author info in `_config.yml`

### Content Structure
- **Home page**: `index.html` uses `layout: home` to display recent posts
- **Services collection**: Individual service pages in `_services/` with custom permalinks (`/:collection/:path/`)
- **Static pages**: Contact, About, Services overview in `_pages/`
- **Blog posts**: Standard Jekyll posts in `_posts/` with categories and dates

### Development Workflow
```bash
# Local development (requires Ruby/Jekyll)
bundle exec jekyll serve

# Dependencies managed via Gemfile
bundle install
```

## Content Conventions

### Service Pages Pattern
Service pages follow this frontmatter structure:
```yaml
---
title: "Service Name"
excerpt: "Brief description for listings"
header:
    image: /assets/images/service-name.jpg
    teaser: /assets/images/service-name.jpg
---
```

### Posts & Pages
- Use categories array format: `categories: [Category Name]`
- Include proper date formatting: `date: YYYY-MM-DD`
- Author profile enabled by default for posts and pages

### Assets Organization
- **Images**: Store in `/assets/images/` with descriptive names
- **Custom CSS/JS**: Avoid unless necessary (theme provides comprehensive styling)

## Key Configuration Points

### Collections Setup
Services are configured as a custom collection with:
- Output enabled for individual pages
- Custom permalink structure
- Specific layout defaults (no author profile, no sharing)

### GitHub Pages Compatibility
- Uses `github-pages` gem group for deployment
- Remote theme instead of local theme installation
- Includes `jekyll-include-cache` for performance

## Common Tasks

### Adding New Services
1. Create `.md` file in `_services/` directory
2. Use standard service frontmatter pattern
3. Add corresponding image to `/assets/images/`

### Content Updates
- **Navigation**: Edit `_data/navigation.yml`
- **Author info**: Update author section in `_config.yml`
- **Site metadata**: Modify site settings in `_config.yml`

### Theme Customization
- Override layouts by creating files in `_layouts/`
- Custom includes go in `_includes/`
- SCSS customizations in `_sass/`

## Important Notes
- Site builds automatically on push to main branch via GitHub Pages
- Theme documentation: https://mmistakes.github.io/minimal-mistakes/
- Local preview recommended before pushing changes
- Image optimization important for performance (site uses many header images)