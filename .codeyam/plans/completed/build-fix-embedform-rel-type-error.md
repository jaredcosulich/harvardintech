---
title: "build: Fix GitHub Pages Deploy — EmbedForm rel Type Error"
mode: ui
createdAt: "2026-06-13T00:00:00Z"
source: manual
prefix: "build"
---

## Summary

The GitHub Pages deploy fails at the `astro check` step of `npm run build`
with a TypeScript error in `src/components/EmbedForm.astro`: the `<form>`
element carries `rel="noopener"`, but Astro's `FormHTMLAttributes` type does
not declare a `rel` property, so type-checking aborts the build with exit
code 1. The fix is to remove the unsupported `rel="noopener"` attribute from
the form. This is safe because modern browsers already apply `noopener`
behavior to `target="_blank"` form submissions by default, so no security
regression is introduced.

## Key Decisions

- **Remove `rel="noopener"` rather than suppress the type error** — modern
  browsers implicitly apply `noopener` to navigations triggered by
  `target="_blank"` (this has been the default since the behavior was
  standardized), so the attribute is redundant on a `<form target="_blank">`.
  Removing it keeps the markup clean and passes `astro check` without casts,
  `@ts-ignore`, or type-shimming hacks.
- **Considered and rejected: a type cast / attribute spread**
  (`{...{ rel: 'noopener' }}`) to bypass `FormHTMLAttributes`. This would
  silence the checker but adds noise for an attribute that has no functional
  effect on a `target="_blank"` form. Not worth it.

## Implementation

### 1. Drop the unsupported `rel` attribute from the embed form

**File**: `src/components/EmbedForm.astro`

On the `<form>` element (currently around line 30):

```astro
<form action={action} method="post" target="_blank" rel="noopener">
```

Remove the `rel="noopener"` attribute so it reads:

```astro
<form action={action} method="post" target="_blank">
```

Leave `action`, `method`, and `target` unchanged — only `rel` is removed.
No other markup, props, or the iframe/unconfigured branches change.

## Reused existing code

- None — this is a one-attribute fix to an existing component. The component
  has no glossary entry, no dependents in `deps-index.txt`, and no registered
  tests in `test-registry.json`.

## Scenarios to Demonstrate

- **Configured MailChimp-style form** — `action` prop set, no `embedUrl`:
  renders a real `<form method="post" target="_blank">` with an email input
  and submit button, and now type-checks cleanly.
- **Embedded provider iframe** — `embedUrl` prop set (e.g. a Google Form):
  renders the lazy-loaded iframe (unaffected by this change, included to show
  the fix doesn't regress the other branch).
- **Unconfigured fallback** — neither `action` nor `embedUrl` set: renders the
  "No form configured" guidance text.
- **Build/type-check passes** — `astro check && astro build` completes with
  0 errors (the regression that broke the GitHub Pages deploy is gone).
