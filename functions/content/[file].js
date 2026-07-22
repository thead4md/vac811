/**
 * Pages Function: /content/<file> — content fast-path
 * ---------------------------------------------------
 * Serves the site's JSON content files (events, leaders, camps, …) from a
 * Workers KV namespace so editors' changes go live in seconds without a full
 * app rebuild + redeploy. See docs/content-kv-fast-path.md.
 *
 * Flow:
 *   GET /content/events.json
 *     → KV.get("events.json")
 *         → hit:  return the KV value (fresh, editor-updated JSON)
 *         → miss: context.next() → serve the committed static file in dist/
 *
 * Because Functions take priority over static assets on a matching route, this
 * intercepts the same /content/<file> URL that useContent already fetches — no
 * client change needed. Git stays the source of truth: the git→KV sync workflow
 * (.github/workflows/sync-content-kv.yml) writes validated content to KV, and
 * the static files committed to the repo remain the automatic fallback. If the
 * CONTENT binding is absent (e.g. before the owner attaches it) or a key is
 * unset, requests transparently fall through to those static files.
 *
 * Binding (set on the Pages project, not in code):
 *   CONTENT  — Workers KV namespace holding "<file>" → raw JSON string
 *              (key = the filename, e.g. "events.json")
 */

// Only these files are served from KV. Anything else (e.g. the internal
// gallery-pipeline-state.json) falls straight through to the static asset.
const KV_FILES = new Set([
  'leaders.json',
  'camps.json',
  'events.json',
  'rajok.json',
  'settings.json',
  'gallery.json',
  'instagram.json',
]);

export async function onRequest(context) {
  const { request, params, env, next } = context;

  // Only GET/HEAD are cacheable content reads; leave anything else to the
  // asset server (which will 405/serve as appropriate).
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const file = String(params.file || '');
  if (!KV_FILES.has(file) || !env.CONTENT) {
    // Unknown file, or KV not bound yet → committed static file.
    return next();
  }

  let value;
  try {
    value = await env.CONTENT.get(file);
  } catch {
    // KV read failure must never take the page down — fall back to static.
    return next();
  }

  if (value == null) {
    return next();
  }

  return new Response(request.method === 'HEAD' ? null : value, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      // Short TTL: edits should surface within ~a minute; stale-while-revalidate
      // keeps the edge serving instantly while it refreshes in the background.
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
