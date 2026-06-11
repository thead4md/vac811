import { useEffect, useRef, useState } from 'react';
import './InstagramWall.css';

// Behold.so widget ID — set VITE_BEHOLD_FEED_ID in your .env.production
// or replace the fallback string with the actual feed ID after setup.
const FEED_ID = import.meta.env.VITE_BEHOLD_FEED_ID as string | undefined;
const BEHOLD_SCRIPT = 'https://w.behold.so/widget.js';

export default function InstagramWall() {
  const [failed, setFailed] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!FEED_ID) return;

    // Avoid double-inserting if the component remounts
    if (document.querySelector(`script[src="${BEHOLD_SCRIPT}"]`)) return;

    const script = document.createElement('script');
    script.src = BEHOLD_SCRIPT;
    script.async = true;
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Leave the script in the DOM — removing it would break the widget if
      // the component unmounts and remounts (e.g. React Strict Mode).
    };
  }, []);

  if (!FEED_ID || failed) {
    return (
      <div className="instagram-wall instagram-wall--fallback">
        <a
          href="https://instagram.com/811szentjozsef"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary"
        >
          Kövess minket Instagramon – @811szentjozsef
        </a>
      </div>
    );
  }

  return (
    <div className="instagram-wall">
      {/* Behold.so responsive feed widget */}
      {/* @ts-expect-error custom web component attribute */}
      <behold-widget feed-id={FEED_ID} />
    </div>
  );
}
