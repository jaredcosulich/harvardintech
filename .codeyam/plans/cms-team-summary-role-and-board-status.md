---
title: "cms: Team list summary shows role + board status"
mode: ui
createdAt: "2026-06-15T18:33:23Z"
source: manual
prefix: "cms"
---

## Summary

In the Sveltia CMS admin, the Team collection's entry-list ("summary") view
currently shows only each member's name, so an editor can't tell a person's role
or whether they appear in the public "Board of Directors" section without opening
the entry. Add a `summary` template to the `team` collection so each row reads
`Name — Role · On Board of Directors / Hidden from board`. Because the site
treats a member as shown unless `active` is explicitly `false`
(`filterActiveBoardMembers`, `src/lib/team.ts:47`), and none of the five existing
team files set `active` at all, also backfill `active: true` into those files so
the toggle is explicit everywhere: every current member is selected (shown), and
*unchecking* the "Show on Board of Directors" toggle is what removes someone from
the public board. No schema change is needed — `role` and `active` already exist
in the content schema, and `summary` is collection display metadata, not a field.

## Key Decisions

- **Add a `summary` template (single line) rather than custom columns.** A
  `summary` string is a core Sveltia/Decap feature and answers the request
  directly: role + board status on one line per row. It needs no schema change
  and doesn't touch the `astro_cms_config_fields_subset_of_content_schema`
  contract (summary is metadata, not a field).
- **Backfill `active: true` into all five existing team files** so "selected =
  shown, unselected = hidden" is true and explicit for the current roster. The
  CMS boolean widget already has `default: true` (config.yml:148), so anything
  created/saved through the CMS already writes `active: true`; the backfill brings
  the five legacy files (which omit the key) into the same explicit state. This
  matches the user's intent: the current members are all active, and unselecting
  the toggle removes a member from the board.
- **Keep the existing `filterActiveBoardMembers` semantics (`active !== false`)
  unchanged.** It already means "shown unless explicitly false," which is exactly
  the desired toggle behavior once entries carry an explicit `active`. Use
  `default(true)` in the summary template so the CMS label stays correct even for
  any future entry that omits `active`, keeping the label single-sourced with the
  site's filter logic rather than drifting from it.

## Implementation

### 1. Add a summary line to the Team collection

**File**: `public/admin/editor/config.yml`

On the `team` collection (the block starting at `- name: team`, config.yml:126),
add a `summary` key alongside `slug`:

```yaml
  - name: team
    label: "Team"
    folder: "src/content/team"
    create: true
    slug: "{{slug}}"
    summary: "{{name}} — {{role}} · {{active | default(true) | ternary('On Board of Directors','Hidden from board')}}"
    fields:
      ...
```

The `default(true)` step mirrors `filterActiveBoardMembers` (`active !== false`),
so a member whose `active` is absent or `true` reads "On Board of Directors" and
only an explicit `active: false` reads "Hidden from board." Leave all existing
`fields` untouched.

### 2. Backfill `active: true` into the existing team entries

**Files**:
- `src/content/team/ben-wei.md`
- `src/content/team/jessica-li.md`
- `src/content/team/krysia-lenzo.md`
- `src/content/team/nadia-eldeib.md`
- `src/content/team/peter-boyce.md`

Add `active: true` to each file's frontmatter (none currently set it). This is a
data edit only — it makes the current "shown" state explicit and gives each row a
truthful board-status label without changing what renders on the public site
(all five already render today via the absent-means-shown default).

## Reused existing code

- `filterActiveBoardMembers` from `src/lib/team.ts` (glossary entry:
  `filterActiveBoardMembers`, tested by `src/lib/team.test.ts`) — the
  `active !== false` filter whose semantics the summary's `default(true) |
  ternary(...)` label is kept consistent with. Unchanged by this plan.
- The `team` collection's existing `active` boolean field with `default: true`
  in `public/admin/editor/config.yml` (the "Show on Board of Directors" toggle) —
  reused as-is; this plan only adds the list-view label and backfills the legacy
  entries.

## Scenarios to Demonstrate

- **All current members active**: the CMS Team list shows all five entries as
  `Name — Role · On Board of Directors` after backfill.
- **A hidden member**: an entry with `active: false` shows `Name — Role · Hidden
  from board` in the list and does not appear in the public Board of Directors
  section on the rendered site.
- **Absent-active safety**: an entry created before the backfill (no `active`
  key) still reads "On Board of Directors", matching `filterActiveBoardMembers`'s
  shown-unless-false rule — proving the label can't disagree with the site.
- **Newly created member**: creating a team entry in the CMS writes
  `active: true` via the widget default and immediately reads "On Board of
  Directors" in the list.
