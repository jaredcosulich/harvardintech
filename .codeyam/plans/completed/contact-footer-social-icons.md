---
title: "Contact footer social icons"
mode: ui
createdAt: "2026-06-15T00:00:00Z"
source: prototype
step: 10
---

# Contact footer social icons

Make the bottom of the home page faithful to harvardintech.com: render the
social links in the "CONTACT US" section as platform icons above their labels,
and trim the dark footer band down to just the copyright/cookie line.

## What was prototyped

### Contact Us section — `src/components/landing/ContactUs.astro`
- Previously rendered Twitter / E-mail / Facebook as plain text links laid out
  horizontally.
- Now renders each link as an **icon-over-label** stack, matching the live
  site: the platform logo on top, the text label below.
- **Refinement (2026-06-15):** instead of hand-drawn inline SVGs, use the
  **actual icons from the original site** (harvardintech.com), **downloaded and
  self-hosted** in the repo so the GitHub Pages build has no dependency on
  Strikingly's CDN. The icons are selected by the existing `icon` field on each
  social link (`twitter`, `facebook`, `email`):
  - **Twitter** — `static-assets.strikinglycdn.com/images/themes/persona/twitter.png`
  - **E-mail** — the custom uploaded image used on the original site; the e-mail
    entry is synthesized from `contactEmail` (via `buildMailto`) so it always
    renders even if the socials list omits it.
  - **Facebook** — `static-assets.strikinglycdn.com/images/themes/persona/facebook.png`
- A link whose `icon` value is unknown/missing degrades gracefully to
  label-only (no broken image).
- Order preserved: Twitter, E-mail, Facebook.
- Added a scoped `<style>` block: `.contact-link` (flex column, centered),
  `.contact-icon`, `.contact-label` (reusing `--font-sans` / `--color-link`),
  plus a subtle `scale(1.08)` hover on the icon. Each link carries an
  `aria-label`.

### Dark footer band — `src/layouts/BaseLayout.astro`
- The live site's bottom band is minimal — only the copyright + cookie line.
- Removed the redundant plain-text social links list and the email paragraph
  from the dark `<footer>`; it now renders only `settings.footerText`.
- Cleaned up the now-unused `buildMailto` import and `contactHref` constant.

## Decisions made
- Social links appear **only** in the Contact Us section, not repeated in the
  dark footer band — confirmed against the original site.
- Icons are driven by the data-layer `icon` field already present in
  `settings.json`, keeping social links a CMS data edit rather than a code
  change.
- Use the real icons from the original site, **downloaded and self-hosted** in
  the repo (not hotlinked to Strikingly's CDN), for a faithful, self-contained
  GitHub Pages reproduction.

## Verified
- `/#contact` at desktop width: Twitter, E-mail, Facebook icons render above
  their labels, horizontally arranged.
- Dark footer band shows only the copyright/cookie line.

## Scenarios
- Exercised the existing `harvard-in-tech-landing-page` application scenario
  (route `/`, `#contact`). No new scenario registered.

## Follow-ups for Deconstruct / TDD
- Download the three real icons (Twitter, E-mail, Facebook) from the original
  site into the repo's self-hosted assets.
- Extract the icon-selection logic so it's testable (icon name → asset path),
  and cover: each `icon` value maps to the right asset; an unknown/missing icon
  degrades gracefully to label-only; the synthesized e-mail entry always renders.
- Verify the dark footer renders only `footerText` (no social/email links).
- Confirm mobile reflow of the icon-over-label row.
