---
title: "Landing Page Faithful Reproduction"
mode: ui
createdAt: "2026-06-13T13:40:01Z"
source: manual
---

## Summary

Rebuild the public home page of https://www.harvardintech.com/ as a modern,
statically-exported Next.js page that faithfully reproduces the original site's
section structure, copy, and feel. The site is content-driven but uses **no
database** — all page content lives in static content modules under
`content/` (plain TypeScript/JSON), seeded with the *actual* data currently on
the live site. The two "dynamic-looking" sections — **Upcoming Events** and
**Board of Directors** — read from these static content modules, so they render
populated on day one yet are structured so a later CRM can edit/extend them.
This plan covers only the landing page; Events/Chapters pages, the CRM, auth,
and GitHub Pages deployment are deferred to follow-on plans.

## Key Decisions

- **Static content, not a DB.** Per the user, there is no real database. Section
  content lives in typed modules under `content/` (e.g. `content/events.ts`,
  `content/board.ts`, `content/site.ts`). This deviates from the template's
  Prisma/SQLite default on purpose; Prisma stays unused for now. The components
  accept their data as props/imports so a future CRM can swap the source.
- **Faithful reproduction.** Match the original's section order, headings, and
  copy as closely as possible — modernized typography/markup, same information
  architecture. Not a redesign.
- **Static export target.** Configure Next.js for `output: 'export'` so the
  public site can ship to GitHub Pages later. No server-only features on this
  page.
- **Component-per-section.** Each landing section is its own component so it can
  be captured as an isolated-component scenario in multiple data states (empty
  vs populated events/board) without standing up the whole page.
- **Scaffolding runs first.** This is a fresh project — the editor's
  `ui-prepare` step scaffolds the `nextjs-prisma-sqlite` template
  (`codeyam-editor editor template nextjs-prisma-sqlite`) before any of the work
  below. All paths below are relative to that scaffolded app.

## Implementation

### 1. Scaffold the project (ui-prepare)

Handled by the editor workflow's `ui-prepare` step via
`codeyam-editor editor template nextjs-prisma-sqlite`. Do not run
`create-next-app` directly. After scaffolding, set `output: 'export'` (and
`images.unoptimized: true`) in `next.config` so the page is static-exportable.

### 2. Static content modules

**New files**: `content/site.ts`, `content/events.ts`, `content/board.ts`

Typed content modules holding the real copy and data from the live site:
- `site.ts` — org overview text, mailing-list CTA, WhatsApp community steps,
  Get Involved copy, Support Us options (with `ben@harvardintech.com` mailto
  links), Contact links (Twitter / email / Facebook), footer (© 2020), nav
  labels (Home, Events, Chapters: NYC/SF/LA/Japan).
- `events.ts` — `Event[]` (title, date, location, blurb, link). Seed with the
  events currently surfaced on the live site; empty array is a valid state.
- `board.ts` — `BoardMember[]` (name, role, photo, optional link). Seed with the
  current Board of Directors entries.

Export TypeScript types (`Event`, `BoardMember`) so the future CRM and the
section components share one contract.

### 3. Layout, nav, and footer

**Files**: `app/layout.tsx`, `app/components/SiteNav.tsx`, `app/components/SiteFooter.tsx`

Global shell: top nav with the original links (Home, Events, Chapters dropdown:
NYC / San Francisco / L.A. / Japan) and the Harvard in Tech branding/banner;
footer with copyright + cookie-policy notice. Nav targets for not-yet-built
pages can be placeholder hrefs for now.

### 4. Landing page composed of section components

**File**: `app/page.tsx`

**New files** under `app/components/landing/`:
- `Hero.tsx` — branded banner / hero.
- `OrgOverview.tsx` — "official Harvard Alumni Group for technology" mission
  copy + mailing-list subscription CTA.
- `WhatsappCommunity.tsx` — verify-alumni → request-access two-step CTA.
- `UpcomingEvents.tsx` — renders `events` from `content/events.ts`; graceful
  empty state ("No upcoming events right now") when the array is empty.
- `GetInvolved.tsx` — volunteer/speaker/host/sponsor copy + signup link.
- `BoardOfDirectors.tsx` — grid of `board` members from `content/board.ts`;
  empty state when none.
- `SupportUs.tsx` — five CTA options with mailto links.
- `EventGallery.tsx` — responsive photo grid (placeholder images acceptable
  initially; wire real gallery assets here).
- `ContactUs.tsx` — Twitter / email / Facebook links.

`app/page.tsx` imports the content modules and renders the sections in the
original order: Hero → OrgOverview → WhatsappCommunity → UpcomingEvents →
GetInvolved → BoardOfDirectors → SupportUs → EventGallery → ContactUs.

### 5. Styling

Use the template's styling system to approximate the original's clean,
professional look (branded header imagery, generous spacing, event photography).
Keep it responsive.

## Reused existing code

- None yet — fresh project, empty glossary. The `nextjs-prisma-sqlite` template
  scaffolded in `ui-prepare` provides `app/layout.tsx`, `app/page.tsx`, and the
  styling baseline to build on.

## Scenarios to Demonstrate

- **Landing page — populated (default):** full page with real seeded events and
  board members — the production day-one state for this static-content site.
- **UpcomingEvents — empty state:** isolated component with `events: []` showing
  the "no upcoming events" message.
- **UpcomingEvents — rich state:** several events to exercise list layout.
- **BoardOfDirectors — populated vs empty:** grid with members, and the empty
  fallback.
- **Edge case — long event title / missing optional link:** verify layout holds
  with overflowing copy and absent optional fields.
