import './BackgroundField.css';

// Fixed, low-contrast topographic contour-line backdrop.
// Light/dark tint is driven by a single token (--bg-field-stroke) in BackgroundField.css.
// Decorative — hidden from assistive tech.
export default function BackgroundField() {
  return (
    <div className="bg-field" role="presentation" aria-hidden="true">
      <svg
        className="bg-field__svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.4">
          {/* Concentric topographic contours — two nested "hills" */}
          {Array.from({ length: 9 }).map((_, i) => {
            const k = i * 26;
            return (
              <path
                key={`a${i}`}
                d={`M${-40 + k},${620 - k * 0.6}
                    C ${220 - k},${440 - k} ${420 + k},${560 - k * 0.4} ${640},${430 - k}
                    S ${980 + k},${300 - k} ${1240 - k},${520 - k * 0.5}`}
              />
            );
          })}
          {Array.from({ length: 8 }).map((_, i) => {
            const k = i * 30;
            return (
              <path
                key={`b${i}`}
                d={`M${-60},${180 + k}
                    C ${300 + k},${60 + k} ${560 - k},${300 + k} ${860},${160 + k}
                    S ${1180},${360 + k} ${1280},${220 + k}`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
