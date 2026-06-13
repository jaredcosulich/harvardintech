// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Astro static-site config for free GitHub Pages hosting.
//
// `output: 'static'` pre-renders every route to plain HTML at build time —
// nothing runs on a server, so the whole `dist/` folder drops onto GitHub
// Pages (or any static host) as-is. When you outgrow static and need
// server-rendered routes, this stays an in-framework upgrade: add an adapter,
// flip `output` to `'server'`, and opt individual routes into SSR with
// `export const prerender = false`. Content collections survive that move
// unchanged, so the codeyam data/scenario model built on them keeps working.
//
// `base`/`site` are env-driven so local dev and the codeyam preview always
// serve from '/', while the Pages CI build can publish under a project subpath.
// Two base modes, chosen by the deploy environment:
// - Custom domain (e.g., harvardintech.com): leave DEPLOY_BASE_PATH unset → base '/'.
// - Default project site (e.g., user.github.io/repo): the deploy workflow sets
//   DEPLOY_BASE_PATH=/<repo-name> and PAGES_SITE=https://<user>.github.io.
// Hand-written internal links are prefixed with import.meta.env.BASE_URL via
// src/lib/url.ts so they resolve under either base.
const base = process.env.DEPLOY_BASE_PATH || '/';
const site = process.env.PAGES_SITE || 'https://jaredcosulich.github.io';

export default defineConfig({
  output: 'static',
  site,
  base,
  integrations: [react(), sitemap()],
});
