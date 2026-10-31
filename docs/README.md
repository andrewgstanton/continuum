# Continuum Website Redesign — Change Log

**Scope:** Stage 1 V1–V4 and Phase 2 V1–V4 (October 2026)  
**Current baseline:** Phase 2 V4, based on the approved Stage 1 V4 homepage  
**Website source:** `docs/` (GitHub Pages)

This README records the incremental redesign of the main Continuum website. The updates retain existing site functionality and links unless otherwise stated. The separate Stories repository and the Memorials & Milestones service were not redesigned.

## Stage 1 — Homepage

### V1 — Homepage redesign
- Rebuilt `docs/index.html` with a warm ivory, white, and muted-gold design inspired by Continuum Memorials & Milestones.
- Introduced the Georgia serif headline **“Your digital life belongs to you.”**
- Added a centered hero, infinity symbol/CONTINUUM branding, clear introduction, and sections highlighting writing and publishing, privacy, identity tools, and Memorials & Milestones.
- Kept prominent **Download for Mac** and **Download for Windows** buttons, preserving the existing download destinations.
- Added grouped homepage navigation, responsive layout, and updated styles in `docs/styles/style.css`.
- Preserved the original video link and existing destinations.

### V2 — Navigation reorganization
- Refined the homepage navigation to:
  **Home · About ▾ · Explore ▾ · Downloads · Learn ▾ · Pricing**
- **About:** Overview, Why Continuum?, Who Continuum Is For.
- **Explore:** Memorials & Milestones, Tools, Demos, Stories (external).
- **Downloads:** Direct link to the downloads page.
- **Learn:** FAQs, Books, Open Source, Release Notes.
- **Pricing:** Direct link to pricing.
- Changed only `docs/index.html` relative to Stage 1 V1.

### V3 — First hero-size refinement
- Reduced maximum desktop hero headline size from **6.4rem to 5.6rem**.
- Reduced hero top padding from **108px to 78px** and tightened headline and lower-section spacing.
- Adjusted mobile hero spacing.
- Retained V2 copy, navigation, and URLs.

### V4 — Approved homepage proportions
- Reduced maximum desktop hero headline size from **5.6rem to 4.95rem**.
- Reduced hero top padding from **78px to 60px**.
- Tightened spacing above/below the headline, branding, buttons, and supporting links.
- Slightly reduced mobile hero spacing.
- Only `docs/styles/style.css` changed from Stage 1 V3, apart from the stage README.
- **This is the approved homepage design carried into Phase 2.**

## Phase 2 — Main-site page consistency

### V1 — Interior pages and pricing
- Applied the V4 design language and six-item navigation to the main informational pages:
  - `docs/overview.html`
  - `docs/why_continuum.html`
  - `docs/use_cases.html`
  - `docs/tools.html`
  - `docs/demos.html`
  - `docs/downloads.html`
  - `docs/faqs.html`
  - `docs/books/index.html`
  - `docs/open_source.html`
  - `docs/release_notes.html`
  - `docs/pricing.html`
- Widened content panels and standardized ivory backgrounds, typography, spacing, and gold-accented controls.
- Changed the **patron contribution from $250 to $210** on `docs/pricing.html`.
- Preserved existing informational content, links, download destinations, and Memorials & Milestones files.
- Kept Open Source statements factual: publishing the complete private application repository remains a separate, pending decision.

### V2 — Header and wordmark styling fix
- Corrected shared CSS so interior-page headers display the **gold infinity symbol and styled CONTINUUM wordmark**, rather than default blue underlined links.
- Applied consistent navigation-link styling across interior pages.
- Only `docs/styles/style.css` changed from Phase 2 V1, apart from the README.

### V3 — Footer consistency
- Standardized the footer on the 11 main informational pages to match the homepage.
- Copyright notice: **© 2025–2026 Andrew G. Stanton · Continuum**
- Footer links: **Pricing & Support · Release Notes · Stories · License**.
- Moved interior-page footers outside their content panels and removed repetitive footer statements.
- Left the Memorials & Milestones footer untouched.
- No changes to pricing, homepage hero, or navigation in this version.

### V4 — Manual Nostr Auth Demo page
- Updated `docs/demos/auth_demo.html` to use the same header, six-item navigation, and footer as the rest of the main site.
- Applied limited form styling in `docs/styles/style.css` for consistent inputs and buttons.
- Preserved the authentication JavaScript, form IDs, API endpoints, and workflow; live API behavior should be tested separately.
- Left Memorials & Milestones unchanged.

## Current navigation

| Item | Destination / submenu |
| --- | --- |
| Home | Homepage |
| About | Overview; Why Continuum?; Who Continuum Is For |
| Explore | Memorials & Milestones; Tools; Demos; Stories (external) |
| Downloads | Downloads page |
| Learn | FAQs; Books; Open Source; Release Notes |
| Pricing | Pricing page |

## Scope and deployment notes

- All website redesign changes are confined to **`docs/`**.
- **Stories** (`stories.mycontinuum.xyz`) is a separate repository and was not modified.
- **Memorials & Milestones** remains visually and functionally separate; its files and footer were not changed by this redesign.
- Existing software download destinations and site links were retained.
- The $210 amount is a **patron contribution**, not a newly implemented paid-release checkout.
- The decision to publish all of `continuum-pro` as open source is **not implemented** by this website redesign.
- The Phase 2 V4 archive contains the complete `docs/` tree; deploy by replacing the corresponding `docs/` files in the website repository, after local review.
- Test the manual authentication demo against its live API before deployment.

## Files of particular interest

- `docs/index.html` — approved Stage 1 V4 homepage.
- `docs/styles/style.css` — shared homepage/interior styling and Phase 2 V2/V4 fixes.
- `docs/pricing.html` — $210 patron contribution.
- `docs/demos/auth_demo.html` — Phase 2 V4 header/footer and form presentation.
- Main informational pages listed in Phase 2 V1 — common navigation and page presentation.

This is a consolidated record of the changes documented in the Stage 1 archives and the supplied Phase 2 README through V4.
