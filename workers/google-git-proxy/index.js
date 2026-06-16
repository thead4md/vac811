/**
 * google-git-proxy — Cloudflare Worker
 * ------------------------------------
 * Lets @vac811.hu Google accounts approve/curate gallery photos without anyone
 * needing a GitHub account. Flow:
 *
 *   browser (Curate page)  --Google ID token-->  THIS WORKER  --GitHub PAT/App-->  GitHub repo
 *
 * The Worker verifies the Google ID token (audience + hosted-domain), then reads
 * or writes public/content/gallery.json using a single server-held GitHub token.
 * The editor never sees the GitHub credential.
 *
 * Required secrets (wrangler secret put ...):
 *   GOOGLE_CLIENT_ID   OAuth 2.0 Web client id (the audience of the ID token)
 *   GITHUB_TOKEN       Fine-grained PAT (or GitHub App installation token) with
 *                      Contents: Read & Write on thead4md/vac811
 * Optional vars (wrangler.toml [vars]):
 *   ALLOWED_DOMAIN     default "vac811.hu"
 *   ALLOWED_ORIGIN     default "https://vac811.hu"
 *   REPO               default "thead4md/vac811"
 *   GALLERY_PATH       default "public/content/gallery.json"
 */

const GH_API = 'https://api.github.com';

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Verify a Google ID token via the tokeninfo endpoint and enforce the domain.
async function verifyGoogle(idToken, env) {
  const allowedDomain = env.ALLOWED_DOMAIN || 'vac811.hu';
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) return { ok: false, error: 'Érvénytelen Google token.' };
  const info = await res.json();

  if (info.aud !== env.GOOGLE_CLIENT_ID) return { ok: false, error: 'Hibás token célközönség.' };
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    return { ok: false, error: 'Nem megerősített e-mail.' };
  }
  const email = String(info.email || '').toLowerCase();
  const domainOk = info.hd === allowedDomain || email.endsWith(`@${allowedDomain}`);
  if (!domainOk) return { ok: false, error: `Csak @${allowedDomain} fiókkal lehet belépni.` };
  return { ok: true, email };
}

function ghHeaders(env) {
  return {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'vac811-google-git-proxy',
  };
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://vac811.hu';
    const repo = env.REPO || 'thead4md/vac811';
    const path = env.GALLERY_PATH || 'public/content/gallery.json';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const auth = request.headers.get('Authorization') || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!idToken) {
      return Response.json({ error: 'Hiányzó Google token.' }, { status: 401, headers: cors(origin) });
    }
    const v = await verifyGoogle(idToken, env);
    if (!v.ok) {
      return Response.json({ error: v.error }, { status: 403, headers: cors(origin) });
    }

    // GET → return current gallery.json (sha + decoded content)
    if (request.method === 'GET') {
      const r = await fetch(`${GH_API}/repos/${repo}/contents/${path}?ref=main`, { headers: ghHeaders(env) });
      if (!r.ok) return Response.json({ error: `GitHub ${r.status}` }, { status: 502, headers: cors(origin) });
      const data = await r.json();
      return Response.json({ sha: data.sha, content: data.content }, { headers: cors(origin) });
    }

    // PUT → commit new gallery.json (body: { sha, content (base64), approved, rejected })
    if (request.method === 'PUT') {
      const body = await request.json();
      const message =
        `kuracio (${v.email}): ${body.approved ?? 0} jóváhagyva, ${body.rejected ?? 0} elutasítva`;
      const r = await fetch(`${GH_API}/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content: body.content, sha: body.sha, branch: 'main' }),
      });
      if (!r.ok) {
        const text = await r.text();
        return Response.json({ error: `GitHub ${r.status}: ${text.slice(0, 120)}` }, { status: 502, headers: cors(origin) });
      }
      return Response.json({ ok: true }, { headers: cors(origin) });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors(origin) });
  },
};
