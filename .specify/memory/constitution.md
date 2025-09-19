<!--
Sync Impact Report
Version change: (initial draft placeholders) → 1.0.0
Modified principles: All (placeholders replaced with concrete definitions)
Added sections: Operational Constraints & Standards; Content Workflow & Quality Gates
Removed sections: None
Templates requiring updates: 
	- .specify/templates/plan-template.md (version reference) ✅ updated
	- .specify/templates/spec-template.md (no direct constitution coupling) ✅ reviewed
	- .specify/templates/tasks-template.md (no direct constitution coupling) ✅ reviewed
	- .specify/templates/agent-file-template.md (dynamic; no static references) ✅ reviewed
Deferred TODOs: None
-->

# MKLab Website Constitution

## Core Principles

### 1. Brand Consistency & Professional Presentation (NON-NEGOTIABLE)
The website MUST present a consistent MKLab brand across all pages: unified logo usage, color
palette, typography, tone of voice (clear, confident, no jargon bloat), and image style. Any
deviation (new logo variant, color, or visual treatment) requires prior approval and inclusion
in a documented Brand Assets update committed to the repository.
Rationale: Consistency builds trust and distinguishes MKLab's consulting identity.

### 2. Performance & Accessibility First
All pages MUST load core content (above‑the‑fold text + primary image) within 2 seconds on a
standard mobile 4G connection (lab check using `bundle exec jekyll serve` + throttling). Images
MUST be optimized (appropriate dimensions, compressed) and reused where possible. Semantic HTML
structure, proper heading hierarchy, alt text for meaningful images, and sufficient color
contrast (WCAG AA) are REQUIRED. No blocking third‑party scripts without necessity.
Rationale: Fast, accessible content improves credibility and reach.

### 3. Responsive & Mobile-First Layout
All new content MUST be authored and visually verified at three breakpoints: small (<480px),
medium (~768px), and desktop (≥1200px). Content MUST avoid horizontal scrolling on mobile, and
images MUST scale fluidly. Custom CSS additions MUST prefer theme extension via Minimal
Mistakes configuration before raw overrides; any custom snippet >25 lines requires justification
in commit message.
Rationale: Majority of first-time visitors arrive via mobile; responsiveness prevents bounce.

### 4. Content Integrity & Review Cadence
Each page MUST have a clear ownership (default: site maintainer). New or updated service
offerings REQUIRE factual accuracy, no speculative claims, and MUST include a concise excerpt.
A quarterly content review (March, June, September, December) MUST verify: outdated dates, dead
links, service relevance, and alignment with current positioning. Stale pages (>12 months w/o
review) MUST be queued for update or archival.
Rationale: Accurate, current content reflects operational excellence.

### 5. Simplicity & Minimal Surface Area
Prefer configuration and existing theme features over custom code. Avoid introducing JS unless
it delivers material user value (navigation clarity, performance, accessibility). Any new
dependency MUST: (a) be MIT/BSD/Apache licensed, (b) not materially slow build or page load,
and (c) be documented in a Dependencies note (README or dedicated section). Remove unused assets
promptly. Avoid premature optimization; implement only demonstrable needs.
Rationale: A lean static site is cheaper to maintain and harder to break.

## Operational Constraints & Standards

Technology Stack: GitHub Pages + Jekyll with Minimal Mistakes remote theme. Build MUST remain
GitHub Pages compatible (no unsupported plugins). Global assets belong under `assets/` with
descriptive, kebab‑case filenames. Images MUST not exceed required display resolution; use JPEG
for photos, PNG/SVG for logos/graphics. Favicon and manifest assets MUST remain present.

Security & Privacy: No inline secrets. External links to client systems MUST use HTTPS. No
tracking scripts unless explicitly approved; if added, a simple privacy notice MUST be created
and linked in the footer.

SEO & Metadata: Each service and page MUST define `title`, `excerpt` (≤160 chars), and relevant
Open Graph defaults inherited from `_config.yml`. Duplicate excerpts across services are
prohibited.

Localization: Pages with language variants MUST use clear permalinks and consistent directory
structure (e.g., `/apps/t-banan/en/`). Missing translation content MUST not fallback to a 404;
either provide canonical language or hide the link.

Error Handling: Custom `404.md` MUST stay minimal and direct users back to primary navigation.

## Content Workflow & Quality Gates

Authoring Flow:
1. Draft Markdown created or updated.
2. Local preview via `bundle exec jekyll serve` (verify principles 2 & 3 visually).
3. Run link check (manual or tool) for external/internal link validity.
4. Commit message MUST include intent (e.g., `content: update service offering (performance focus)`).
5. Peer or self-review checklist (see below) executed before merge to `main`.

Mandatory Pre-Merge Checklist (must appear in PR description and be checked):
- [ ] Brand consistency upheld (Principle 1)
- [ ] Performance risk assessed (no unoptimized media) (Principle 2)
- [ ] Responsive check at 3 breakpoints (Principle 3)
- [ ] Content factual & reviewed or dated (Principle 4)
- [ ] No unnecessary custom code or assets (Principle 5)
- [ ] Front matter includes title + excerpt
- [ ] Alt text added for new images

Quarterly Review Output: A single PR summarizing findings (outdated pages, improvements applied,
archived content) MUST reference the review month and link to any remediation PRs.

Incident Handling: Production issues (broken layout, 404 spikes, obvious factual error) MUST be
fixed within 24h of detection; create a retro note in PR if root cause was governance violation.

## Governance

Authority: This Constitution governs all website structural, visual, and content standards. It
supersedes ad-hoc preferences and informal practices.

Amendments: Propose via PR modifying this file. PR MUST include: rationale, principle impact,
version bump justification, and (if removing a principle) a mitigation or replacement guidance.

Versioning Policy:
- MAJOR: Remove or fundamentally redefine a principle; introduce incompatible workflow changes.
- MINOR: Add a new principle/section or materially expand a requirement.
- PATCH: Clarifications, wording refinement, typo fixes, non-semantic tightening.

Compliance Reviews: Each quarterly review MUST confirm continued adherence. Violations found
repeat in two consecutive quarters trigger mandatory remediation plan (documented in PR).

Enforcement in PRs: Reviewers MUST block merge if any mandatory checklist item is unchecked.
Exceptions require explicit, temporary waiver note in the PR and MUST be removed within 1 month.

Record Keeping: The Sync Impact Report at the top of this file MUST be updated on every
amendment. Historical versions are preserved via Git history; no separate changelog required.

**Version**: 1.0.0 | **Ratified**: 2025-09-19 | **Last Amended**: 2025-09-19