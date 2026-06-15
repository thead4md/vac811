import { useEffect } from 'react';
import './InstagramWall.css';

const FEED_ID = 'RTiQ4suSjFTFM0QVI8lv';
const BEHOLD_SCRIPT = 'https://w.behold.so/widget.js';

export default function InstagramWall() {
  useEffect(() => {
    if (document.querySelector(`script[src="${BEHOLD_SCRIPT}"]`)) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = BEHOLD_SCRIPT;
    document.head.append(s);
  }, []);

  return (
    <div className="instagram-wall">
      <div data-behold-id={FEED_ID} />
    </div>
  );
}
