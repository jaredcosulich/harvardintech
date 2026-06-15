---
title: "cms: Fix Editor Auth & Gate Admin Dashboard"
mode: ui
createdAt: "2026-06-15T11:09:50Z"
source: manual
prefix: "cms"
---

## Summary

The content editor at `/admin/editor/` cannot sign in: clicking "Sign in with
GitHub" opens `https://api.netlify.com/auth?provider=github&site_id=...` and
shows **"Not Found."** Root cause — `public/admin/editor/config.yml` declares
`backend: name: github` but leaves **both** hosted-auth blocks commented out, so
Sveltia/Decap's GitHub backend has no `base_url` and falls back to the legacy
Netlify OAuth endpoint, which is decommissioned for non-Netlify sites. A static
GitHub Pages site has no server to run an OAuth callback, so the editor needs a
relay. This plan wires the **password Worker** already shipped in
`cms-auth-worker/` as that relay, so editors get a password prompt at sign-in
and commit through the Worker's stored PAT. It also addresses the second
complaint — `/admin` (the dashboard) being reachable with no auth — by adding a
**client-side gate** in front of the dashboard. (Note: on static hosting this is
a deterrent, not real security; the page source is public. The real auth gate is
the Worker, which actually controls write access.)

## Key Decisions

- **Password Worker for editor auth (chosen over OAuth relay)** — the repo
  already ships `cms-auth-worker/worker.js`, which completes the exact Decap
  `authorizing/authorization:github:success` postMessage handshake after a
  password check. Wiring it needs only two config lines plus a one-time deploy,
  no GitHub OAuth App registration. Trade-off accepted: one shared identity / no
  per-user attribution (documented at the top of `worker.js`).
- **Client-side gate for the dashboard, explicitly labeled a deterrent** — a
  truly server-enforced gate is impossible on static GitHub Pages. We add a
  pre-paint inline gate that prompts for a passcode and unlocks via
  `sessionStorage`, and we are honest in the UI/docs that it only deters casual
  visitors. The passcode is build-time-injected, not committed as a source
  literal, but it still ships in the static HTML — so it is not a secret.
- **Gate lives in `AdminLayout`, not the editor HTML** — the editor at
  `/admin/editor/index.html` is gated by the Worker password already; the
  client gate only needs to cover the Astro dashboard pages, all of which render
  through `AdminLayout.astro`.
- **Pure logic in `src/lib`, mirroring `adminDashboard.ts`/`url.ts`** — the
  gate's passcode-check and storage-key logic go in a framework-free,
  vitest-tested helper so the `.astro` component stays a thin shell, matching
  the existing `src/lib/*.ts` + `*.test.ts` convention.

## Implementation

### 1. Point the CMS at the password Worker

**File**: `public/admin/editor/config.yml`

Under the `backend:` block, activate **Path B** by adding the two hosted lines so
the GitHub backend stops defaulting to Netlify:

```yaml
backend:
  name: github
  repo: jaredcosulich/harvardintech
  branch: main
  base_url: https://cms-auth-worker.<your-subdomain>.workers.dev
  auth_endpoint: auth
```

- Replace `<your-subdomain>` with the real hostname printed by
  `npx wrangler deploy` (see the manual deploy step below). Until a real URL is
  filled in, sign-in will still fail — the value must be the deployed Worker.
- Leave `local_backend: true` in place; it only activates on localhost and does
  not conflict with the hosted password path.
- Do **not** edit `dist/admin/config.yml` — `dist/` is a build artifact and is
  regenerated from `public/` by `astro build`.

**Manual prerequisite (one-time, outside the code edit — performed by the repo
owner, since it needs Cloudflare + a GitHub PAT):**

```bash
cd cms-auth-worker
npx wrangler deploy
npx wrangler secret put CMS_PASSWORD   # the shared editor password
npx wrangler secret put GITHUB_TOKEN   # fine-grained PAT, Contents R/W on this repo only
```

Then copy the `*.workers.dev` URL from the deploy output into `base_url` above.

### 2. Add the dashboard gate logic helper

**New file**: `src/lib/adminGate.ts`

A pure, DOM-free, framework-free module (mirrors `src/lib/adminDashboard.ts`):

- `ADMIN_GATE_STORAGE_KEY` — the `sessionStorage` key marking an unlocked
  session (e.g. `'admin-unlocked'`).
- `isPasscodeCorrect(input: string, expected: string): boolean` — trimmed,
  constant-shape comparison used by the inline gate script.
- A short doc comment stating plainly that this is a casual-visitor deterrent,
  not a security boundary (the passcode ships in static HTML; write access is
  governed by the Worker).

### 3. Add the gate component

**New file**: `src/components/admin/AdminGate.astro`

- Reads the expected passcode from a build-time env var
  (`import.meta.env.ADMIN_GATE_PASSCODE`), with a clearly-named fallback so the
  build never breaks when it's unset.
- Renders a single `is:inline` `<script>` that runs **before paint** to avoid a
  content flash: if `sessionStorage[ADMIN_GATE_STORAGE_KEY] !== '1'`, it hides
  the document, `prompt()`s for the passcode, and on a correct value sets the
  flag and reveals the page; on cancel/incorrect it redirects to the public site
  home via the base-aware path (reuse `withBase('/')` semantics from
  `src/lib/url.ts`).
- Keep styling/markup minimal and consistent with the existing inline-style
  convention used across `src/components/admin/*`.

### 4. Mount the gate in the admin shell

**File**: `src/layouts/AdminLayout.astro`

Render `<AdminGate />` as the first child of `<body>` (before `<AdminHeader />`),
so every page composed through `AdminLayout` — currently just the `/admin`
dashboard — is gated. Import it alongside the existing `AdminHeader` import.

### 5. Update the on-page sign-in guidance

**File**: `src/components/admin/SignInGuide.astro`

- Make the **Password** bullet the primary, recommended path (it is now the wired
  one): note that on the live site the editor shows a password prompt backed by
  the `cms-auth-worker/` Worker.
- Keep Local and GitHub OAuth listed as alternatives, but adjust wording so it no
  longer implies all three are simultaneously live — only Local + Password are.
- Optionally add one line clarifying that this dashboard is a read-only summary
  and that editing happens in the editor after sign-in (reinforces why the gate
  exists).

### 6. Refresh the setup docs

**File**: `CMS_SETUP.md`

- Note that the shipped default is now **Path 2 (Hosted + password)** and that
  `config.yml` carries the `base_url`/`auth_endpoint: auth` lines pointing at the
  deployed Worker.
- Add a short "Dashboard gate" subsection documenting the new client-side gate,
  the `ADMIN_GATE_PASSCODE` build env var, and the explicit caveat that it is a
  deterrent, not server-enforced security.

### 7. Tests

**New file**: `src/lib/adminGate.test.ts`

Mirror `src/lib/adminDashboard.test.ts`: unit-test `isPasscodeCorrect`
(correct match, wrong value, whitespace/trim handling, empty/empty-expected
edge cases) and assert `ADMIN_GATE_STORAGE_KEY` is the expected constant.

## Reused existing code

- `cms-auth-worker/worker.js` — the password relay that already implements the
  Decap `authorizing:github` / `authorization:github:success:<json>` handshake;
  wired, not rewritten.
- `withBase` from `src/lib/url.ts` (glossary entry: `withBase`) — base-aware
  path building for the gate's redirect, so it works under the `/harvardintech`
  Pages subpath and at root.
- `AdminLayout.astro` / `AdminHeader.astro` / `SignInGuide.astro` in
  `src/components/admin/` and `src/layouts/` — existing admin shell the gate and
  guidance changes slot into.
- `src/lib/adminDashboard.ts` + `adminDashboard.test.ts` — the pure-helper +
  vitest pattern that `adminGate.ts` / `adminGate.test.ts` follow.

## Scenarios to Demonstrate

- **Editor sign-in success (live)** — open `/admin/editor/`, click sign in, the
  Worker password form appears, correct password commits a content edit. (No
  more Netlify "Not Found".)
- **Editor sign-in wrong password** — the Worker re-renders the form with
  "Incorrect password" and the popup stays open.
- **Dashboard gate — locked visitor** — first visit to `/admin` prompts for the
  passcode; cancel/incorrect redirects to the public home and no dashboard
  content is shown.
- **Dashboard gate — unlocked session** — correct passcode reveals the
  dashboard, and a reload within the same session does not re-prompt
  (`sessionStorage` flag set).
- **Local editing still works** — on `npm run dev`, `/admin/editor/` still
  offers "Work with Local Repository" (the `local_backend: true` path is
  untouched).
- **Base-path correctness** — gate redirect and editor links resolve under the
  `/harvardintech` GitHub Pages subpath as well as at root.
