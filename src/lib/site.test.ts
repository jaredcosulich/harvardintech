import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// site.ts loads the editable `settings`/`nav` singletons from the resolved data
// root via `readSingleton` (fs read + JSON.parse) at module load — the logic the
// sandbox content-redirect work introduced (replacing the old static JSON
// imports). These tests point CODEYAM_DATA_ROOT at a temp dir with fixtures and
// import the module fresh, proving it reads + parses from the data root rather
// than a hardcoded path.

describe('site singletons', () => {
  const prev = process.env.CODEYAM_DATA_ROOT;
  let tmp: string | null = null;

  afterEach(() => {
    vi.resetModules();
    if (prev === undefined) delete process.env.CODEYAM_DATA_ROOT;
    else process.env.CODEYAM_DATA_ROOT = prev;
    if (tmp) {
      rmSync(tmp, { recursive: true, force: true });
      tmp = null;
    }
  });

  // settings + nav are read from the data root and parsed from JSON, so a
  // sandbox data dir fully drives what the site renders
  it('loads settings and nav from the data root as parsed JSON', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'site-test-'));
    const settings = {
      siteTitle: 'Test Site',
      description: 'A fixture site',
      contactEmail: 'hello@example.com',
      footerText: 'Footer',
      socials: [{ label: 'Twitter', url: 'https://twitter.com/example', icon: 'twitter' }],
    };
    const nav = { items: [{ label: 'Home', url: '/' }, { label: 'Events', url: '/events' }] };
    writeFileSync(join(tmp, 'settings.json'), JSON.stringify(settings));
    writeFileSync(join(tmp, 'nav.json'), JSON.stringify(nav));

    process.env.CODEYAM_DATA_ROOT = tmp;
    vi.resetModules();
    const mod = await import('./site');

    expect(mod.settings.siteTitle).toBe('Test Site');
    expect(mod.settings.contactEmail).toBe('hello@example.com');
    expect(mod.settings.socials).toHaveLength(1);
    expect(mod.settings.socials[0].url).toBe('https://twitter.com/example');
    expect(mod.nav.items.map((i) => i.label)).toEqual(['Home', 'Events']);
  });

  // a different data root yields different values — the loader is not pinned to
  // a single committed file (the sandbox isolation guarantee at the read side)
  it('reflects a second data root on re-import', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'site-test-'));
    writeFileSync(
      join(tmp, 'settings.json'),
      JSON.stringify({ siteTitle: 'Second', description: '', contactEmail: 'x@y.z', footerText: '', socials: [] }),
    );
    writeFileSync(join(tmp, 'nav.json'), JSON.stringify({ items: [] }));

    process.env.CODEYAM_DATA_ROOT = tmp;
    vi.resetModules();
    const mod = await import('./site');

    expect(mod.settings.siteTitle).toBe('Second');
    expect(mod.nav.items).toHaveLength(0);
  });
});
