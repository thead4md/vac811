import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect on the client (so the reset-to-0 lands before the browser
// paints — no flash of the final value), but a no-op useEffect during SSR to
// avoid React's "useLayoutEffect does nothing on the server" warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Whether to skip the count-up and render the final value immediately.
function skipAnimation(): boolean {
  return (
    typeof window === 'undefined' ||
    typeof IntersectionObserver === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface Props {
  /** Target number to count up to. */
  value: number;
  /** Optional suffix rendered after the number, e.g. "+". */
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
}

// Counts from 0 up to `value` once the element scrolls into view.
// Reduced-motion users (and environments without IntersectionObserver) see the
// final value immediately — no animation.
export default function CountUp({ value, suffix = '', duration = 1400 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // The server and the first client render both show the final value, so the
  // hydrated markup matches the prerendered HTML (no hydration mismatch). The
  // layout effect below — client-only, before first paint — drops to 0 and
  // animates up when the element scrolls into view. Reduced-motion / no-IO
  // environments keep the final value and never reset.
  const [display, setDisplay] = useState(value);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || skipAnimation()) return;

    // Reset to 0 before paint so the count-up starts from zero without briefly
    // flashing the final value the initial render committed. This deliberate
    // one-time pre-paint reset is why the render-time initializer stays at
    // `value` (SSR-safe) rather than 0.
    setDisplay(0);

    let raf = 0;
    let started = false;

    const run = () => {
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        // easeOutCubic for a lively-but-settled finish
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            run();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref}>
      {display.toLocaleString('hu-HU')}{suffix}
    </span>
  );
}
