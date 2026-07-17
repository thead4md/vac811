import { useEffect, useRef, useState } from 'react';
import './InstagramWall.css';

// Feed id comes from VITE_BEHOLD_FEED_ID (see .env.production); the literal is a
// dev/test fallback so the wall still renders when the env var is absent.
const FEED_ID = import.meta.env.VITE_BEHOLD_FEED_ID || 'RTiQ4suSjFTFM0QVI8lv';
const BEHOLD_SCRIPT = 'https://w.behold.so/widget.js';
// Fallback link target when the widget can't load (CSP/adblock/Behold down).
const PROFILE_URL = 'https://www.instagram.com/811szentjozsef';

export default function InstagramWall({ profileUrl = PROFILE_URL }: { profileUrl?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Inject the Behold widget script once (it hydrates every [data-behold-id]).
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${BEHOLD_SCRIPT}"]`);
    if (!existing) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = BEHOLD_SCRIPT;
      // A blocked (CSP) or unreachable script fires `error` — surface the fallback.
      s.addEventListener('error', () => setFailed(true));
      document.head.append(s);
    }

    // If nothing rendered into the container after a grace period (script blocked,
    // Behold unavailable, or empty feed), show the fallback so the section is
    // never just a blank gap. The widget injects a child element on success, so
    // an empty container after the timeout is a reliable "didn't render" signal.
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (el && el.isConnected && el.childElementCount === 0) setFailed(true);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  if (failed) {
    return (
      <div className="instagram-wall instagram-wall--fallback">
        <a
          className="btn btn--outline"
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Kövess minket Instagramon
        </a>
      </div>
    );
  }

  return (
    <div className="instagram-wall">
      <div ref={containerRef} data-behold-id={FEED_ID} />
    </div>
  );
}
