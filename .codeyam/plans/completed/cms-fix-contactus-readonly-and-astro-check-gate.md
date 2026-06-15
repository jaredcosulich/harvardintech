---
title: "cms: Fix ContactUs readonly type error + local astro check gate"
mode: ui
createdAt: "2026-06-15T17:44:00Z"
source: manual
prefix: "cms"
---

## Summary

CI failed during `astro check && astro build` with a TypeScript error in the
isolated-components preview page: the `contactUsStates` object is declared
`as const`, which makes its `socials` array a `readonly` tuple, and that is not
assignable to `ContactUs`'s `socials: SocialLink[]` (mutable) prop. Fix the type
error by widening the component's contract to `readonly SocialLink[]` (it only
reads/filters the array, never mutates it), which is the most durable fix and
prevents recurrence for any future `as const` caller. Separately, close the gap
that let this reach CI: the local pre-commit static check runs `npx tsc --noEmit`
scoped to `**/*.ts`/`**/*.tsx`, but `tsc` does not type-check `.astro` files at
all — only `astro check` does. Add an `astro check` entry to
`.codeyam/editor.json`'s `staticChecks` so the existing pre-commit hook runs the
same check CI runs whenever an `.astro` file is staged.

## Key Decisions

- **Widen `ContactUs` Props to `readonly SocialLink[]`** rather than dropping
  `as const` on `contactUsStates` or casting at the render site. The component
  only reads (`socials.filter(...)`), so accepting a readonly array is correct
  and intention-revealing. It keeps the preview file consistent with its sibling
  state blocks (which all use `as const`) and immunizes the component against the
  same error from any future readonly/literal caller. Verified safe for the real
  caller: `src/pages/index.astro` passes `settings.socials` (a mutable
  `SocialLink[]`), which is assignable to `readonly SocialLink[]`.
- **Add `astro check` as a configured static check** (not a new PR CI workflow).
  The pre-commit hook already runs `editor.json` `staticChecks` matched by file
  pattern and is single-sourced with the audit gate's `verify-build` engine, so
  wiring `astro check` there catches `.astro` type errors at commit time — the
  earliest possible point — using the exact check CI runs. The existing `tsc`
  entry stays (fast feedback on pure-TS edits); the new entry covers what `tsc`
  structurally cannot see.

## Implementation

### 1. Widen the `ContactUs` socials prop to readonly

**File**: `src/components/landing/ContactUs.astro`

Change the `Props` interface field from `socials: SocialLink[];` to
`socials: readonly SocialLink[];`. No other change is needed — the component body
only does `socials.filter(...)`, which is valid on a readonly array. This makes
the `as const` `contactUsStates.Default.socials` tuple assignable at the render
site in `src/pages/isolated-components/[name].astro:264`, resolving the
`ts(2322)` error. Leave `contactUsStates` `as const` as-is so it stays uniform
with the other preview state blocks.

(Optional consistency note for the editor: `SiteSettings.socials` in
`src/lib/site.ts` may also be widened to `readonly SocialLink[]`, but it is not
required to fix the build and the real caller already passes a mutable array.
Prefer the minimal component-level change unless a uniform readonly convention
is desired.)

### 2. Add an `astro check` static check so the pre-commit hook catches .astro errors

**File**: `.codeyam/editor.json`

Append a second entry to the `staticChecks` array (keep the existing `tsc` entry):

```json
{
  "name": "astro-check",
  "command": "npx astro check",
  "description": "Astro type-check (covers .astro files that tsc cannot)",
  "filePatterns": ["**/*.astro", "**/*.ts", "**/*.tsx"],
  "excludePatterns": ["**/node_modules/**", "**/dist/**", "**/build/**"]
}
```

This mirrors the command CI runs (`npm run build` → `astro check && astro build`).
The pre-commit hook in `.git/hooks/pre-commit` reads `staticChecks`, matches
staged files against `filePatterns`, and blocks the commit if the command exits
non-zero — so staging this same `[name].astro` change would now fail locally with
the identical `ts(2322)` instead of slipping through to CI. `.codeyam/editor.json`
is not a constrained file (confirmed via `classify-constrained-files`), so this
edit is safe.

## Reused existing code

- `SocialLink` interface from `src/lib/site.ts` — the type being widened to
  readonly at the prop boundary.
- `socialIconSrc` from `src/lib/socialIcon.ts` (glossary entry: `socialIconSrc`,
  tested by `src/lib/socialIcon.test.ts`) — used by `ContactUs.astro` to resolve
  each link's icon; unchanged, noted as the reused rendering helper.
- Existing `staticChecks` mechanism in `.codeyam/editor.json` + the
  `.git/hooks/pre-commit` runner — the new `astro check` entry plugs into this
  existing pattern rather than adding new tooling.

## Scenarios to Demonstrate

- **Happy path**: `npm run build` (or `npx astro check`) passes with the widened
  prop — zero errors, the `ContactUs` isolated-component preview renders the
  three social icons (Twitter / E-mail / Facebook).
- **Regression guard (the bug)**: staging a change to
  `src/pages/isolated-components/[name].astro` while the type error is present
  now trips the new `astro-check` static check in pre-commit and blocks the
  commit locally — proving the gap is closed.
- **Pure-TS edit**: staging only a `.ts` file still runs the fast `tsc` check
  (and `astro check`), confirming the existing fast path is preserved.
- **Real landing page unaffected**: `src/pages/index.astro` still passes
  `settings.socials` to `ContactUs` and type-checks, confirming the widened prop
  is backward-compatible with the mutable-array caller.
