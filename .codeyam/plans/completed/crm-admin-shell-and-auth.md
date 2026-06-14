---
title: "CRM Admin Shell & Auth"
mode: ui
createdAt: "2026-06-13T13:40:04Z"
source: manual
dependsOn: ["landing-page-faithful-reproduction"]
---

## Summary

> **Stack note (updated):** the Astro stack already ships a **Sveltia CMS**
> integration (`CMS_SETUP.md`) plus a `cms-auth-worker/` (GitHub OAuth for the
> CMS). The "CRM" should very likely be built on these — Sveltia editing the
> `events`/`team` collections and `settings`/`nav` singletons, authenticated via
> the auth worker — rather than a hand-rolled Next.js `/admin` app. Investigate
> `CMS_SETUP.md` and `cms-auth-worker/` first; the Next.js shell below is
> superseded by that approach.

Stand up the CRM/admin tool's shell and access control. The CRM is a
protected area for editing the site's static content (events, board members,
etc.). This plan delivers the authenticated layout, navigation, and dashboard —
the actual content-editing forms come in a follow-on plan. Auth is via a
password and/or GitHub OAuth, and the CRM is designed to run both locally and,
ideally, hosted in the cloud.

## Key Decisions

- **Separate the CRM from the static public site.** The public site is a static
  export; the CRM needs a runtime (to authenticate and to write content). House
  it under an `/admin` route group that is excluded from the static export, or
  as a small companion deployment. Decide the exact split during `explore`.
- **Auth options:** password gate for the simplest local/self-host case; GitHub
  OAuth for the cloud case (and to authorize commits when editing writes back to
  the repo). Support at least the password path first; OAuth as a layered option.
- **Static-content awareness.** The CRM reads the same `content/` modules the
  public site renders, so the admin dashboard shows live counts (e.g. "3
  upcoming events, 6 board members").

## Implementation

### 1. Admin route group + layout

**New files**: `app/admin/layout.tsx`, `app/admin/page.tsx`,
`app/admin/components/AdminNav.tsx`

Authenticated shell with nav (Dashboard, Events, Board) and a dashboard
summarizing current static content counts.

### 2. Auth

**New files**: auth route/handler + `app/admin/login/page.tsx`

Password gate (env-configured secret) protecting `/admin/*`; structure it so a
GitHub OAuth provider can be added. Persist a session (cookie). Document the
local vs cloud configuration.

## Reused existing code

- `content/events.ts`, `content/board.ts`, and their types from
  `landing-page-faithful-reproduction` (read-only here; editing comes next).
- Layout/styling primitives from the landing plan.

## Scenarios to Demonstrate

- Login page (unauthenticated).
- Wrong password → error state.
- Authenticated dashboard showing current content counts.
- Dashboard empty state (no events / no board members).
