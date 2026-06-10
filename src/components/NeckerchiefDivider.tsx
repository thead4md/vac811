import type { CSSProperties } from 'react';
import './NeckerchiefDivider.css';
import neckerchiefUrl from '../assets/neckerchief.svg?url';

// The real scout neckerchief border (fleur-de-lis + chevron ribbon, vectorised
// from the team's artwork). Rendered as a CSS mask so the raj-colour gradient
// shows through the shapes — keeps the bundle lean and the artwork undistorted.
// Decorative only — hidden from assistive tech.
interface Props {
  /** Visual weight / spacing variant */
  variant?: 'section' | 'footer';
  className?: string;
}

export default function NeckerchiefDivider({ variant = 'section', className = '' }: Props) {
  return (
    <div
      className={`neckerchief neckerchief--${variant} ${className}`.trim()}
      role="presentation"
      aria-hidden="true"
    >
      <span
        className="neckerchief__art"
        style={{ '--neckerchief-src': `url(${neckerchiefUrl})` } as CSSProperties}
      />
    </div>
  );
}
