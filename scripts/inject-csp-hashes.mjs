// Post-build step: inject CSP source hashes for the app's inline <script>s into
// dist/_headers.
//
// Why this exists: the site relies on two inline scripts that MUST run before the
// bundle — the theme-flash guard (index.html) and vite-react-ssg's
// `window.__VITE_REACT_SSG_HASH__ = '<hash>'` setter, which the static-loader
// runtime reads to fetch static-loader-data-manifest-<hash>.json. Our CSP uses
// `script-src 'self' …` with no 'unsafe-inline', so without an allowance the
// browser blocks both. A blocked hash setter leaves the hash undefined, the
// runtime fetches …-undefined.json (served as the SPA index.html by Cloudflare
// Pages), and .json() on that HTML throws "Unexpected token '<'" — React
// Router's error boundary then replaces the whole page.
//
// We can't hardcode the hashes in public/_headers: the SSG hash value is random
// per build, so its script's sha256 changes every build. Instead we compute the
// hashes here, after vite-react-ssg has written the final HTML, and rewrite the
// script-src directive in dist/_headers. This keeps the CSP strict (no blanket
// 'unsafe-inline') while allowing exactly the scripts we ship.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIST = 'dist';
const HEADERS = join(DIST, '_headers');

// Executable inline script types. `application/ld+json`, `importmap`, and other
// data blocks are not executed and are not governed by script-src, so we skip
// them (hashing them would just bloat the directive).
const EXECUTABLE_TYPE = /^(?:$|text\/javascript|application\/javascript|module)$/i;

/** Recursively collect every .html file under a directory. */
function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

if (!existsSync(HEADERS)) {
  console.error(`[inject-csp-hashes] ${HEADERS} not found — did the build run?`);
  process.exit(1);
}

// Collect the exact byte content of every executable inline script across all
// prerendered pages. The browser hashes the exact characters between the tags,
// so we must hash the file bytes verbatim (no trimming, no re-serialization).
const scriptTag = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const hashes = new Map(); // sha256-... -> sample content (for logging)

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(scriptTag)) {
    if (/\bsrc\s*=/i.test(attrs)) continue; // external script — governed by host allowlist
    const typeMatch = attrs.match(/\btype\s*=\s*["']?([^"'\s>]*)/i);
    const type = typeMatch ? typeMatch[1] : '';
    if (!EXECUTABLE_TYPE.test(type)) continue;
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.set(`'sha256-${digest}'`, body.trim().slice(0, 50).replace(/\s+/g, ' '));
  }
}

if (hashes.size === 0) {
  console.warn('[inject-csp-hashes] no inline scripts found — leaving _headers unchanged');
  process.exit(0);
}

// Rewrite the script-src directive: strip any previously injected sha256 sources
// (so the step is idempotent) and append the freshly computed ones.
let headers = readFileSync(HEADERS, 'utf8');
const sources = [...hashes.keys()].sort().join(' ');

const directive = /(script-src\s+)([^;]*?)(\s*;)/i;
if (!directive.test(headers)) {
  console.error('[inject-csp-hashes] could not find a script-src directive in _headers');
  process.exit(1);
}

// Idempotent: strip any previously injected sha256 sources, then re-add the
// current set. A rebuild with unchanged inline scripts produces identical output.
headers = headers.replace(directive, (_m, lead, body, tail) => {
  const cleaned = body.replace(/'sha256-[A-Za-z0-9+/=]+'/g, '').replace(/\s+/g, ' ').trim();
  return `${lead}${cleaned} ${sources}${tail}`;
});

writeFileSync(HEADERS, headers);
console.log(`[inject-csp-hashes] added ${hashes.size} script hash(es) to ${HEADERS}:`);
for (const [h, sample] of hashes) console.log(`  ${h}  // ${sample}…`);
