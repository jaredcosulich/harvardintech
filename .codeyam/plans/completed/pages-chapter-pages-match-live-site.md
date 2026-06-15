---
title: "pages: Chapter Pages Match Live Site (city heroes + dropdown fix)"
mode: ui
createdAt: "2026-06-15T18:00:00Z"
source: manual
prefix: "pages"
---

## Summary

The `/chapters/<slug>` pages (NYC, San Francisco, L.A., Japan) currently render
as a bare centered title + region + one-line blurb + a short markdown sentence —
nothing like the live harvardintech.com chapter pages, which each open with a
full-bleed city hero photo ("HARVARD IN TECH <CITY>" over a skyline), then a
teal "Sign Up" band, optional content, and a "Connect With Us" social footer.
Separately, the header **Chapters** dropdown opens *behind* the Harvard shield
badge (the badge's `z-index: 60` paints over the menu, which has no `z-index`),
so the first item is partially hidden.

This plan (1) fixes the dropdown stacking so the menu sits above the shield, and
(2) rebuilds the chapter page into a CMS-driven template that matches the live
pages: a per-city hero image + tagline, a Sign Up band, the existing
leads/body/links content, an optional photo gallery (Japan), and a Connect With
Us footer. The new per-chapter inputs (`heroImage`, `tagline`, `showGallery`)
are added to the `chapters` content schema **and** the Sveltia CMS config so
editors set them in the CMS — the contract test
`astro_cms_config_fields_subset_of_content_schema` stays satisfied.

## Key Decisions

- **Dropdown fix = raise the menu's z-index**, not lower the badge's. The badge
  intentionally sits at `z-index: 60` (it dips from the navbar into the hero).
  Giving the open dropdown `<ul>` a higher z-index (e.g. `70`) is the minimal,
  targeted fix and keeps the badge above the hero image as designed.
- **One shared template for all four chapters**, with per-city variance driven
  by CMS fields rather than per-page markup. `heroImage` + `tagline` differ per
  city; `showGallery` toggles the Japan gallery. This keeps every chapter
  editable in the CMS and avoids four bespoke pages.
- **Reuse existing landing building blocks** instead of new bespoke styling:
  the hero mirrors `Hero.astro` (full-bleed `<img>` + dark overlay + light
  title), the gallery reuses `EventGallery.astro` (which already accepts an
  `images` override), and the social footer reuses `socialIconSrc` +
  `buildMailto` + the editable `settings.socials`/`contactEmail`.
- **Hero images are committed assets under `public/images/chapters/`** (not CMS
  uploads), matching how the landing hero/gallery images already ship under
  `public/images/`. Defaults are referenced from each chapter's `heroImage`
  frontmatter so editors can still swap them via the CMS image widget later.
- **Sign Up + Connect With Us are global** (reuse `settings`), so no new global
  fields are needed; only the three per-chapter fields are added.

## Implementation

### 1. Fix the Chapters dropdown stacking

**File**: `src/layouts/BaseLayout.astro`

The open dropdown `<ul>` (the `position: absolute` menu inside `.nav-dd`) has no
`z-index`, so the shield badge (`z-index: 60`, rendered later in the DOM) paints
over its top edge. Add `z-index: 70` (and keep it a positioned element) to that
inline-styled `<ul>` so the menu sits above the badge. Verify the badge still
renders above the hero image on the home page (its `z-index: 60` is unchanged).

### 2. Add per-chapter fields to the content schema

**File**: `src/content/config.ts`

Extend the `chapters` collection `z.object({...})` with three optional fields:

- `heroImage: z.string().optional()` — path to the full-bleed city header image.
- `tagline: z.string().optional()` — hero subtitle, e.g. "We are the New York
  Chapter of Harvard in Tech."
- `showGallery: z.boolean().optional()` — render the shared event photo gallery
  on this chapter (true for Japan).

Keep them optional so a chapter without them still renders (preserves the
existing "sparse Japan / missing optional frontmatter" scenarios).

### 3. Mirror the new fields in the CMS config

**File**: `public/admin/editor/config.yml`

Under the `chapters` collection `fields:`, add (all `required: false`):

- `{ name: heroImage, label: "Hero image", widget: image, required: false }`
  with a field-level `media_folder: "/public/images/chapters"` and
  `public_folder: "/images/chapters"` so the committed city images preview in
  the hosted CMS (same pattern as the team `photo` field).
- `{ name: tagline, label: Tagline, widget: string, required: false }`
- `{ name: showGallery, label: "Show photo gallery", widget: boolean, default: false, required: false }`

This must stay a superset-match with the schema so
`astro_cms_config_fields_subset_of_content_schema` passes.

### 4. New ChapterHero component

**New file**: `src/components/ChapterHero.astro`

Full-bleed city header modeled on `src/components/landing/Hero.astro`: an
absolutely-positioned `<img src={withBase(heroImage)}>` with `object-fit: cover`,
a dark overlay (`rgba(0,0,0,0.39)`), and centered light text — an uppercase
`HARVARD IN TECH {city}` title (reuse the Hero's flanking-rule title treatment)
and the `tagline` subtitle beneath it. Props: `city`, `heroImage`, `tagline`.
Sized to fill the screen below the header like the live pages
(`min-height: calc(100vh - var(--header-height))`, with the `svh` fallback as in
Hero). When `heroImage` is absent, fall back to the current centered
`ChapterHeader` look so a chapter with no image still renders.

### 5. New ChapterSignUp band

**New file**: `src/components/ChapterSignUp.astro`

The teal "Sign Up" band from the live pages: a light `var(--color-bg-blue)`
section, centered, with a "Sign Up" heading (the shared `.s-title` flanking-rule
style), a "Join the Harvard in Tech Community" line, and a Subscribe `.s-btn`
pill. Default the subscribe URL to the same MailChimp link the landing `Hero`
uses (`https://mailchi.mp/0222623e1169/fbrj32e9wb`); accept an optional
`subscribeUrl` prop for future per-chapter overrides.

### 6. New ChapterConnect footer

**New file**: `src/components/ChapterConnect.astro`

The "Connect With Us" social section from the live pages: centered heading
"Connect With Us", the contact email, and the social icons rendered as dark
circular badges. Reuse `socialIconSrc` (`src/lib/socialIcon.ts`), `buildMailto`
(`src/lib/mailto.ts`), and read `settings.socials` + `settings.contactEmail`
from `src/lib/site.ts` so it stays CMS-editable. This is a chapter-specific
treatment (black circles) distinct from the landing `ContactUs` (icon-over-label)
— factor the shared icon list logic if convenient, but a small dedicated
component is fine.

### 7. Recompose ChapterPage to the new template

**File**: `src/components/ChapterPage.astro`

Reorder the page to match the live layout, accepting the new props
(`heroImage`, `tagline`, `showGallery`) in addition to the existing ones:

1. `<ChapterHero city tagline heroImage />` (full-bleed) — replaces the inline
   `ChapterHeader` as the page opener. Keep the "← All chapters" back link
   (move it into the narrow content section below the hero, or keep it small at
   the top — it should not sit over the hero image).
2. `<ChapterSignUp />` band.
3. The existing narrow content block — `ChapterLeads`, the markdown `<slot />`
   body, and `ChapterLinks` — shown only when there is leads/body/links content
   (the live NYC/SF pages put their copy here).
4. `{showGallery && <EventGallery />}` — reuse `src/components/landing/EventGallery.astro`
   (defaults to the 40 committed `/images/gallery/event-*.jpg`).
5. `<ChapterConnect />` footer.

`ChapterHeader.astro` stays as the no-image fallback used inside `ChapterHero`.

### 8. Pass the new props through the route

**File**: `src/pages/chapters/[slug].astro`

Destructure `heroImage`, `tagline`, `showGallery` from `chapter.data` and pass
them into `<ChapterPage>` alongside the existing `city/region/blurb/leads/links`.

### 9. Add hero images and populate chapter frontmatter

**New files**: `public/images/chapters/{nyc,san-francisco,la,japan}.jpg`

Download the four live city header photos (pattern: `scripts/download-assets.mjs`)
into `public/images/chapters/`:

- NYC — `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_1500,w_2000,f_auto,q_auto/798883/899643_113781.jpeg`
- SF — `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_1500,w_2000,f_auto,q_auto/798883/958646_632113.jpeg`
- L.A. — `https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_1500,w_2000,f_auto,q_auto/798883/946230_700523.jpeg`
- Japan — `https://user-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_1500,w_2000,f_auto,q_auto/117929/149801_604523.jpeg`

**Files**: `src/content/chapters/{nyc,san-francisco,la,japan}.md`

Add frontmatter to each:

- `heroImage: /images/chapters/<city>.jpg`
- `tagline:` the live subtitle — NYC "We are the New York Chapter of Harvard in
  Tech.", SF "We are the San Francisco Chapter of Harvard in Tech.", L.A. "We
  are the Los Angeles Chapter of Harvard in Tech.", Japan "We are the Japan
  Chapter of Harvard in Tech."
- `japan.md` only: `showGallery: true`

Keep the existing `blurb`/`region`/`order` and the short markdown body as the
narrow-section copy.

### 10. Update tests / scenarios for the new fields

**Files**: existing scenario data for `ChapterPage` (scenarios
`chapterpage-full-chapter`, `chapterpage-sparse-no-leads`) and any seed under
`.codeyam/` that constructs chapter props.

Add the new props to the "full" scenario (image + tagline + gallery) and leave
the "sparse" scenario without them to prove the no-image fallback still renders.
Update or add an assertion that `ChapterHero` falls back to the centered header
when `heroImage` is absent. Re-run `npm test` and `npm run check` (the editor
workflow runs these — do not run them in planning).

## Reused existing code

- `Hero` from `src/components/landing/Hero.astro` — full-bleed image + overlay +
  flanking-rule title pattern that `ChapterHero` mirrors.
- `EventGallery` from `src/components/landing/EventGallery.astro` (accepts an
  `images?` override; defaults to the 40 committed gallery photos) — reused for
  the Japan gallery.
- `socialIconSrc` from `src/lib/socialIcon.ts` and `buildMailto` from
  `src/lib/mailto.ts` — for `ChapterConnect`'s social badges.
- `settings` (socials, contactEmail) from `src/lib/site.ts` — keeps the Sign Up
  / Connect sections CMS-editable.
- `withBase` from `src/lib/url.ts` — base-aware asset/link URLs.
- `ChapterHeader` (`src/components/ChapterHeader.astro`), `ChapterLeads`,
  `ChapterLinks` — kept as the no-image fallback and the narrow-section content.
- Glossary entries: `ChapterPage`, `ChapterRoute`.
- Asset-download pattern: `scripts/download-assets.mjs`.
- CMS field-level `media_folder`/`public_folder` mapping precedent: the team
  `photo` field in `public/admin/editor/config.yml`.

## Scenarios to Demonstrate

- **NYC (rich)** — city skyline hero with "HARVARD IN TECH NEW YORK CITY" +
  tagline, Sign Up band, leads/body/links, Connect With Us.
- **San Francisco** — Golden Gate hero, Sign Up, body copy, Connect With Us.
- **Japan (gallery)** — Shibuya hero, Sign Up, the event photo gallery
  (`showGallery: true`), Connect With Us.
- **L.A. (minimal body)** — palms/skyline hero, Sign Up, Connect With Us, little
  middle content (proves the narrow section collapses gracefully).
- **No-image fallback** — a chapter with no `heroImage` renders the original
  centered `ChapterHeader` instead of a broken/empty hero.
- **Chapters dropdown** — opening the header dropdown shows all four items fully
  above the Harvard shield badge (no item hidden behind the logo).
