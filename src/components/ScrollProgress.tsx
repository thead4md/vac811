import { useEffect, useRef } from 'react';
import './ScrollProgress.css';

// A flag-on-a-pole fixed to the right side of the viewport.
// The flag rises from the bottom of the pole to the top as the page is scrolled.
// Driven by the same rAF-throttled listener as the previous horizontal bar.
export default function ScrollProgress() {
  const shaftRef = useRef<HTMLDivElement>(null);
  const flagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shaft = shaftRef.current;
    const flag = flagRef.current;
    if (!shaft || !flag) return;
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      // progress=0 → flag at bottom; progress=1 → flag at top.
      const shaftH = shaft.clientHeight;
      flag.style.transform = `translateY(${(1 - progress) * shaftH}px)`;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="scroll-pole" role="presentation" aria-hidden="true">
      <div className="scroll-pole__finial" />
      <div className="scroll-pole__shaft" ref={shaftRef}>
        <div className="scroll-pole__flag" ref={flagRef} />
      </div>
    </div>
  );
}
