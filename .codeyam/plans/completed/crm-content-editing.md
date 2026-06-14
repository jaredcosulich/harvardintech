---
title: "CRM Content Editing"
mode: ui
createdAt: "2026-06-13T13:40:05Z"
source: manual
dependsOn: ["crm-admin-shell-and-auth"]
---

## Summary

> **Stack note (updated):** on the Astro stack, "editing static content" maps to
> **Sveltia CMS editing content-collection markdown** under `src/content/` and
> the `src/data/*.json` singletons, committing via the GitHub OAuth flow in
> `cms-auth-worker/`. Much of the hand-rolled form/persistence work below is
> likely replaced by configuring Sveltia collections. Confirm against
> `CMS_SETUP.md` when this plan is picked up.

Give the CRM real editing power: authenticated admins can add, edit, and remove
**Events** and **Board of Directors** entries, and those changes flow back into
the static `content/` modules that the public site renders. This is the payoff
of the "statically based CRM" — no live database, yet content is editable.

## Key Decisions

- **Writes target the static content files.** Editing produces updated
  `content/events.ts` / `content/board.ts` (or sibling JSON). Two write paths to
  support: (a) **local** — write to the working tree on disk; (b) **cloud** —
  commit via the GitHub API using the OAuth token from the auth plan, which also
  re-triggers the Pages deploy. Pick/confirm the mechanism during `explore`.
- **Shared types as the contract.** Forms validate against the `Event` /
  `BoardMember` types from the landing plan, so the public site and CRM never
  drift.
- **Optimistic, simple UX.** List → add/edit form → save. No bulk import in this
  plan.

## Implementation

### 1. Events editor

**New files**: `app/admin/events/page.tsx`, `app/admin/events/EventForm.tsx`,
write helper (local fs + GitHub-API commit strategies).

List existing events with edit/delete; add-event form; persist to
`content/events.ts`.

### 2. Board editor

**New files**: `app/admin/board/page.tsx`, `app/admin/board/BoardForm.tsx`

Same pattern for board members (name, role, photo, link), persisting to
`content/board.ts`.

### 3. Persistence helper

**New file**: `lib/content-store.ts`

Abstraction with `read`/`write` over the content modules and two backends
(local file write vs GitHub commit), selected by environment/config.

## Reused existing code

- Admin shell, auth/session, and dashboard from `crm-admin-shell-and-auth`.
- `content/events.ts`, `content/board.ts`, and the `Event` / `BoardMember`
  types from `landing-page-faithful-reproduction`.

## Scenarios to Demonstrate

- Add an event → it appears in the admin list (and would render on the public
  Upcoming Events section).
- Edit an existing board member.
- Delete an event with a confirm step.
- Validation error (missing required field) in the add form.
