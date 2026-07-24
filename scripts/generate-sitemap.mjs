#!/usr/bin/env node
// Regenerates public/sitemap.xml from the actual route set (src/lib/seo.ts),
// so the sitemap can't silently drift from the routes that are actually
// prerendered/indexable. Run after adding/removing a public route:
//   node scripts/generate-sitemap.mjs

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_ORIGIN = 'https://vac811.hu';

// path -> { changefreq, priority }. /galeria is a real indexable page (Google
// renders JS) even though it isn't statically prerendered — kept here.
const ROUTES = {
  '/': { changefreq: 'weekly', priority: '1.0' },
  '/rolunk': { changefreq: 'monthly', priority: '0.8' },
  '/tortenet': { changefreq: 'yearly', priority: '0.6' },
  '/cserkeszet': { changefreq: 'yearly', priority: '0.6' },
  '/vezetok': { changefreq: 'monthly', priority: '0.6' },
  '/rajok': { changefreq: 'monthly', priority: '0.6' },
  '/taborok': { changefreq: 'monthly', priority: '0.7' },
  '/naptar': { changefreq: 'weekly', priority: '0.8' },
  '/galeria': { changefreq: 'weekly', priority: '0.7' },
  '/csatlakozas': { changefreq: 'monthly', priority: '0.9' },
  '/kapcsolat': { changefreq: 'yearly', priority: '0.7' },
};

const urls = Object.entries(ROUTES)
  .map(([path, { changefreq, priority }]) =>
    `  <url><loc>${SITE_ORIGIN}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await writeFile(join(ROOT, 'public/sitemap.xml'), xml);
console.log(`Generated public/sitemap.xml (${Object.keys(ROUTES).length} URLs, origin ${SITE_ORIGIN})`);
