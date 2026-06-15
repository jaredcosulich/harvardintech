---
title: "home: Full-Height Hero & Parallax Banners"
mode: ui
createdAt: "2026-06-15T01:20:00Z"
source: manual
prefix: "home"
---

## Summary

Bring the home page closer to the original https://www.harvardintech.com/ in two
ways. First, the opening **"Harvard Alumni in Tech"** hero should fill the screen:
its background photo extends from just under the white header bar all the way to
the bottom of the viewport, responsive to the screen's height, instead of being
sized by a fixed `200px` top/bottom padding. Second, the two full-bleed banner
photos — the **Hero** ("Harvard Alumni in Tech") and **Get Involved** — get a
fixed-background **parallax** effect: as you scroll, each photo stays pinned to
the viewport while its section scrolls over it, exposing different parts of the
image (the `background-attachment: fixed` look). Parallax runs on desktop only;
touch/mobile and `prefers-reduced-motion` users keep the current static cover
image (no jank). No content or copy changes — purely layout/motion fidelity.

## Key Decisions

- **Reproduce `background-attachment: fixed` with JS on the existing `<img>`,
  not CSS `background-image`.** Both banners deliberately render their background
  as an `<img>` (see the comments in `Hero.astro` / `GetInvolved.astro`) because
  a CSS `background-image: url()` does **not** survive the preview reverse-proxy /
  base-path rewrite the way an `<img src>` (through `withBase`) does. Switching to
  `background-attachment: fixed` would risk re-breaking the images in preview and
  on the Pages subpath. So we keep the `<img>` and pin it to the viewport with a
  tiny scroll handler: on each frame we set `transform: translateY(-rectTop)` on
  the image (where `rectTop` is its section's `getBoundingClientRect().top`),
  which makes the photo appear fixed to the viewport while the section's
  `overflow: hidden` window clips it. This is visually identical to
  `background-attachment: fixed` and also works where that CSS property is
  unreliable.
- **Desktop-only parallax (per the user).** `background-attachment: fixed` is
  janky or ignored on most touch browsers, which is why the original (a
  Strikingly site) effectively disables it on mobile. The handler activates only
  when `matchMedia('(hover: hover) and (pointer: fine)')` matches and
  `prefers-reduced-motion` is not set; otherwise the image stays a normal static
  `object-fit: cover` (today's behavior). The full-viewport hero height still
  applies on every device.
- **Hero height via `min-height`, content vertically centered.** Replace the
  fixed `padding: 200px 20px` with `min-height: calc(100svh - var(--header-height))`
  (with a `100vh` fallback) and flex-center the inner content. `min-height` (not
  `height`) means tall content never gets clipped on short screens; `svh` avoids
  the mobile address-bar jump. The header is in normal flow above the hero, so
  subtracting its height makes header + hero exactly fill the first screen.
- **Promote the header height to a token.** The header's `89px` is currently a
  magic number inline in `BaseLayout.astro`; introduce `--header-height` so the
  hero's `calc()` and the header stay in sync.
- **Extract the parallax math into a tested lib module.** Vitest doesn't import
  `.astro`, but it does run `.ts`. Put the pure helpers (offset + enable
  decision) in `src/lib/parallax.ts` with a `parallax.test.ts`, matching the
  repo's "logic in `lib/*.ts`, unit-tested" pattern; the DOM wiring stays a thin,
  idempotent `initParallax()`.

## Implementation

### 1. Parallax engine (new, tested)

**New file**: `src/lib/parallax.ts`

A small client-side module exporting:

- `parallaxOffset(sectionTop: number): number` — returns `-sectionTop`, the
  `translateY` (px) that keeps an image pinned to the viewport top as its section
  scrolls. Pure and unit-testable; documents the contract.
- `parallaxEnabled(opts: { fineHover: boolean; reducedMotion: boolean }): boolean`
  — returns `fineHover && !reducedMotion`. The desktop-only / reduced-motion gate
  as pure logic.
- `initParallax(): void` — idempotent DOM wiring (guard with a one-time flag and
  a `typeof window`/`document` check so it's a no-op under SSR/vitest). When
  `parallaxEnabled(...)` is false it does nothing (images stay static cover).
  When true: for every `[data-parallax]` `<img>`, set its height to `100vh` and
  `will-change: transform`, then on a `requestAnimationFrame`-throttled `scroll`
  + `resize` listener set
  `img.style.transform = translateY(parallaxOffset(root.getBoundingClientRect().top))`,
  where `root` is the nearest `[data-parallax-root]` ancestor (the clipping
  section). Run once on init to set the initial position.

**New file**: `src/lib/parallax.test.ts`

Unit-test the two pure helpers: `parallaxOffset` sign/magnitude for a section
above, at, and below the viewport top; and `parallaxEnabled` truth table
(fine-hover + no-reduced-motion → true; touch or reduced-motion → false).

### 2. Hero — full-viewport height + parallax hooks

**File**: `src/components/landing/Hero.astro`

- Replace `.hero { padding: 200px 20px; }` with
  `min-height: calc(100svh - var(--header-height)); min-height: calc(100vh - var(--header-height));`
  (fallback ordering), keep horizontal padding, and make `.hero` a flex column
  with `align-items`/`justify-content: center` so `.hero-inner` is vertically
  centered in the now-tall section. Keep the existing absolute background
  wrapper.
- Add `data-parallax-root` to the `.hero` section and `data-parallax` to the
  background `<img>`. Leave the image's default CSS as `height: 100%`
  `object-fit: cover` (the static fallback); `initParallax()` overrides height to
  `100vh` only when enabled.
- Add a hoisted client script: `<script>import { initParallax } from '../../lib/parallax'; initParallax();</script>`.
- Mobile `@media (max-width: 640px)` block: drop the fixed `padding` override in
  favor of the shared `min-height` (content stays centered); keep the title /
  text / button mobile rules. Verify the centered content still fits on short
  screens.

### 3. Get Involved — parallax hooks

**File**: `src/components/landing/GetInvolved.astro`

- Add `data-parallax-root` to the `<section>` (already `position: relative;
  overflow: hidden`) and `data-parallax` to its background `<img>` (already
  `inset: 0; object-fit: cover`). No height/layout change — this section keeps
  its content-driven height; only the background gains the fixed-parallax effect.
- Add the same hoisted `<script>` importing and calling `initParallax()`. Astro
  dedupes the hoisted module, so it bundles/runs once even though both Hero and
  Get Involved include it; `initParallax()` is idempotent regardless.

### 4. Header-height token

**File**: `src/styles/tokens.css`

Add `--header-height: 89px;` alongside the existing layout tokens (near
`--content-width`).

**File**: `src/layouts/BaseLayout.astro`

Change the header inner wrapper's inline `height: 89px` to
`height: var(--header-height)` so the hero's `calc()` and the actual header can
never drift. (Purely a constant extraction — no visual change.)

## Reused existing code

- `withBase` from `src/lib/url.ts` (glossary entry: `withBase`) — keeps the
  banner image `src` correct under the Pages base path; unchanged, and the whole
  reason we keep the `<img>` approach instead of CSS `background-image`.
- `Hero` (`src/components/landing/Hero.astro`) and `GetInvolved`
  (`src/components/landing/GetInvolved.astro`) — extended in place.
- `LandingPage` (glossary entry: `LandingPage`, `src/pages/index.astro`) —
  composition unchanged; it already renders `Hero` and `GetInvolved`.
- Layout tokens in `src/styles/tokens.css` (`--content-width`, `--space-*`,
  `--color-bg-dark`) — pattern to follow when adding `--header-height`.
- The landing-image base-path regression test
  (`src/components/landing/landing-images.test.ts`) — already pins the `<img>` +
  `withBase` contract these banners depend on; no change needed, but it guards
  the approach this plan relies on.

## Scenarios to Demonstrate

- **Home page, desktop, top of page:** the white header bar sits above a hero
  whose photo fills the rest of the screen down to the bottom; the centered
  "Harvard Alumni in Tech" title + Subscribe button are vertically centered.
- **Home page, desktop, scrolling:** as the page scrolls, the Hero and Get
  Involved photos stay fixed to the viewport while their sections scroll over
  them, revealing different parts of each image (the parallax/fixed-background
  effect).
- **Hero isolated component (desktop):** full-viewport hero with centered
  content and parallax background on scroll.
- **Get Involved isolated component (desktop):** static section height with the
  fixed-background parallax on the photo.
- **Mobile / touch:** hero still fills the screen height; both banner photos are
  plain static `cover` images (no parallax, no stutter).
- **Reduced motion (`prefers-reduced-motion`):** parallax disabled, static cover
  — same as touch.
- **Short viewport (e.g. landscape phone / small laptop):** `min-height` keeps
  the hero filling the screen without clipping the Subscribe button.
