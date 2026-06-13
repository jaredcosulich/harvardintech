---
title: 'Welcome to your Astro site'
date: 2026-01-01
summary: 'A static, content-driven site that grows into a dynamic app without a rewrite.'
---

This post lives in a **content collection** — a typed markdown file under
`src/content/blog/`. Astro validates its frontmatter against the schema in
`src/content/config.ts` at build time and renders it to static HTML.

## Editing content

Add a `.md` file to `src/content/blog/` and it appears on the index
automatically. codeyam can also seed a whole set of posts per scenario through
the `content-collection` seed adapter, so you can preview an empty blog, a
ten-post blog, or a single long article without touching the source.

## Growing beyond static

When you need server-rendered routes, add an adapter and opt individual pages
into SSR. Your content collections come along unchanged.
