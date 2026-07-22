// One-off generator for public/og-image.png (1200x630) — the site-wide social
// share image referenced by og:image / twitter:image. Rerun manually if the
// brand palette, logo, or copy changes; not part of the build pipeline since
// the output is a committed static asset.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logoSvg = await readFile(path.join(root, 'public/logo.svg'), 'utf-8');
const logoInner = logoSvg.replace(/^<\?xml[^>]*\?>\s*/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '');

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2d6a4f"/>
      <stop offset="100%" stop-color="#163b2e"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="220" fill="#ffffff" opacity="0.04"/>
  <circle cx="120" cy="580" r="260" fill="#ffffff" opacity="0.04"/>
  <g transform="translate(90, 165) scale(0.047)">
    ${logoInner}
  </g>
  <text x="380" y="290" font-family="Sora, 'Helvetica Neue', sans-serif" font-weight="700" font-size="64" fill="#f5f3ef">811. Szent József</text>
  <text x="380" y="365" font-family="Sora, 'Helvetica Neue', sans-serif" font-weight="700" font-size="64" fill="#f5f3ef">Cserkészcsapat</text>
  <text x="380" y="425" font-family="'General Sans', 'Helvetica Neue', sans-serif" font-weight="400" font-size="32" fill="#b7dccf">Cserkészek Vácon 1929 óta</text>
  <rect x="380" y="465" width="64" height="6" rx="3" fill="#c49a3c"/>
</svg>
`.trim();

const png = await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toBuffer();
await writeFile(path.join(root, 'public/og-image.png'), png);
console.log('Wrote public/og-image.png');
