// Observe native pinch-zoom without causing layout jank.
//
// Pinch-to-zoom is a GPU-composited visual-viewport transform — it does NOT
// reflow the page. The layout shifts and clipping users saw came from the
// OLD handler, which toggled a `zoomed` class on every touchstart/touchend,
// forcing a full-DOM repaint (backdrop-filter removal + background swaps +
// animation pauses) *during* the active gesture.
//
// This version eliminates that jank with three changes:
//  1. No touch listeners. visualViewport.resize already fires when the
//     scale changes — touch events were redundant and fired too often.
//  2. Hysteresis. The `zoomed` class only flips at clear thresholds
//     (scale > 1.08 to engage, < 1.03 to release), so it never flickers as
//     a pinch settles around scale 1.
//  3. requestAnimationFrame batching. The class change is deferred to the
//     next frame so it never interrupts the gesture's compositing.
export default function installMobileZoom() {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const root = document.documentElement;
  const touchDevice = window.matchMedia('(any-pointer: coarse)');
  if (!touchDevice.matches) return () => {};

  const ENGAGE = 1.08; // scale above which we apply the zoomed style
  const RELEASE = 1.03; // scale below which we remove it (hysteresis gap)
  let zoomed = false;
  let rafId = 0;

  const apply = (next) => {
    if (next === zoomed) return;
    zoomed = next;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      root.classList.toggle('zoomed', zoomed);
    });
  };

  const sync = () => {
    const scale = viewport.scale;
    if (scale > ENGAGE) apply(true);
    else if (scale < RELEASE) apply(false);
    // Between RELEASE and ENGAGE the class holds its current state — no
    // flicker as the pinch settles.
  };

  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  window.addEventListener('pageshow', sync);
  touchDevice.addEventListener('change', sync);
  sync();

  return () => {
    cancelAnimationFrame(rafId);
    viewport.removeEventListener('resize', sync);
    viewport.removeEventListener('scroll', sync);
    window.removeEventListener('pageshow', sync);
    touchDevice.removeEventListener('change', sync);
    root.classList.remove('zoomed');
  };
}