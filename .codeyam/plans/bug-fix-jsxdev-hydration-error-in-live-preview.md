---
title: "bug: Fix jsxDEV Hydration Error in Live Preview"
mode: ui
createdAt: "2026-06-15T23:45:00Z"
source: manual
prefix: "bug"
---

## Summary

The Live Preview throws `Uncaught TypeError: jsxDEV is not a function` when the
`Greeting` React island hydrates (`/isolated-components/Greeting` via
`client:load`). Root cause: the Vite dependency pre-bundle cache
(`node_modules/.vite/deps/react_jsx-dev-runtime.js`) was optimized with
`process.env.NODE_ENV === "production"` folded to `true`, so it bundled
React's **production** JSX dev-runtime — where `exports.jsxDEV = void 0`. The
dev JSX transform of `Greeting.tsx` emits `jsxDEV(...)` calls, but the imported
`jsxDEV` is `undefined`, so hydration crashes. The fix is to (1) invalidate the
poisoned cache and (2) guarantee `astro dev` always pre-bundles the
**development** React runtime so the cache can never be re-poisoned by an
inherited `NODE_ENV=production`.

## Evidence (what investigation found)

- `node_modules/.vite/deps/react_jsx-dev-runtime.js` (cached Jun 15 19:13)
  bundles only `react-jsx-dev-runtime.production.js` with `exports.jsxDEV =
  void 0`, gated by `if (true)` — esbuild constant-folded
  `process.env.NODE_ENV === 'production'` to `true` during `optimizeDeps`.
- React 19.2.7 (`node_modules/react`) ships a correct
  `react-jsx-dev-runtime.development.js` with a real `jsxDEV`; the dev runtime
  itself is fine — only the pre-bundled production copy is wrong.
- `tsconfig.json` correctly sets `jsx: "react-jsx"` + `jsxImportSource:
  "react"`; `@astrojs/react@4.4.2` is configured normally. The JSX config is
  not the problem.
- The editor launches the dev server with `npm run dev` → `astro dev --host
  127.0.0.1` (`.codeyam/run/dev-server.json`, `.codeyam/logs/editor-server.log`).
  `editor.json` `env` is `{}` and no `.env*` files set `NODE_ENV`, so the
  production fold was a transient/stale condition baked into the cache, which
  Vite's optimizeDeps hash (keyed on config + lockfile, NOT on `NODE_ENV`)
  then preserved across every subsequent dev restart.
- `Greeting` is the only React island; all other isolated components are
  `.astro` (server-rendered), which is why this error is isolated to the
  `Greeting` hydration path.

## Key Decisions

- **Fix in `astro.config.mjs`, not `package.json`** — the config already has a
  `if (process.argv.includes('dev'))` dev-only block that mutates
  `process.env` (for the content sandbox). Forcing development mode there keeps
  the fix in one place, applies no matter how the dev server is invoked, and
  matches the file's existing idiom. A `NODE_ENV=development` prefix in the
  `dev` npm script would also work but is shell-specific and easy to bypass.
- **Guard, don't blanket-set** — only normalize `NODE_ENV` inside the existing
  dev-only branch. Production `astro build` / `astro check` (which set
  production mode themselves and read committed `src/content`) must stay
  untouched so GitHub Pages deploys are unaffected.
- **Clear the cache once as part of the fix** — editing `astro.config.mjs`
  changes Vite's config hash and will trigger a re-optimize, but explicitly
  removing `node_modules/.vite` guarantees the poisoned bundle is gone and
  avoids a confusing "still broken until restart" moment.

## Implementation

### 1. Force development mode in the dev-only config block

**File**: `astro.config.mjs`

Inside the existing `if (process.argv.includes('dev')) { ... }` block (the one
that initializes the content sandbox and sets `CODEYAM_CONTENT_ROOT`), normalize
`NODE_ENV` so the Vite dependency optimizer always pre-bundles React's
**development** JSX runtime:

- If `process.env.NODE_ENV` is unset or `'production'`, set it to
  `'development'` before `defineConfig` runs. This makes esbuild resolve
  `process.env.NODE_ENV === 'production'` to `false` in
  `react/jsx-dev-runtime.js`, bundling `react-jsx-dev-runtime.development.js`
  (which exports a real `jsxDEV`).
- Add a short comment explaining the jsxDEV-undefined failure mode so the guard
  isn't removed later as "dead code."

This is dev-only (gated by `process.argv.includes('dev')`), so `astro build`
and `astro check` continue to run in production mode unchanged.

### 2. Invalidate the poisoned Vite dependency cache (one-time action)

**Action (not a source edit)**: remove the stale optimize cache so the dev
server re-bundles React cleanly:

```
rm -rf node_modules/.vite
```

Then restart the managed dev server (the editor's "restart dev server", or
re-running `npm run dev`) so Vite re-runs `optimizeDeps` and regenerates
`react_jsx-dev-runtime.js` from the development build.

### 3. Verify the regenerated bundle and hydration

**Verification only** — after the dev server restarts:

- Confirm `node_modules/.vite/deps/react_jsx-dev-runtime.js` now bundles
  `react-jsx-dev-runtime.development.js` and exports a real `jsxDEV` function
  (no `exports.jsxDEV = void 0`).
- Load `/isolated-components/Greeting` (and the
  `greeting-hydrated-counter-clicked` scenario) in the Live Preview and confirm
  the island hydrates with no `jsxDEV is not a function` error and the counter
  button increments on click.
- Confirm a production `npm run build` still succeeds (production React runtime
  in `dist/`, deploy unaffected).

## Reused existing code

- `Greeting` island from `src/components/Greeting.tsx` (glossary entry:
  `Greeting`) — the subject component; no source change to it is needed.
- `src/pages/isolated-components/[name].astro` — the existing component-isolation
  harness that renders `Greeting` with `client:load`; the verification target.
- Existing `greeting-hydrated-counter-clicked` scenario
  (`.codeyam/preview-state.json`) — already exercises the hydrated counter and
  becomes the regression demo once the runtime is fixed.
- The `if (process.argv.includes('dev'))` dev-only guard pattern already in
  `astro.config.mjs` — extended, not duplicated.

## Scenarios to Demonstrate

- **Greeting hydrates cleanly** — `/isolated-components/Greeting` renders the
  island with no console error; the "Clicked 0 times" button is present.
- **Counter interaction works** — clicking the button increments
  ("Clicked 1 time" → "Clicked 2 times"), proving hydration succeeded
  (the `greeting-hydrated-counter-clicked` scenario).
- **Production build unaffected** — `npm run build` produces a working `dist/`
  using the production React runtime, confirming the dev-only guard didn't leak
  into the deploy path.
