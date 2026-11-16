/**
 * components/splash/slow-scroll.ts
 *
 * Scrolls to a section over about a second, easing in and out, so the page
 * is seen to travel there instead of jumping. A visitor who has asked for
 * reduced motion gets the plain jump. Either way the section takes focus, so
 * a keyboard or screen-reader user lands where the link said it would go.
 */

export function slowScrollTo(id: string, ms = 1100): void {
  const target = document.getElementById(id);
  if (!target) return;
  const land = () => {
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    history.replaceState(null, "", `#${id}`);
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { target.scrollIntoView(); land(); return; }

  const from = window.scrollY;
  const to = Math.min(target.getBoundingClientRect().top + from - 12, document.documentElement.scrollHeight - window.innerHeight);
  const start = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let stopped = false;
  // If the visitor scrolls or touches the page themselves, let go at once.
  const stop = () => { stopped = true; };
  window.addEventListener("wheel", stop, { passive: true, once: true });
  window.addEventListener("touchstart", stop, { passive: true, once: true });
  function step(now: number) {
    if (stopped) return;
    const t = Math.min(1, (now - start) / ms);
    window.scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
    else land();
  }
  requestAnimationFrame(step);
}
