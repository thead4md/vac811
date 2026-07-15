/**
 * image-cdn — Cloudflare Worker
 * -----------------------------
 * Sits in front of the Google Drive CDN (lh3.googleusercontent.com) so the
 * public gallery and the Curate approval tool never depend directly on
 * Drive's throttle-prone image endpoint (audit finding P3/C7).
 *
 *   browser  --GET /<driveFileId>?w=<width>-->  THIS WORKER  --fetch+cache-->  Drive
 *
 * Responses are cached at the edge (long TTL, keyed by id+width+format) and
 * served as AVIF/WebP when Cloudflare's Image Resizing is available on this
 * zone (Workers Pro+, "Image Resizing" enabled) — otherwise the original
 * bytes from Drive are passed through unmodified, so the worker degrades to
 * "just a cache" rather than failing outright.
 *
 * Route this worker at e.g. img.vac811.hu/* (see wrangler.toml). No secrets
 * required — Drive images referenced here are already public-by-link.
 */

const ORIGIN = 'https://lh3.googleusercontent.com';
// Round requested widths to a small set of buckets so different tiles
// requesting "247px" vs "251px" still share one cache entry.
const WIDTH_BUCKETS = [80, 160, 240, 320, 480, 640, 800, 1200, 1600, 2000];
const DEFAULT_WIDTH = 800;
const EDGE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — Drive file ids are stable

function bucketWidth(raw) {
  const w = parseInt(raw, 10);
  if (!Number.isFinite(w) || w <= 0) return DEFAULT_WIDTH;
  return WIDTH_BUCKETS.find((b) => b >= w) ?? WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

function pickFormat(acceptHeader) {
  const accept = acceptHeader || '';
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return 'auto';
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://vac811.hu';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(allowedOrigin) });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors(allowedOrigin) });
    }

    const fileId = url.pathname.replace(/^\/+/, '');
    if (!/^[\w-]{10,}$/.test(fileId)) {
      return new Response('Invalid file id', { status: 400, headers: cors(allowedOrigin) });
    }

    const width = bucketWidth(url.searchParams.get('w'));
    const format = pickFormat(request.headers.get('Accept'));

    // Cache key normalizes width/format so equivalent requests share an entry
    // regardless of the exact query string the browser sent.
    const cacheKeyUrl = `https://image-cdn.internal/${fileId}?w=${width}&f=${format}`;
    const cache = caches.default;
    const cached = await cache.match(cacheKeyUrl);
    if (cached) {
      // The stored response already carries correct, single-valued headers
      // (they were set with .set(), not appended) — return it as-is rather
      // than reconstructing headers, which is what introduced duplicates.
      return cached;
    }

    const originUrl = `${ORIGIN}/d/${fileId}=w${width}`;

    let originRes;
    try {
      // `cf.image` requests Cloudflare's Image Resizing product for this fetch.
      // On zones without it enabled this option is silently ignored by the
      // runtime and we just get the origin bytes back — safe either way.
      // Deliberately NOT setting cf.cacheEverything/cacheTtl here: that would
      // trigger Cloudflare's own automatic edge-cache write for this fetch
      // *in addition to* our explicit caches.default.put() below, and the two
      // concurrent writes to overlapping cache entries were duplicating
      // response headers (observed live: CORS headers doubled on cache HITs
      // but not on MISSes). One explicit cache write, no redundant path.
      originRes = await fetch(originUrl, {
        cf: {
          image: format === 'auto' ? undefined : { width, format, quality: 82 },
        },
      });
    } catch {
      originRes = await fetch(originUrl);
    }

    if (!originRes.ok) {
      return new Response('Upstream error', { status: 502, headers: cors(allowedOrigin) });
    }

    const headers = new Headers(originRes.headers);
    headers.set('Cache-Control', `public, max-age=${EDGE_TTL_SECONDS}, immutable`);
    headers.set('Vary', 'Accept');
    for (const [k, v] of Object.entries(cors(allowedOrigin))) headers.set(k, v);

    const response = new Response(originRes.body, { status: originRes.status, headers });
    ctx.waitUntil(cache.put(cacheKeyUrl, response.clone()));
    return response;
  },
};
