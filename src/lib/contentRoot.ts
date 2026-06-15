// Resolve where the app reads its content/data from. Normally this is the
// committed production source (`src/content`, `src/data`). During a codeyam
// session the app is pointed at a *sandbox* copy under
// `.codeyam/tmp/content-sandbox/` (via the `CODEYAM_CONTENT_ROOT` /
// `CODEYAM_DATA_ROOT` env vars set by `astro.config.mjs` in dev) so that
// seeding a scenario never writes to — or deletes — the committed markdown the
// site ships. A production `astro build` sets neither var, so it reads
// `src/content` / `src/data` unchanged. See `astro.config.mjs` and
// `.codeyam/seed-adapter.ts` for the two writers that agree on this convention.

/** Directory the content collections (`blog`, `team`, …) are loaded from. */
export function contentRoot(): string {
  return process.env.CODEYAM_CONTENT_ROOT ?? 'src/content';
}

/** Directory the JSON singletons (`settings`, `nav`) are loaded from. */
export function dataRoot(): string {
  return process.env.CODEYAM_DATA_ROOT ?? 'src/data';
}
