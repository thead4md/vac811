import type { CSSProperties } from 'react';
import './BackgroundField.css';
import gombaPattern from '../assets/csapat_gomba.webp';
import gombaPatternDark from '../assets/csapat_gomba_dark.webp';

// Low-contrast line-art backdrop — the "csapat gomba" contour pattern
// hand-drawn by two of our leaders, carried over verbatim from the WP site
// where it sits behind all content as a faint full-page motif.
// Decorative — hidden from assistive tech. Opacity/asset per theme via CSS vars.
// Source assets are 1600px wide (~105KB each) — a prior optimization pass
// shrank them to 600px/~51KB, which "background-size: cover" then upscaled
// 2-4x on typical viewports, visibly blurring the fine concentric lines.
// Don't recompress below ~1200px without checking for that regression.
export default function BackgroundField() {
  return (
    <div
      className="bg-field"
      role="presentation"
      aria-hidden="true"
      style={
        {
          '--bg-field-image': `url(${gombaPattern})`,
          '--bg-field-image-dark': `url(${gombaPatternDark})`,
        } as CSSProperties
      }
    />
  );
}
