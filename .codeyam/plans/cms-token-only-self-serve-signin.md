---
title: "cms: Token-only self-serve sign-in (remove password Worker)"
mode: ui
createdAt: "2026-06-15T12:37:22Z"
source: manual
prefix: "cms"
---

## Summary

Make Sveltia's **"Sign in with Token"** the single, well-documented hosted
editing path so a non-technical editor can set themselves up with nothing but a
GitHub account — no Cloudflare account, no Worker, no service to run. The editor
creates a fine-grained GitHub Personal Access Token (Contents: Read & Write on
this repo), clicks **Sign in with Token** at the live `/admin/editor/` URL, and
pastes it; the token is stored locally in their browser and used to commit
directly to the repo. We point `config.yml` at the plain GitHub backend (drop
the `base_url`/`auth_endpoint` placeholder that pointed at the never-deployed
Worker) and set `auth_methods: [token]` so the login screen shows **only** the
"Sign in with Token" button — no dead OAuth button to confuse anyone. We delete
the `cms-auth-worker/` directory and the password path entirely,
rewrite the in-product **Signing in** guide on `/admin` to a clear step-by-step
for the Token path (plus Local for the repo owner), and bring `README.md` and
`CMS_SETUP.md` down to just those two paths.

## Key Decisions

- **Token auth over OAuth/password Worker** — Sveltia (unlike Decap) ships a
  built-in "Sign in with Token" flow that needs no relay and no external
  service, which is exactly the "set up myself, nothing to run" goal. The
  password Worker required a Cloudflare account + deploy + secret rotation and
  was never actually deployed (the `base_url` still held a `<your-subdomain>`
  placeholder), so removing it deletes dead, confusing config rather than a
  working feature.
- **Hide the OAuth button with `auth_methods: [token]`** — rather than document
  around the dead "Sign in with GitHub" button (which, with no relay, would fail
  if clicked), Sveltia's `auth_methods` backend option lets us restrict the login
  screen to token sign-in only. Setting `auth_methods: [token]` removes the OAuth
  button entirely, so the editor sees a single, unambiguous **"Sign in with
  Token"** action. The array must contain at least one method, so `[token]` is
  the minimal valid value.
- **Fine-grained PAT, least privilege** — the documented token is a fine-grained
  PAT scoped to **only this repo** with **Contents: Read & Write** (the single
  permission the CMS needs). Editors set their own expiry. No classic
  broad-scope tokens.
- **Keep the `/admin` dashboard passcode gate (`AdminGate.astro`) as-is** — it's
  a separate "don't stumble into the dashboard" deterrent, unrelated to CMS auth.
  Only its code comment, which currently calls the Worker "the real write-access
  boundary," needs updating: with the Worker gone, the real write boundary is
  each editor's GitHub token.
- **Leave `local_backend: true`** — the Local path (repo owner runs a dev server,
  "Work with Local Repository") stays as the zero-auth path for the owner. Only
  the hosted **password** path is removed; Local and Token remain.
- **Do not touch `.codeyam/plans/completed/*`** — those are historical records
  that legitimately describe the old password Worker; they stay as-is.

## Implementation

### 1. Point the CMS backend at token auth

**File**: `public/admin/editor/config.yml`

In the `backend:` block, remove the `base_url` and `auth_endpoint` lines (the
ones pointing at `https://cms-auth-worker.<your-subdomain>.workers.dev` /
`auth`) and all the "Hosted + password" / "Path A / Path B" comment scaffolding
around them. Leave the backend as:

```yaml
backend:
  name: github
  repo: jaredcosulich/harvardintech
  branch: main
  # Login screen shows only "Sign in with Token" (no unwired OAuth button).
  auth_methods: [token]
```

Rewrite the explanatory comment above `backend:` so it documents the two
remaining paths only:
- **Token (hosted)** — editors click "Sign in with Token" at `/admin/editor/`
  and paste a fine-grained GitHub PAT (Contents: Read & Write on this repo);
  Sveltia stores it locally and commits with it. No relay, no service.
- **Local** — `local_backend: true` (kept, further down) covers the owner's
  "Work with Local Repository" flow on a dev server.

Keep `local_backend: true`, `media_folder`, `public_folder`, and the entire
`collections:` block unchanged (the
`astro_cms_config_fields_subset_of_content_schema` contract still applies — do
not alter field names).

### 2. Update the editor host page comment

**File**: `public/admin/editor/index.html`

In the HTML comment, change the line that lists the auth backends ("GitHub
OAuth, a password-gated Cloudflare Worker, or local-repository mode") to
describe the two real options: **token sign-in** (paste a GitHub PAT) or
**local-repository mode**. Remove the Cloudflare Worker mention. No markup or
script changes — only the comment.

### 3. Rewrite the in-product "Signing in" guide

**File**: `src/components/admin/SignInGuide.astro`

Replace the current Password/Local/OAuth bullets with a clear, editor-friendly
walkthrough of the **Token** path as the primary one, plus **Local** for the
owner. Keep the existing section styling/tokens. Content to convey:

- **Sign in with a GitHub token (live site)** — numbered steps a non-technical
  editor can follow:
  1. Have a GitHub account with write access to `jaredcosulich/harvardintech`.
  2. On GitHub: **Settings → Developer settings → Fine-grained tokens →
     Generate new token**. Repository access: **Only select repositories →
     jaredcosulich/harvardintech**. Permissions: **Repository permissions →
     Contents → Read and write**. Choose an expiry. Generate and copy the token.
  3. At `/admin/editor/`, click **"Sign in with Token"** (the only button shown,
     because `auth_methods: [token]` is set), paste the token. It's stored in
     your browser only; edits commit straight to the repo and the site
     redeploys.
- **Local (repo owner)** — run a dev server and choose "Work with Local
  Repository"; no account, no token.
- Update the header comment block at the top of the file (which currently says
  the wired path is Password backed by `cms-auth-worker/`) to reflect Token +
  Local. Point to `CMS_SETUP.md` for the authoritative steps.

Remove every reference to Password / `cms-auth-worker/` from this component.

### 4. Refresh the AdminGate comment

**File**: `src/components/admin/AdminGate.astro`

Leave the passcode-gate behavior unchanged. Update only the doc comment near the
top that reads "the Cloudflare Worker in cms-auth-worker/ is the real
write-access boundary" — replace it with: the real write-access boundary is now
each editor's GitHub token (Contents: Read & Write), entered via Sveltia's "Sign
in with Token"; this passcode is only a deterrent against stumbling into the
dashboard.

### 5. Delete the password Worker

**Remove directory**: `cms-auth-worker/` (both `worker.js` and `wrangler.toml`).

The password sign-in path is gone, so the Worker, its `CMS_PASSWORD`/
`GITHUB_TOKEN` secrets, and its `wrangler` config are no longer referenced by
anything. Confirm no remaining source/doc file references `cms-auth-worker`
after the edits in this plan (the only legitimate leftovers are under
`.codeyam/plans/completed/`, which we intentionally don't touch).

### 6. Trim README to Local + Token

**File**: `README.md`

- In the intro paragraph, change the auth description from "the three sign-in
  paths (local, GitHub OAuth, shared password)" to the two real paths: **Local**
  and **Token (paste a GitHub PAT)**.
- In the "Project shape" tree, remove the `cms-auth-worker/` line.
- Keep the rest (CRM dashboard at `/admin`, editor at `/admin/editor/`) intact.

### 7. Rewrite CMS_SETUP.md to two paths

**File**: `CMS_SETUP.md`

- Remove the "Build agent: ask first" three-path callout and the GitHub-OAuth /
  Password sections (`### 1. Hosted + GitHub OAuth`, `### 2. Hosted + password`)
  and all `wrangler` / `CMS_PASSWORD` / `cms-auth-worker/` instructions.
- Replace the "Choosing an editing path" table with a two-row table: **Token
  (hosted)** and **Local**.
- Write a primary **"Hosted editing with a GitHub token"** section: the
  fine-grained PAT steps (repo-scoped, Contents: Read & Write), the "Sign in with
  Token" button, the local-storage / per-editor note, and token expiry/rotation
  guidance. Note that `auth_methods: [token]` in `config.yml` is what keeps the
  login screen token-only (no OAuth button), and mention how to re-enable OAuth
  later (add a relay + `oauth` to `auth_methods`) for anyone who wants it.
- Keep the **Local** section (already accurate: `local_backend: true`, dev
  server, "Work with Local Repository").
- Keep "Keeping the schema honest" and "Editing without the CMS" unchanged.

## Reused existing code

- `SignInGuide.astro` from `src/components/admin/SignInGuide.astro` — rewritten
  in place; already composed into `/admin` via `src/pages/admin/index.astro`.
- `AdminGate.astro` from `src/components/admin/AdminGate.astro` — comment-only
  update; passcode-gate logic (`src/lib/adminGate.ts`, `ADMIN_GATE_STORAGE_KEY`)
  reused unchanged.
- `DashboardSummary.astro` / `CollectionCountGrid.astro` / `adminDashboard.ts` —
  unchanged; the dashboard layout and `editorHref` wiring stay as-is.
- `config.yml` `collections:` block + `astro_cms_config_fields_subset_of_content_schema`
  contract — preserved; only the `backend:` block changes.

## Scenarios to Demonstrate

- **`/admin` dashboard, "Signing in" guide** — shows the Token-path numbered
  steps and the Local fallback, with no Password/Worker mentions.
- **Editor login screen** — editor reaches `/admin/editor/` and sees a single
  "Sign in with Token" button (OAuth hidden via `auth_methods: [token]`).
- **Token guide, empty/first-time editor** — a brand-new editor with only a
  GitHub account can follow the steps end-to-end (PAT creation → paste → commit).
- **Owner Local path** — dev server + "Work with Local Repository" still works
  with no token.
- **Docs consistency** — `README.md` and `CMS_SETUP.md` describe exactly two
  paths (Token, Local); a repo-wide search for `cms-auth-worker` / `CMS_PASSWORD`
  finds nothing outside `.codeyam/plans/completed/`.
