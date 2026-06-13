---
title: "GitHub Pages Deployment"
mode: ui
createdAt: "2026-06-13T13:40:03Z"
source: manual
dependsOn: ["landing-page-faithful-reproduction"]
---

## Summary

Ship the statically-exported public site to GitHub Pages via a GitHub Actions
workflow. Covers the static-export configuration details (basePath/assetPrefix
for project pages, `.nojekyll`), the CI build, and the Pages deploy. The landing
page already sets `output: 'export'`; this plan operationalizes publishing it.

## Key Decisions

- **GitHub Actions, not branch-based.** Use the official `actions/upload-pages-artifact`
  + `actions/deploy-pages` flow building from `out/`.
- **Handle project-page base path.** If served from
  `username.github.io/<repo>`, set `basePath`/`assetPrefix` and ensure internal
  links/images respect it; add `.nojekyll` so `_next/` assets are served.
- **No server features.** Confirm the public pages are fully static (the CRM,
  which needs server/runtime, is deployed separately in its own plan).

## Implementation

### 1. Next config for Pages

**File**: `next.config.*`

Confirm `output: 'export'`, `images.unoptimized: true`, and conditional
`basePath`/`assetPrefix` driven by an env var so local dev stays at `/`.

### 2. CI workflow

**New file**: `.github/workflows/deploy-pages.yml`

Build (`npm ci && npm run build`), emit `.nojekyll` into `out/`, upload the
Pages artifact, and deploy on pushes to the default branch. Note: this is a
CI/agent-config-adjacent file under `.github/` — call out the addition in the
editor flow so it isn't a surprise.

## Reused existing code

- The static-export config from `landing-page-faithful-reproduction`.

## Scenarios to Demonstrate

- N/A interactive UI scenario; demonstrate via a successful build of `out/` and
  a working static preview served from a sub-path (verifies basePath handling).
