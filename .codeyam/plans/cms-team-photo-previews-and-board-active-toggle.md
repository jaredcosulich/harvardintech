---
title: "cms: Team photo previews + board active toggle"
mode: ui
createdAt: "2026-06-15T16:00:00Z"
source: manual
prefix: "cms"
---

## Summary

Two CMS improvements to the `team` collection. First, fix the blank headshot
previews in the hosted Sveltia editor (`/harvardintech/admin/editor/#/collections/team`):
the headshots render on the website but show blank in the CMS. Second, add a
"Show on Board of Directors" checkbox so an editor can hide a member from the
public board without deleting their entry.

The blank-preview bug is a GitHub Pages base-path mismatch. Team photos are
stored as root-absolute paths (e.g. `/images/team/ben-wei.png`) and live under
`public/images/team/`, which is **outside** the CMS's configured media folder
(`media_folder: public/uploads`, `public_folder: /uploads`). Because the CMS is
hosted under the project subpath `/harvardintech/`, Sveltia resolves an
unmanaged `/images/...` value against the origin root
(`jaredcosulich.github.io/images/team/...` → 404) instead of the deployed
subpath. The website avoids this only because `withBase()` prepends
`/harvardintech` at render time; the CMS has no such awareness. The fix is to
declare a field-level `media_folder`/`public_folder` for the `photo` field so
Sveltia treats those headshots as managed media (resolved from the repo via the
GitHub backend), independent of the Pages base — and, per the chosen scope, to
make the global `public_folder` base-aware so future uploads also preview
correctly in the hosted CMS.

## Key Decisions

- **Field-level media mapping for `photo`** rather than rewriting the stored
  frontmatter paths. The stored value (`/images/team/ben-wei.png`) must stay
  exactly as-is, because the website's `withBase()` already prefixes the base at
  render time — adding the base to the frontmatter would double-prefix it
  (`/harvardintech/harvardintech/...`) on the live site and break
  `team.photos.test.ts`'s existence check. A field-level
  `media_folder: "/public/images/team"` + `public_folder: "/images/team"` lets
  Sveltia map the existing value back to the repo file for preview without
  touching the value.
- **Base-aware global `public_folder`** (chosen scope: also fix future uploads).
  The config comment already flags this: when a GitHub Pages `base` is set, the
  `public_folder` must include it. Since `base` is env-driven (`/` locally,
  `/harvardintech` on the Pages build) this can't be a single hard-coded string
  that's correct in both environments — see the open note below; the editor
  workflow picks the concrete approach (most likely point `public_folder` at the
  deployed subpath used by the hosted CMS while keeping `media_folder`
  unchanged).
- **`active` defaults to shown.** New schema field is `active: z.boolean().optional()`
  and the board filter treats `active !== false` as visible. Existing entries
  (no `active` key) and any member who simply hasn't toggled it stay on the board
  — backward-compatible, no content migration needed. Unchecking removes the
  member from the board section entirely (chosen behavior), not a visual
  de-emphasis.
- **Filter lives in a pure helper** in `src/lib/team.ts` alongside
  `sortBoardMembers`, so it is unit-testable under vitest and reused by the
  landing page. The `.astro` components stay declarative.

## Implementation

### 1. Add a field-level media mapping to the team `photo` field

**File**: `public/admin/editor/config.yml`

In the `team` collection, replace the `photo` field line with an expanded
mapping so Sveltia resolves the existing `/images/team/*.png` values as managed
media from the repo:

```yaml
- name: photo
  label: Photo
  widget: image
  required: false
  media_folder: "/public/images/team"
  public_folder: "/images/team"
```

This must not change the stored frontmatter value format — entries keep
`photo: /images/team/<slug>.png`.

### 2. Make the global upload path base-aware (future uploads)

**File**: `public/admin/editor/config.yml`

Update the global media config (currently `media_folder: "public/uploads"` /
`public_folder: "/uploads"`) so images uploaded through the hosted CMS preview
correctly under the `/harvardintech` Pages subpath, per the existing config
comment ("If you set a GitHub Pages `base` in astro.config.mjs, prefix that base
here too"). The editor workflow should verify the resulting preview URL against
the hosted CMS and pick the concrete value. Update the surrounding comment to
explain the chosen approach so the contract stays documented. Note: `base` is
env-driven (`/` in local/codeyam preview, `/harvardintech` on the Pages build),
so confirm the chosen value doesn't break local "Work with Local Repository"
previews.

### 3. Add the `active` field to the team content schema

**File**: `src/content/config.ts`

Add `active: z.boolean().optional()` to the `team` collection's `z.object({...})`.
Keep it optional so existing entries without the key still validate and so the
CMS-config-subset-of-schema contract (`astro_cms_config_fields_subset_of_content_schema`)
stays satisfied. Add a short comment noting that an absent `active` means shown.

### 4. Add the "Show on Board of Directors" checkbox to the CMS

**File**: `public/admin/editor/config.yml`

Add to the `team` collection `fields`:

```yaml
- { name: active, label: "Show on Board of Directors", widget: boolean, default: true, required: false }
```

`required: false` keeps it an optional field, matching the optional schema field
(the subset-of-schema contract requires every config field name to exist in the
schema, which step 3 ensures).

### 5. Add an active-filter helper and surface `active` on the type

**File**: `src/lib/team.ts`

- Add `active?: boolean` to the `BoardMemberLike` interface.
- Add an exported helper, e.g.:

```ts
/**
 * Keep only board members marked active for public display. A member is shown
 * unless `active` is explicitly false, so existing entries with no `active`
 * field (and members who never toggled it) remain on the board.
 */
export function filterActiveBoardMembers<T extends BoardMemberLike>(members: T[]): T[] {
  return members.filter((m) => m.active !== false);
}
```

### 6. Apply the filter on the homepage board

**File**: `src/pages/index.astro`

Where `board` is built, apply the active filter before/after `sortBoardMembers`,
e.g.:

```ts
const board = sortBoardMembers(
  filterActiveBoardMembers(
    (await getCollection('team')).map((m) => ({ slug: m.slug, ...m.data })),
  ),
);
```

`BoardOfDirectors.astro` and `BoardMemberCard.astro` need no change — when the
filtered list is empty the section already falls back to the board graphic /
"announced soon" empty state.

### 7. Unit tests for the active filter

**File**: `src/lib/team.test.ts`

Add a `describe('filterActiveBoardMembers', ...)` block covering: a member with
`active: true` is kept; `active: false` is removed; a member with no `active`
field is kept (backward-compatible default); an all-inactive list returns empty;
input array is not mutated.

## Reused existing code

- `sortBoardMembers` from `src/lib/team.ts` (glossary entry: `sortBoardMembers`) — board ordering, composed with the new filter
- `BoardMemberLike` interface from `src/lib/team.ts` — extended with `active?`
- `withBase` from `src/lib/url.ts` (glossary entry: `withBase`) — explains why frontmatter paths must stay base-less; not modified
- `BoardMemberCard` from `src/components/BoardMemberCard.astro` (glossary entry: `BoardMemberCard`) — unchanged; renders the filtered members
- `team.photos.test.ts` existing guard — the photo paths must remain `/images/team/*.png` so this test keeps passing after the CMS config change

## Scenarios to Demonstrate

- **Board with all members active** — five headshots render, all visible (current state, unchanged on the public site).
- **A member toggled off** — uncheck one member's "Show on Board of Directors"; that member disappears from the board, the rest reorder/fill in.
- **All members inactive** — board section falls back to the composite board graphic / "announced soon" empty state.
- **Member with no `active` field (legacy entry)** — still appears on the board (default-shown).
- **CMS image preview (the bug fix)** — opening the team collection in the hosted editor shows each member's headshot thumbnail instead of a blank box.
- **New CMS image upload** — uploading a fresh image (e.g. a blog cover) previews correctly under the hosted `/harvardintech` subpath.
