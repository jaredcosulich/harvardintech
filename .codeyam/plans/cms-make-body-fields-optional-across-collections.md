---
title: "cms: Make Body fields optional across all collections"
mode: ui
createdAt: "2026-06-15T00:00:00Z"
source: manual
prefix: "cms"
---

## Summary

Saving a team member entry in the hosted CMS (e.g. Ben Wei) fails with the
generic message "One field has an error. Please correct it to save the entry"
even when the editor only tweaks existing text. The cause is that the `body`
field in `public/admin/editor/config.yml` has no `required: false`, and in
Sveltia/Decap CMS **every field is required by default**. The reserved `body`
field maps to the markdown body — it is *never* part of the Astro content
schema in `src/content/config.ts` and is never validated as frontmatter — so
requiring it in the CMS is a latent foot-gun on every collection: any entry
with an empty markdown body can't be saved, and the markdown widget's inline
error is easy to miss, leaving only the unhelpful top-level message.

This is already actively broken on two collections and will break a third the
moment an editor touches a body-less entry:

- **team** — all 5 entries (`ben-wei`, `peter-boyce`, `krysia-lenzo`,
  `jessica-li`, `nadia-eldeib`) have empty bodies.
- **events** — 2 of 3 entries (`founders-investors-mixer-sf`,
  `women-in-tech-panel`) are external-link save-the-dates with empty bodies.
- **blog / pages / chapters** — entries currently have body content, but the
  same required-by-default trap applies if any body is ever cleared.

To make every table properly configured and eliminate this error class
entirely, mark the `body` field `required: false` on all five folder
collections. This matches the content model (where `body` is never required)
and removes the only field in the config that is implicitly required against
the schema's intent.

## Key Decisions

- **Make `body` optional on every folder collection, not just the broken ones**
  — `body` is never declared in `src/content/config.ts` (it's the reserved
  markdown-body widget, not frontmatter), so no collection's schema requires it.
  Requiring it in the CMS is inconsistent with the content model everywhere, and
  fixing only team/events would leave the same trap armed on blog, pages, and
  chapters. Relaxing all five guarantees the "One field has an error" failure
  can't recur on any table.
- **No content-schema change** — `src/content/config.ts` does not declare `body`
  in any collection, so making the CMS field optional keeps the template
  contract (`astro_cms_config_fields_subset_of_content_schema`) valid. This is a
  CMS-config-only change.
- **Leave all other fields as-is** — Audit confirmed every *optional schema
  field* (`summary`, `coverImage`, `description`, `order`, `location`, `link`,
  `region`, `blurb`, `heroImage`, `tagline`, `showGallery`, `leads`, `links`,
  `photo`, `bio`, `icon`) already has `required: false`, and every
  required-frontmatter field has a value in all entries. `body` is the only
  misconfiguration.

## Implementation

### 1. Make the `body` field optional on every folder collection

**File**: `public/admin/editor/config.yml`

For each of the five folder collections, change the `body` field definition from:

```yaml
      - { name: body, label: Body, widget: markdown }
```

to:

```yaml
      - { name: body, label: Body, widget: markdown, required: false }
```

The collections and their current `body` line locations:

- `blog` (around line 113)
- `pages` (around line 124)
- `team` (around line 150) — actively broken
- `events` (around line 163) — actively broken
- `chapters` (around line 205)

This mirrors the already-optional `bio` field in the team collection and
removes the hidden required-validation that blocks saving an entry with an
empty body. The `settings` and `nav` singletons have no `body` field and are
unchanged.

## Reused existing code

- `public/admin/editor/config.yml` — the team `bio` field already uses
  `required: false`; this change applies the same pattern to every `body` field.
- `src/content/config.ts` — confirms no collection schema declares `body`, so
  making the CMS field optional keeps the config-vs-schema contract valid and
  requires no schema edit.

## Scenarios to Demonstrate

- **Team happy path** — Open Ben Wei, edit the Role text, click Save: the entry
  saves successfully (no "One field has an error"), despite the empty Body.
- **All team members** — Same edit-and-save succeeds for Peter Boyce, Krysia
  Lenzo, Jessica Li, and Nadia Eldeib (all body-less).
- **Events** — Edit and save the `founders-investors-mixer-sf` and
  `women-in-tech-panel` events (empty bodies) without a validation error.
- **Body with content still works** — Editing a blog post, page, or chapter that
  *has* body content still saves, and the body is written to the markdown file.
- **Clearing a body is now allowed** — Removing the body from a blog/page/chapter
  entry and saving succeeds instead of throwing the generic error.
