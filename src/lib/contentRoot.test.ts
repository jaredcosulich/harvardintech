import { describe, it, expect, afterEach } from 'vitest';
import { contentRoot, dataRoot } from './contentRoot';

// contentRoot()/dataRoot() are the redirection seam the codeyam sandbox relies
// on: normally they resolve to the committed `src/content`/`src/data`, but when
// the editor sets CODEYAM_CONTENT_ROOT/CODEYAM_DATA_ROOT (a session sandbox)
// they point there instead — so seeding never touches production. These tests
// pin that env-override precedence, the whole reason the module exists.

describe('contentRoot', () => {
  const prev = process.env.CODEYAM_CONTENT_ROOT;
  afterEach(() => {
    if (prev === undefined) delete process.env.CODEYAM_CONTENT_ROOT;
    else process.env.CODEYAM_CONTENT_ROOT = prev;
  });

  // when the editor points the app at a sandbox, the override wins
  it('returns CODEYAM_CONTENT_ROOT when it is set', () => {
    process.env.CODEYAM_CONTENT_ROOT = '/tmp/sandbox/content';
    expect(contentRoot()).toBe('/tmp/sandbox/content');
  });

  // a production build (no override) reads the committed source dir
  it('defaults to src/content when the override is unset', () => {
    delete process.env.CODEYAM_CONTENT_ROOT;
    expect(contentRoot()).toBe('src/content');
  });
});

describe('dataRoot', () => {
  const prev = process.env.CODEYAM_DATA_ROOT;
  afterEach(() => {
    if (prev === undefined) delete process.env.CODEYAM_DATA_ROOT;
    else process.env.CODEYAM_DATA_ROOT = prev;
  });

  // the singleton data dir follows the same sandbox redirect as content
  it('returns CODEYAM_DATA_ROOT when it is set', () => {
    process.env.CODEYAM_DATA_ROOT = '/tmp/sandbox/data';
    expect(dataRoot()).toBe('/tmp/sandbox/data');
  });

  // a production build (no override) reads the committed data dir
  it('defaults to src/data when the override is unset', () => {
    delete process.env.CODEYAM_DATA_ROOT;
    expect(dataRoot()).toBe('src/data');
  });
});
