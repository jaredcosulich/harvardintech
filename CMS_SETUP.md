# Content Management Setup

This site stores content as typed markdown in `src/content/`. A friendly,
browser-based editing UI — **Sveltia CMS**, a modern Decap-compatible editor —
is wired in at **`/admin/editor/`**, fronted by a lightweight CRM dashboard at
**`/admin`** (live content counts + sign-in guidance). The editor commits
markdown straight to your content collections, so editors never touch code and
the static-hosting model is unchanged: GitHub Pages still serves plain HTML, and
codeyam can still seed the same files per scenario through the
`content-collection` seed adapter.

> **Build agent: ask first.** Before wiring auth, ask the user **which editing
> path(s) they want** — the three below can coexist (e.g. local for yourself +
> hosted OAuth for a teammate). Only the "Hosted + password" path adds a service
> outside GitHub Pages. Wire exactly what they pick; don't assume.

## The admin app

- `src/pages/admin/index.astro` renders the CRM **dashboard** at `/admin` — a
  build-time summary of every editable collection (counts read from the same
  `src/content/*` the public site uses) with an "Open content editor" button.
- `public/admin/editor/index.html` loads Sveltia from its CDN and auto-mounts at
  `/admin/editor/` (Astro serves `public/` verbatim — works live and locally).
- `public/admin/editor/config.yml` is the Decap/Sveltia config. Its `collections`
  block mirrors `src/content/config.ts`; see **Keeping the schema honest** below.
  The shipped default is **Path 2 (Hosted + password)** — the `backend:` block
  carries `base_url` + `auth_endpoint: auth` pointing at the `cms-auth-worker/`
  Worker. Replace the `<your-subdomain>` placeholder with your deployed Worker's
  hostname (see below) before hosted sign-in will work.

## Choosing an editing path

| Path | Editors need | Extra service | Best for |
| --- | --- | --- | --- |
| **GitHub OAuth** | a GitHub account with repo write | an OAuth relay (free) | teammates; per-user commit attribution |
| **Password** | the shared password | one free Cloudflare Worker | non-technical editors, no GitHub account |
| **Local** | the repo cloned locally | none | yourself / quick edits |

### 1. Hosted + GitHub OAuth

Editors open the editor at `/admin/editor/` (linked from the `/admin` dashboard)
on the live site and click "Sign in with GitHub". GitHub Pages can't run the
OAuth callback itself, so point the CMS at an OAuth relay.

**Pre-flight:** a GitHub account with write access to this repo.

1. Register a GitHub OAuth App (Settings → Developer settings → OAuth Apps).
   Set the callback URL to your relay's callback (Sveltia's hosted helper, or a
   self-hosted relay such as `sveltia/sveltia-cms-auth` on Cloudflare Workers).
2. In `public/admin/editor/config.yml`, under `backend:` add:
   ```yaml
   base_url: https://<your-oauth-relay>
   auth_endpoint: oauth/authorize   # match your relay's route
   ```
3. Store the OAuth App's **client secret** wherever the relay expects it (a
   Worker secret for the self-hosted relay) — never in this repo.

### 2. Hosted + password

The exact "password at the same domain" UX, backed by the minimal Cloudflare
Worker shipped in **`cms-auth-worker/`**. This is the one path that adds a
non-GitHub free service.

**Pre-flight:** a free Cloudflare account; a fine-grained GitHub PAT scoped to
**Contents: Read & Write on this repo only**.

1. Deploy the Worker:
   ```bash
   cd cms-auth-worker
   npx wrangler deploy
   npx wrangler secret put CMS_PASSWORD   # the shared editor password
   npx wrangler secret put GITHUB_TOKEN   # the fine-grained PAT
   ```
2. In `public/admin/editor/config.yml`, under `backend:` add:
   ```yaml
   base_url: https://<name>.<subdomain>.workers.dev
   auth_endpoint: auth
   ```
3. Editors open `/admin/editor/`, get a password prompt, and commit as the PAT's
   identity. See the security trade-off documented at the top of
   `cms-auth-worker/worker.js` (one shared identity, no per-user attribution).

### 3. Local

Always available, no auth, no server.

**Pre-flight:** the repo cloned locally.

1. `local_backend: true` is already set in `public/admin/editor/config.yml`.
2. Run `npm run dev`, open `/admin/editor/` (or click "Open content editor" from
   the `/admin` dashboard), and choose **"Work with Local Repository"**.
3. Edit posts; Sveltia writes straight to `src/content/`. Commit and push
   yourself — the change goes live on the next GitHub Pages deploy.

## Dashboard gate

The `/admin` dashboard is fronted by a lightweight **client-side passcode gate**
(`src/components/admin/AdminGate.astro`, logic in `src/lib/adminGate.ts`). On the
live site, first visit prompts for a passcode; a correct value unlocks the
dashboard for the rest of the browser session (`sessionStorage`), and
cancel/incorrect redirects to the public home.

- **Set the passcode** with the build-time env var `ADMIN_GATE_PASSCODE` (e.g. a
  CI/Pages build secret). When unset, a clearly-named non-secret fallback keeps
  the build from breaking.
- **The gate runs only in production builds.** On a local dev server / the
  codeyam preview the dashboard is left open — the same "local is trusted"
  stance as `local_backend: true` — so editing and previewing stay frictionless.
- **It is a deterrent, not server-enforced security.** On static GitHub Pages the
  passcode ships inside the public HTML, so anyone reading source can find it. It
  only keeps casual visitors out of the dashboard. The real write-access boundary
  is the password Worker above, which holds the GitHub token server-side and is
  what actually gates commits.

## Keeping the schema honest

`public/admin/editor/config.yml` and `src/content/config.ts` describe the **same**
markdown files and must stay in sync: every field `name` in a collection must
exist in the matching Astro schema (the reserved `body` field is the markdown
body, not frontmatter, so it has no schema counterpart). codeyam's template test
`astro_cms_config_fields_subset_of_content_schema` enforces this for the shipped
template. When you add a content field, add it in **both** files.

## Editing without the CMS

You can always skip the CMS and edit content directly:

1. Create or edit a `.md` file under `src/content/blog/`.
2. Give it frontmatter matching `src/content/config.ts` (`title`, `date`,
   optional `summary`, optional `coverImage`).
3. Run `npm run dev`; the post appears on the index automatically.
