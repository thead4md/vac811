import './BackgroundField.css';
import gombaPattern from '../assets/csapat_gomba.webp';

// Fixed, low-contrast line-art backdrop — the "csapat gomba" contour pattern
// hand-drawn by two of our leaders, carried over verbatim from the WP site
// where it sits behind all content as a faint full-page motif.
// Decorative — hidden from assistive tech. Opacity per theme via CSS.
export default function BackgroundField() {
  return (
    <div
      className="bg-field"
      role="presentation"
      aria-hidden="true"
      style={{ backgroundImage: `url(${gombaPattern})` }}
    />
  );
}
