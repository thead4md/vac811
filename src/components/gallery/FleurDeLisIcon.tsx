// Hand-authored scouting fleur-de-lis, matching the site's existing convention
// of inline SVGs in JSX (see Footer.tsx) rather than a sprite (public/icons.svg
// has no scouting motif — see docs/galeria-audit.md).
export default function FleurDeLisIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c-1.5 2-1.5 4.2 0 6-1.5-1-3.4-.7-4.4.9-.9 1.4-.5 3.2.8 4.2-1.7.1-3 1.5-3 3.2 0 1.5 1 2.8 2.4 3.1-.3.6-.5 1.3-.5 2.1h3.2c0-1 .5-1.8 1.5-2.3v-3.6c-1.2-.4-2-1.5-2-2.7 0-.6.2-1.1.5-1.6-1-.2-1.8-1.1-1.8-2.1 0-1.2 1-2.2 2.2-2.2.5 0 1 .2 1.4.4-.3-.7-.4-1.5-.3-2.3-.1.8 0 1.6.3 2.3.4-.3.9-.4 1.4-.4 1.2 0 2.2 1 2.2 2.2 0 1-.8 1.9-1.8 2.1.3.5.5 1 .5 1.6 0 1.2-.8 2.3-2 2.7v3.6c1 .5 1.5 1.3 1.5 2.3h3.2c0-.8-.2-1.5-.5-2.1 1.4-.3 2.4-1.6 2.4-3.1 0-1.7-1.3-3.1-3-3.2 1.3-1 1.7-2.8.8-4.2-1-1.6-2.9-1.9-4.4-.9 1.5-1.8 1.5-4 0-6z" />
    </svg>
  );
}
