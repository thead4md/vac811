import { useEffect, useRef, useState } from 'react';

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
  // Start at the final `value` so the server-prerendered HTML and the client's
  // first (hydration) render agree — initialising to 0 on the client while the
  // server emitted the final number would trip a hydration mismatch, and it also
  // keeps the real figure in the static HTML for crawlers/no-JS. The count-up
  // animation (0 → value) is kicked off from the effect, post-hydration, when the
  // element scrolls into view.
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || skipAnimation()) return;

    let raf = 0;
    let started = false;

    const run = () => {
      setDisplay(0);
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
