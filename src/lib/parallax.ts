// Reproduce the `background-attachment: fixed` parallax look on the landing
// banners (Hero, Get Involved) WITHOUT switching to CSS `background-image`.
//
// Both banners deliberately render their photo as an <img src> (via withBase)
// because a CSS `background-image: url()` does not survive the preview reverse
// proxy / Pages base-path rewrite the way an <img> does. So instead of
// `background-attachment: fixed`, we pin the existing <img> to the viewport with
// a scroll handler: each frame we set `translateY(-sectionTop)` on the image so
// the photo appears fixed while its `overflow: hidden` section scrolls over it.
// Visually identical to the fixed-background effect, and proxy/base-path safe.
//
// The pure helpers below carry the math + the enable decision so they can be
// unit-tested without a DOM; `initParallax()` is the thin, idempotent wiring.

// The `translateY` (px) that keeps an image pinned to the viewport top as its
// section scrolls past. `sectionTop` is the section's
// `getBoundingClientRect().top`: positive while the section is below the
// viewport top, zero when flush, negative once it has scrolled above. Returning
// `-sectionTop` cancels that offset so the image stays put relative to the
// viewport.
export function parallaxOffset(sectionTop: number): number {
  return -sectionTop;
}

// The desktop-only / reduced-motion gate as pure logic. `background-attachment:
// fixed` (and this emulation) is janky or ignored on touch browsers, so we only
// enable it for fine-pointer + hover-capable devices, and never when the user
// has asked for reduced motion.
export function parallaxEnabled(opts: {
  fineHover: boolean;
  reducedMotion: boolean;
}): boolean {
  return opts.fineHover && !opts.reducedMotion;
}

// Idempotent DOM wiring. No-op under SSR / vitest (no window/document) and a
// no-op on re-invocation (Astro dedupes the hoisted module, but both banners
// import it, so guard anyway). When parallax is disabled the images stay their
// default static `object-fit: cover` — exactly today's behavior.
let initialized = false;

export function initParallax(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (initialized) return;
  initialized = true;

  const enabled = parallaxEnabled({
    fineHover: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  if (!enabled) return;

  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>('img[data-parallax]'),
  );
  if (images.length === 0) return;

  // Pin each image to the full viewport height; the section's `overflow:
  // hidden` clips it to a moving window onto the photo.
  for (const img of images) {
    img.style.height = '100vh';
    img.style.willChange = 'transform';
  }

  const update = () => {
    for (const img of images) {
      const root = img.closest<HTMLElement>('[data-parallax-root]');
      if (!root) continue;
      const offset = parallaxOffset(root.getBoundingClientRect().top);
      img.style.transform = `translateY(${offset}px)`;
    }
  };

  // rAF-throttle scroll/resize so we only touch the DOM once per frame.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update(); // set the initial position
}
