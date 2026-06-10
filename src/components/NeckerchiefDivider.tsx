import './NeckerchiefDivider.css';

// The scout neckerchief / chevron ribbon in the raj colours.
// Used under section headings and as the footer divider (per the visual-identity spec).
// Decorative only — hidden from assistive tech.
const RAJ_COLORS = [
  '#2d6a4f', // forest (primary)
  '#c49a3c', // gold
  '#8b2635', // deep red
  '#2563a0', // blue
  '#8b5e3c', // earth
  '#52a87e', // light green
];

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
      <svg
        className="neckerchief__svg"
        viewBox="0 0 240 16"
        preserveAspectRatio="none"
        focusable="false"
      >
        {RAJ_COLORS.map((color, i) => (
          <polygon
            key={color}
            points={`${i * 40},0 ${i * 40 + 24},0 ${i * 40 + 40},8 ${i * 40 + 24},16 ${i * 40},16 ${i * 40 + 16},8`}
            fill={color}
          />
        ))}
      </svg>
    </div>
  );
}
