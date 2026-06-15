---
title: "cms: Masked admin passcode prompt"
mode: ui
createdAt: "2026-06-15T13:12:02Z"
source: manual
prefix: "cms"
---

## Summary

The `/admin` dashboard passcode gate currently uses the native
`window.prompt()`, which always renders the typed passcode in plain text — it
looks unpolished even though the gate is only a deterrent. Replace the native
prompt with a small custom, opaque full-viewport overlay that contains an
`<input type="password">`, so characters mask to dots/bullets as you type. All
existing gate behavior is preserved exactly: it blocks before the dashboard
renders (no flash), runs in production only (`import.meta.env.PROD`), persists
the unlock in `sessionStorage` under `ADMIN_GATE_STORAGE_KEY`, redirects home on
cancel or an incorrect entry, and keeps the same `ADMIN_GATE_PASSCODE`
env/fallback wiring. This is purely a UX upgrade to how the prompt looks — the
passcode still ships in the built JS, so the gate remains a deterrent, not real
security.

## Key Decisions

- **Custom overlay instead of `window.prompt()`** — `window.prompt()` cannot
  mask input; only a real `<input type="password">` shows dots. So the inline
  gate script must build a small DOM overlay (backdrop + label + password input +
  Unlock button) rather than call the native prompt.
- **Preserve the "no flash" guarantee via explicit `visibility`** — the current
  script hides `document.documentElement` (`visibility: hidden`) up front so the
  dashboard never flashes. Keep that, and make the injected overlay visible by
  setting its own `visibility: visible` (which overrides the inherited hidden),
  plus an opaque background and a high `z-index` so the dashboard stays covered.
  On a correct passcode: remove the overlay and restore the document's previous
  visibility. This keeps the exact anti-flash semantics while swapping the input
  mechanism.
- **Stay an inline, self-contained script** — the gate runs as an `is:inline`
  script (it executes before the rest of `<body>` and can't import bundled
  modules), so the overlay is created with `document.createElement` + inline
  styles inside the same `define:vars` block. The passcode comparison continues
  to mirror `isPasscodeCorrect` from `src/lib/adminGate.ts` (trim both sides;
  empty expected never matches) — the lib stays the single tested source of
  truth, the inline copy stays in sync, same as today.
- **Match existing redirect-on-incorrect behavior** — keep parity: an empty/
  cancelled entry or a wrong passcode redirects home (`homePath`). The button and
  the Enter key submit; an Escape key or a Cancel affordance redirects home. (A
  softer "show inline error and let them retry" flow is intentionally out of
  scope to preserve current behavior — note it as a possible later enhancement.)
- **On-brand but flash-safe styling** — style the overlay with the site's design
  tokens (`var(--color-bg)`, `var(--color-border)`, `var(--radius)`, brand blue
  for the button) but give each a literal fallback in the inline styles, since
  the inline script may run before `tokens.css` applies. Keep it minimal and
  centered.
- **Scope kept to the prompt mechanism** — this plan only changes how the gate
  collects the passcode. It deliberately does not touch the stale "cms-auth-worker
  is the real write boundary" comments in `AdminGate.astro` / `adminGate.ts`;
  the separate queued `cms-token-only-self-serve-signin` plan already updates
  those. Both edit `AdminGate.astro`, but in different regions (this one rewrites
  the inline prompt logic; the other rewrites a doc comment), so they reconcile
  cleanly regardless of run order.

## Implementation

### 1. Replace the native prompt with a masked overlay

**File**: `src/components/admin/AdminGate.astro`

Keep the component's frontmatter and gating unchanged: the
`expectedPasscode = import.meta.env.ADMIN_GATE_PASSCODE ?? 'harvardintech-admin-preview'`
fallback, `homePath = withBase('/')`, `gateActive = import.meta.env.PROD`, and
the `is:inline` script with `define:vars={{ expected, storageKey, homePath }}`.

Rewrite the body of the inline IIFE so that, instead of calling
`window.prompt()`:

1. Early-return if `sessionStorage[storageKey] === '1'` (unchanged).
2. Hide the document up front: save `document.documentElement.style.visibility`
   and set it to `'hidden'` (unchanged anti-flash behavior).
3. Build an overlay via `document.createElement`:
   - A fixed, full-viewport backdrop (`position: fixed; inset: 0; z-index`
     very high; opaque background) with its own `visibility: 'visible'` so it
     shows despite the hidden documentElement.
   - A centered card containing a short label ("Enter the admin passcode to
     continue"), an `<input type="password">` (autofocus), and an "Unlock"
     button. Optionally a small "Cancel" link/button.
   - Append the backdrop to `document.documentElement` (it exists even before
     `<body>` finishes parsing) and focus the input.
4. Wire submission:
   - A `submit` handler (button click / form submit / Enter key) reads the
     input value and compares it with the same trim-based check used by
     `isPasscodeCorrect` (`String(expected).trim()` length > 0 and
     `entry.trim() === want`).
   - **Correct:** set `sessionStorage[storageKey] = '1'` (guarded in try/catch
     as today), remove the overlay, and restore
     `document.documentElement.style.visibility` to its saved value.
   - **Incorrect or cancelled (Cancel / Escape):** `window.location.replace(homePath)`
     — same redirect-home behavior as today.
   - Preserve the `sessionStorage` try/catch fallthrough (private mode / disabled
     storage) exactly as in the current script.

Keep the explanatory comment block at the top of the inline script, updating it
to describe the custom masked overlay (replacing the "then prompt" wording) while
still noting it mirrors `isPasscodeCorrect()` from `src/lib/adminGate.ts`.

No change to `gateActive` (production-only) — on local dev / codeyam preview the
gate stays off and the overlay never renders.

### 2. Keep the comparison logic in the tested lib

**File**: `src/lib/adminGate.ts` (no functional change)

`isPasscodeCorrect` and `ADMIN_GATE_STORAGE_KEY` remain the canonical,
unit-tested logic that the inline overlay mirrors. Do not change their behavior.
(If the separate token-only plan hasn't yet refreshed the "cms-auth-worker"
comment here, leave it for that plan — out of scope.)

## Reused existing code

- `isPasscodeCorrect` from `src/lib/adminGate.ts` (glossary entry:
  `isPasscodeCorrect`; tested in `src/lib/adminGate.test.ts`) — the trim-based
  compare the inline overlay mirrors.
- `ADMIN_GATE_STORAGE_KEY` from `src/lib/adminGate.ts` — the `sessionStorage`
  unlock key, passed into the inline script via `define:vars` as today.
- `AdminGate` component from `src/components/admin/AdminGate.astro` (glossary
  entry: `AdminGate`) — rewritten in place; still mounted as the first child of
  `<body>` by `src/layouts/AdminLayout.astro`, covering every `/admin` page.
- `withBase` from `src/lib/url.ts` — unchanged; still builds `homePath` for the
  cancel/incorrect redirect.

## Scenarios to Demonstrate

- **Masked entry (happy path)** — the overlay appears over a hidden dashboard;
  typing the passcode shows dots/bullets; the correct value unlocks and reveals
  the dashboard.
- **Incorrect passcode** — entering a wrong value redirects to the public home
  page (parity with current behavior).
- **Cancel** — dismissing the prompt (Cancel / Escape) redirects home without
  revealing the dashboard.
- **Already unlocked** — with `sessionStorage[admin-unlocked] === '1'`, the
  overlay never appears and the dashboard renders immediately.
- **No flash** — on a fresh production load the dashboard content is never
  visible before the overlay (document stays hidden behind the opaque overlay
  until unlock).
- **Gate disabled in dev** — on the local dev server / codeyam preview
  (`import.meta.env.PROD` false), no overlay renders and the dashboard is open.
