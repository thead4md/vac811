#!/usr/bin/env node
// Generates public/og-image.png (1200x630) — the social share preview image
// for Phase 3.2 (og:image / twitter:card summary_large_image). Composed from
// the site's actual logo + brand tokens (src/styles/tokens.css) rather than a
// stock/placeholder image. Re-run after any brand/logo change:
//   node scripts/generate-og-image.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 630;

// Brand tokens (src/styles/tokens.css, light theme)
const BG = '#f5f3ef';
const SURFACE_OFFSET = '#ede9e3';
const PRIMARY = '#2d6a4f';
const TEXT = '#1f2117';
const TEXT_MUTED = '#5e6259';
const GOLD = '#c49a3c';

const logoSvg = await readFile(join(ROOT, 'public/logo.svg'), 'utf-8');
// Recolor the logo to the brand primary green and strip its own dimensions so
// it can be scaled via the <image>/<svg> wrapper below.
const logoInner = logoSvg
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/fill="rgb\(0,0,0\)"/g, `fill="${PRIMARY}"`)
  .replace(/<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

const LOGO_SIZE = 220;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Sora', 'Work Sans', sans-serif; font-weight: 700; }
      .tagline { font-family: 'General Sans', 'Work Sans', sans-serif; font-weight: 500; }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="${PRIMARY}"/>
  <rect x="0" y="${HEIGHT - 10}" width="${WIDTH}" height="10" fill="${GOLD}"/>

  <!-- Decorative offset panel -->
  <rect x="60" y="60" width="${WIDTH - 120}" height="${HEIGHT - 120}" rx="24" fill="${SURFACE_OFFSET}"/>

  <!-- Logo -->
  <g transform="translate(${(WIDTH - LOGO_SIZE) / 2}, 110)">
    <svg width="${LOGO_SIZE}" height="${LOGO_SIZE}" viewBox="0 0 6520 6400">
      ${logoInner}
    </svg>
  </g>

  <text x="${WIDTH / 2}" y="400" text-anchor="middle" class="title" font-size="56" fill="${TEXT}">
    811. Szent József Cserkészcsapat
  </text>
  <text x="${WIDTH / 2}" y="460" text-anchor="middle" class="tagline" font-size="30" fill="${TEXT_MUTED}">
    Vác &#183; Magyar Cserkészszövetség &#183; 1929 óta
  </text>
  <text x="${WIDTH / 2}" y="520" text-anchor="middle" class="tagline" font-size="24" fill="${PRIMARY}">
    vac811.hu
  </text>
</svg>
`;

const outPath = join(ROOT, 'public/og-image.png');
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log(`Generated ${outPath} (${WIDTH}x${HEIGHT})`);
