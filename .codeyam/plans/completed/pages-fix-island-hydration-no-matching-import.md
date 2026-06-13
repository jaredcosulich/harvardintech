---
title: "pages: Fix Island Hydration NoMatchingImport on Pages Deploy"
mode: ui
createdAt: "2026-06-13T00:00:00Z"
source: manual
prefix: "pages"
---

## Summary

The GitHub Pages deploy build fails while pre-rendering the component-isolation
harness route `/isolated-components/Greeting/`:

```
[NoMatchingImport] Could not render `Island`. No matching import has been found
for `Island`.
  at generateHydrateScript (.../server_BoWnV8VZ.mjs:571:11)
  ├─ /isolated-components/Greeting/index.html
```

The root cause is in `src/pages/isolated-components/[name].astro`. The Greeting
React island is rendered through a **variable indirection** —
`const Island = island?.Component` and then `<Island {...} client:load />`.
Astro hydrates `client:*` components by statically mapping the rendered
component back to its import specifier to generate the hydration script. A
component referenced through a runtime variable (`Island`) can't be traced back
to an import, so `generateHydrateScript` fails with `NoMatchingImport`. The fix
is to render the directly-imported `Greeting` component with `client:load`
instead of going through the `Island` variable, while keeping the `islands`
registry as the source of props.

## Key Decisions

- **Reference the island component directly, not via a variable** — Astro
  requires `client:*` components to be statically analyzable so it can emit the
  correct hydration import. Rendering `<Greeting ... client:load />` directly
  satisfies that; `<Island ... client:load />` does not. This is a documented
  Astro constraint, not a bug in our component.
- **Keep the `islands` registry for props only** — the registry still cleanly
  holds each island's preview props (`name`, `subtitle`). We branch on the
  route `name` to pick the concrete component, so adding a second island is a
  small, explicit edit (one more branch + registry entry) rather than a generic
  dynamic dispatch that breaks hydration.
- **Leave the EmbedForm path untouched** — `EmbedForm` is a static Astro
  component (no `client:*` directive), so its dynamic `<EmbedForm {...props} />`
  render is fine. Only the hydrated island path is affected.

## Implementation

### 1. Render the Greeting island directly instead of through `Island`

**File**: `src/pages/isolated-components/[name].astro`

- Remove the `const Island = island?.Component;` indirection (or keep `island`
  only for its props).
- In the template body, replace the `Island ? (<Island {...island.props}
  client:load />)` branch with a direct, statically-analyzable render of the
  imported `Greeting` component, gated on the route name. For example, resolve
  the island props from the registry but render `Greeting` by name:

  ```astro
  {
    name === 'Greeting' ? (
      <Greeting {...islands.Greeting.props} client:load />
    ) : embedFormProps ? (
      <EmbedForm {...embedFormProps} />
    ) : (
      <p>Unknown component: {name}</p>
    )
  }
  ```

- Keep the `islands` const so props stay declared in one place; it just no
  longer drives a dynamic component variable. Update the explanatory comment so
  it documents that hydrated islands must be referenced directly by import (and
  that adding an island means adding a registry entry **and** a render branch).
- Preserve the existing `getStaticPaths` entries (`Greeting`, `EmbedForm`,
  `EmbedForm-Embedded`, `EmbedForm-Unconfigured`) unchanged.

## Reused existing code

- `Greeting` from `src/components/Greeting.tsx` (glossary entry: `Greeting`) —
  the React island; now rendered directly with `client:load`.
- `EmbedForm` from `src/components/EmbedForm.astro` (glossary entry:
  `EmbedForm`) — static Astro component; render path unchanged.
- Existing test `src/components/Greeting.test.tsx` (per test registry) covers
  the Greeting component itself and stays green.

## Scenarios to Demonstrate

- **Astro build succeeds** — `npm run build` (or the `withastro/action@v3` CI
  step) completes with no `NoMatchingImport` error and emits
  `dist/isolated-components/Greeting/index.html`.
- **Greeting isolation page renders and hydrates** — visiting
  `/isolated-components/Greeting/` shows the greeting headline + subtitle and
  the counter button increments on click (hydration works).
- **EmbedForm isolation pages still render** — `/isolated-components/EmbedForm/`,
  `/isolated-components/EmbedForm-Embedded/`, and
  `/isolated-components/EmbedForm-Unconfigured/` each render their static state
  unchanged.
- **Unknown component name** — an unmatched route name falls through to the
  "Unknown component" message.
