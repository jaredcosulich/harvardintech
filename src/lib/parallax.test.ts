import { describe, it, expect, vi, afterEach } from 'vitest';
import { parallaxOffset, parallaxEnabled } from './parallax';

describe('parallaxOffset', () => {
  // A section still below the viewport top (positive rect.top) is pulled UP by
  // the same amount, so the image reads as fixed to the viewport.
  it('returns a negative offset for a section below the viewport top', () => {
    expect(parallaxOffset(300)).toBe(-300);
  });

  // Flush with the viewport top: no translation needed. (`-0 === 0` is true;
  // we compare numerically rather than via Object.is to ignore the sign of zero.)
  it('returns zero when the section is flush with the viewport top', () => {
    expect(parallaxOffset(0) === 0).toBe(true);
  });

  // Once the section has scrolled above the viewport top (negative rect.top),
  // the image is pushed DOWN to stay pinned.
  it('returns a positive offset for a section scrolled above the viewport top', () => {
    expect(parallaxOffset(-450)).toBe(450);
  });
});

describe('parallaxEnabled', () => {
  // Desktop: fine pointer + hover, no reduced-motion preference → parallax on.
  it('enables parallax for fine-hover devices without reduced motion', () => {
    expect(parallaxEnabled({ fineHover: true, reducedMotion: false })).toBe(true);
  });

  // Touch / coarse pointer → off, regardless of motion preference.
  it('disables parallax on non-fine-hover touch devices', () => {
    expect(parallaxEnabled({ fineHover: false, reducedMotion: false })).toBe(false);
  });

  // Reduced-motion preference wins even on a capable desktop.
  it('disables parallax when the user prefers reduced motion', () => {
    expect(parallaxEnabled({ fineHover: true, reducedMotion: true })).toBe(false);
  });

  // Both unfavorable → off.
  it('disables parallax for touch devices with reduced motion', () => {
    expect(parallaxEnabled({ fineHover: false, reducedMotion: true })).toBe(false);
  });
});

describe('initParallax', () => {
  // jsdom has no matchMedia, so stub it: `fineHover` answers the hover/pointer
  // query, `reducedMotion` answers the prefers-reduced-motion query.
  function stubMatchMedia(opts: { fineHover: boolean; reducedMotion: boolean }) {
    window.matchMedia = vi.fn((query: string) => {
      const matches = query.includes('prefers-reduced-motion')
        ? opts.reducedMotion
        : opts.fineHover;
      return { matches, media: query } as MediaQueryList;
    }) as unknown as typeof window.matchMedia;
  }

  // A banner section with a pinned <img>, where the section sits `top` px below
  // the viewport top. Returns the <img> so the test can assert its styles.
  function mountBanner(top: number): HTMLImageElement {
    document.body.innerHTML =
      '<section data-parallax-root><img data-parallax src="x.jpg" alt="" /></section>';
    const root = document.querySelector<HTMLElement>('[data-parallax-root]')!;
    root.getBoundingClientRect = () => ({ top }) as DOMRect;
    return document.querySelector<HTMLImageElement>('img[data-parallax]')!;
  }

  // Each case needs a fresh module so the one-time `initialized` guard is reset.
  async function freshInit() {
    vi.resetModules();
    const mod = await import('./parallax');
    return mod.initParallax;
  }

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  // Desktop (fine hover, no reduced motion): the image is sized to the viewport
  // and pinned via a transform cancelling the section's offset from the top.
  it('pins the banner image to the viewport on a fine-hover desktop', async () => {
    stubMatchMedia({ fineHover: true, reducedMotion: false });
    const img = mountBanner(300);
    const initParallax = await freshInit();
    initParallax();
    expect(img.style.height).toBe('100vh');
    expect(img.style.transform).toBe('translateY(-300px)');
  });

  // Touch / coarse pointer: parallax never activates, so the image keeps its
  // default static cover styling (no height override, no transform).
  it('leaves the image untouched on a non-fine-hover device', async () => {
    stubMatchMedia({ fineHover: false, reducedMotion: false });
    const img = mountBanner(300);
    const initParallax = await freshInit();
    initParallax();
    expect(img.style.height).toBe('');
    expect(img.style.transform).toBe('');
  });

  // Reduced-motion preference wins even on a capable desktop: image stays static.
  it('leaves the image untouched when the user prefers reduced motion', async () => {
    stubMatchMedia({ fineHover: true, reducedMotion: true });
    const img = mountBanner(300);
    const initParallax = await freshInit();
    initParallax();
    expect(img.style.height).toBe('');
    expect(img.style.transform).toBe('');
  });

  // No [data-parallax] images on the page → a clean no-op, not a throw.
  it('is a no-op when there are no parallax images', async () => {
    stubMatchMedia({ fineHover: true, reducedMotion: false });
    document.body.innerHTML = '<section>no banners here</section>';
    const initParallax = await freshInit();
    expect(() => initParallax()).not.toThrow();
  });
});
