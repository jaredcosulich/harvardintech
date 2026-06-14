---
title: "github-pages: Fix Missing Images on Pages Subpath"
mode: ui
createdAt: "2026-06-14T10:59:45Z"
source: manual
prefix: "github-pages"
---

## Summary

Every image on the deployed site (https://jaredcosulich.github.io/harvardintech/)
is broken. The site publishes under a project subpath (base `/harvardintech/`),
but the landing components render `<img src="/images/...">` with **root-absolute**
paths that never pass through the project's `withBase()` helper. The browser
therefore requests `https://jaredcosulich.github.io/images/...` (404) instead of
`https://jaredcosulich.github.io/harvardintech/images/...`. It works in local dev
and the codeyam preview only because base is `/` there. The fix is to route every
internal image `src` through the existing, already-tested `withBase()` helper —
the same pattern the header nav, logo, chapter back-link, 404, and blog links
already use — so images resolve under either base mode (custom domain `/` or
project subpath `/<repo>/`).

## Key Decisions

- **Reuse `withBase()`, don't hand-roll path logic.** `src/lib/url.ts` already
  exports `withBase()`, covered by `src/lib/url.test.ts`, and is the established
  convention for internal absolute paths in this repo. Apply it at each `<img>`
  site rather than introducing any new mechanism. External URLs / non-absolute
  strings pass through it untouched, so wrapping is always safe.
- **Wrap at the render site, keep the props as plain `/images/...` defaults.**
  The component defaults and any scenario/CMS-supplied values stay written as
  clean root-absolute paths (`/images/...`); `withBase()` is applied only where
  the value is placed into `src`. This keeps authored data base-agnostic and
  centralizes the base concern at render, matching how blog/nav links work.
- **Cover the data-driven image fields too.** `BoardOfDirectors` member `photo`
  values (from the `team` content collection / scenarios) flow into `<img src>`
  the same way, so they get the same `withBase()` treatment — even though no
  team entry currently sets `photo`, this prevents the bug recurring the moment
  one does.
- **Lock it with a regression test.** Add component-level coverage asserting the
  rendered `src` is base-prefixed under a subpath base, so this class of bug
  can't silently return. This mirrors the existing `withBase` unit test approach
  (`vi.stubEnv('BASE_URL', '/harvardintech/')`).

## Implementation

### 1. Base-prefix the Hero background image

**File**: `src/components/landing/Hero.astro`

Import `withBase` from `../../lib/url` and change `src={image}` to
`src={withBase(image)}` on the background `<img>`.

### 2. Base-prefix the event gallery images

**File**: `src/components/landing/EventGallery.astro`

Import `withBase` and wrap the mapped `src` — `src={withBase(src)}` — so all 12
default `/images/gallery/event-*.jpg` (and any `images` override) resolve under
the subpath.

### 3. Base-prefix the Get Involved background image

**File**: `src/components/landing/GetInvolved.astro`

Import `withBase` and change `src={image}` to `src={withBase(image)}`.

### 4. Base-prefix the Board of Directors images

**File**: `src/components/landing/BoardOfDirectors.astro`

Import `withBase` and wrap both image sites: the composite board graphic
(`src={image}` in the `useImage` branch) and the per-member photo
(`src={member.photo}`) — `src={withBase(image)}` and `src={withBase(member.photo)}`.

### 5. Base-prefix the WhatsApp community image

**File**: `src/components/landing/WhatsappCommunity.astro`

Import `withBase` and change `src={image}` to `src={withBase(image)}`.

### 6. Add a base-path regression test for images

**New file**: `src/components/landing/landing-images.test.ts` (or extend the
nearest existing component test)

Render the affected components (or assert on the resolved `src` strings) with
`vi.stubEnv('BASE_URL', '/harvardintech/')` and verify each image `src` begins
with `/harvardintech/images/...`; with base `/` it stays `/images/...`. This is
the same env-stubbing pattern used in `src/lib/url.test.ts`.

### 7. Sweep for any other un-based internal `<img>` / asset references

**Files**: `src/**` (verification pass, not a blanket edit)

Confirm no other internal absolute asset paths bypass `withBase` — e.g. og:image
/ favicon in `src/components/SEO.astro` and `src/layouts/BaseLayout.astro`
(BaseLayout already imports `withBase`; verify the favicon/og tags actually use
it), and any future content-collection `image`/`photo` fields. Apply `withBase`
to any stragglers found. (Current grep shows the five landing components above
are the only offenders, but this guards the edges.)

## Reused existing code

- `withBase` from `src/lib/url.ts` (glossary entry: `withBase`) — the canonical
  base-path prefixer; already used by nav/logo, chapter back-link, 404, and blog
  links. Tested by `src/lib/url.test.ts`.
- `import.meta.env.BASE_URL` — Astro-derived base from `astro.config.mjs`
  (`DEPLOY_BASE_PATH` → base `/harvardintech/` on the Pages build, `/` locally).
- The env-stubbing test pattern in `src/lib/url.test.ts`
  (`vi.stubEnv('BASE_URL', ...)`) — reused for the new component regression test.

## Scenarios to Demonstrate

- **Subpath deploy (the bug):** with base `/harvardintech/`, the Hero, gallery,
  Get Involved, Board, and WhatsApp images all load (src prefixed with
  `/harvardintech/images/...`).
- **Domain root:** with base `/`, the same components render `/images/...`
  unchanged — no doubled prefix, no regression for a future custom-domain deploy.
- **Member photos supplied:** a `BoardOfDirectors` scenario with `members[].photo`
  set renders each photo correctly under the subpath (data-driven path covered).
- **Override images:** an `EventGallery` with a custom `images` array still
  base-prefixes each entry.
- **Empty/initials fallback:** `BoardOfDirectors` with no members and no image,
  and members without photos, still render the initials fallback (no broken
  `<img>`).
