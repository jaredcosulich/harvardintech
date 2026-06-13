// Prefix an internal absolute path with the configured base path so links
// resolve whether the site is served from the domain root (custom domain,
// base '/') or a project subpath (user.github.io/<repo>, base '/<repo>/').
//
// `import.meta.env.BASE_URL` is derived from `base` in astro.config.mjs and
// always ends with '/': it is '/' in local dev / the codeyam preview and
// '/<repo>/' in the Pages CI build. External URLs, protocol-relative URLs,
// and non-absolute strings (mailto:, #anchor) pass through untouched — only
// internal absolute paths starting with '/' get the base.
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + path;
}
