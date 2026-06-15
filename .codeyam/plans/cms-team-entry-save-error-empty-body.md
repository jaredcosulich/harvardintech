---
title: "cms: Fix team entry save error (implicitly-required empty Body)"
mode: ui
createdAt: "2026-06-15T00:00:00Z"
source: manual
prefix: "cms"
---

## Summary

Saving any team member entry in the hosted CMS (e.g. Ben Wei) fails with the
generic message "One field has an error. Please correct it to save the entry"
even when the editor only tweaks existing text. The cause is the `team`
collection's `body` field in `public/admin/editor/config.yml`: it has no
`required: false`, and in Sveltia/Decap CMS **every field is required by
default**. All five team entries (`ben-wei.md`, `peter-boyce.md`,
`krysia-lenzo.md`, `jessica-li.md`, `nadia-eldeib.md`) have an **empty markdown
body**, so the implicitly-required Body field fails validation on every save.
The markdown widget's inline error is easy to miss, which is why the editor only
sees the unhelpful top-level message. The fix is to mark the team `body` field
`required: false`.

## Key Decisions

- **Mark `body` as `required: false` rather than adding body text to each
  entry** — Team members are intentionally name/role/photo only; `body` isn't a
  required field in the content schema (`src/content/config.ts` doesn't even
  declare `body`, since it maps to the markdown body, not frontmatter). Making
  the field optional matches the real intent and fixes all five entries at once
  without inventing bio copy.
- **Scope to the `team` collection only** — Other collections (blog, pages,
  events, chapters) also have a default-required `body`, but their entries are
  expected to have body content, so leaving those required is correct. Only the
  team collection's entries are legitimately body-less.

## Implementation

### 1. Make the team Body field optional

**File**: `public/admin/editor/config.yml`

In the `team` collection's `fields` list (around line 150), change:

```yaml
      - { name: body, label: Body, widget: markdown }
```

to:

```yaml
      - { name: body, label: Body, widget: markdown, required: false }
```

This mirrors the already-optional `bio` field above it and removes the hidden
required-validation that blocks saving an entry with an empty body. No content
schema change is needed — `src/content/config.ts` does not declare `body`
(the markdown body is reserved and never validated as frontmatter), so the
`astro_cms_config_fields_subset_of_content_schema` contract is unaffected.

## Reused existing code

- `public/admin/editor/config.yml` team collection — existing `bio` field
  already uses `required: false`; this change applies the same pattern to `body`.
- `src/content/config.ts` `team` collection schema — confirms `body` is not a
  required (or any) frontmatter field, so making the CMS field optional keeps the
  config-vs-schema contract valid.

## Scenarios to Demonstrate

- **Happy path** — Open Ben Wei in the CMS, edit the Role text, click Save:
  the entry saves successfully (no "One field has an error" message), even
  though the Body is empty.
- **Other team members** — Same edit-and-save succeeds for Peter Boyce,
  Krysia Lenzo, Jessica Li, and Nadia Eldeib (all currently body-less).
- **Body with content still works** — If an editor does type into Body, the
  entry still saves and the body is written to the markdown file.
- **Non-team collections unchanged** — Saving a blog/page/event with an empty
  body still surfaces a validation error (their `body` remains required).
