/**
 * sveltia-cms-auth — Cloudflare Worker (vac811 fork, Google-gated)
 * ----------------------------------------------------------------
 * Forked from the upstream third-party authenticator
 * https://github.com/sveltia/sveltia-cms-auth (MIT). It brokers the GitHub
 * (and GitLab) OAuth handshake that Sveltia CMS speaks natively, so the CMS
 * can commit to the repo without every editor holding a GitHub credential.
 *
 * vac811 change (Phase 5.2 — Google SSO "Scope 2"):
 *   The upstream flow redirects straight to GitHub. This fork inserts a
 *   self-contained Google sign-in gate *before* the GitHub OAuth exchange, so
 *   only a verified @vac811.hu Google identity can obtain a repo-writing
 *   GitHub token. The same identity check now guards both editing surfaces:
 *   this CMS and the photo-curation tool (workers/google-git-proxy) — one
 *   @vac811.hu login, no GitHub account required by any editor.
 *
 * Why the gate lives in the worker (not passed from Sveltia): Sveltia's login
 * popup only knows how to start a provider OAuth flow — it has no hook to send
 * a Google token along. So the worker owns the gate: it serves its own Google
 * Sign-In interstitial, verifies the ID token, and only then proceeds to
 * GitHub. The interstitial and the final token post-back both happen inside
 * Sveltia's popup, so `window.opener` still receives the token as before.
 *
 * Flow (all within Sveltia's auth popup, on this worker's origin):
 *   GET  /auth?provider=github&site_id=<domain>
 *        → validate provider + site domain → serve Google Sign-In interstitial
 *   POST /auth/continue   (form: credential=<Google ID token>, provider)
 *        → verifyGoogle(): aud + email_verified + @vac811.hu (+ allowlist)
 *        → on pass: set CSRF cookie, 302 to the provider's authorize endpoint
 *   GET  /callback?code=&state=
 *        → verify CSRF, exchange code for token, postMessage token to opener
 *
 * The Google identity check mirrors workers/google-git-proxy/index.js so both
 * tools enforce the exact same rule and error strings.
 *
 * Config (wrangler.toml [vars] unless noted):
 *   GOOGLE_CLIENT_ID     OAuth 2.0 Web client id — the ID token audience AND
 *                        the client id embedded in the sign-in interstitial.
 *                        The worker's own origin must be an Authorized
 *                        JavaScript origin on this client. (secret or var)
 *   ALLOWED_GOOGLE_DOMAIN  Google hosted-domain / email domain. Default "vac811.hu".
 *   ALLOWED_EMAILS       Optional comma-separated editor allowlist. If set,
 *                        only these @-addresses may sign in (recommended).
 *   ALLOWED_DOMAINS      Upstream site_id allowlist (which CMS sites may use
 *                        this authenticator), comma-separated, `*` wildcard ok.
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET   GitHub OAuth app (secrets).
 *   GITHUB_HOSTNAME      Default "github.com".
 *   GITLAB_CLIENT_ID / GITLAB_CLIENT_SECRET / GITLAB_HOSTNAME  (unused here;
 *                        kept from upstream so the fork stays a superset).
 */

/**
 * List of supported OAuth providers.
 */
const supportedProviders = ['github', 'gitlab'];

/**
 * Escape the given string for safe use in a regular expression.
 * @param {string} str - Original string.
 * @returns {string} Escaped string.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
 */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ───────────────────────────────────────────────────────────────────────────
// Google identity gate — mirrors workers/google-git-proxy/index.js exactly so
// the CMS and the Curate tool enforce one identical rule (and one wording).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Decide whether a decoded Google `tokeninfo` payload belongs to an allowed
 * editor. Pure (no I/O) so the security-critical decision is unit-testable.
 * @param {Record<string, any>} info - Parsed Google tokeninfo response.
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {{ ok: boolean, email?: string, error?: string }} Verdict.
 */
export function evaluateGoogleIdentity(info, env) {
  const allowedDomain = env.ALLOWED_GOOGLE_DOMAIN || 'vac811.hu';

  if (!info || info.aud !== env.GOOGLE_CLIENT_ID) {
    return { ok: false, error: 'Hibás token célközönség.' };
  }
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    return { ok: false, error: 'Nem megerősített e-mail.' };
  }
  const email = String(info.email || '').toLowerCase();
  const domainOk = info.hd === allowedDomain || email.endsWith(`@${allowedDomain}`);
  if (!domainOk) {
    return { ok: false, error: `Csak @${allowedDomain} fiókkal lehet belépni.` };
  }
  if (env.ALLOWED_EMAILS) {
    const allowlist = env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!allowlist.includes(email)) {
      return { ok: false, error: 'Ez a fiók nincs jóváhagyva a szerkesztéshez.' };
    }
  }
  return { ok: true, email };
}

/**
 * Verify a Google ID token via the tokeninfo endpoint, then apply the editor
 * policy. Network I/O is isolated here; the decision lives in
 * {@link evaluateGoogleIdentity}.
 * @param {string} idToken - Google ID token (JWT) from the sign-in button.
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {Promise<{ ok: boolean, email?: string, error?: string }>} Verdict.
 */
export async function verifyGoogle(idToken, env) {
  if (!idToken) return { ok: false, error: 'Hiányzó Google token.' };
  let res;
  try {
    res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
  } catch {
    return { ok: false, error: 'A Google token ellenőrzése sikertelen.' };
  }
  if (!res.ok) return { ok: false, error: 'Érvénytelen Google token.' };
  let info;
  try {
    info = await res.json();
  } catch {
    return { ok: false, error: 'Érvénytelen Google token.' };
  }
  return evaluateGoogleIdentity(info, env);
}

// ───────────────────────────────────────────────────────────────────────────
// HTML responses
// ───────────────────────────────────────────────────────────────────────────

/**
 * Output HTML response that communicates with the window opener.
 * @param {object} args - Options.
 * @param {string} [args.provider] - Backend name, e,g. `github`.
 * @param {string} [args.token] - OAuth token.
 * @param {string} [args.error] - Error message when an OAuth token is not available.
 * @param {string} [args.errorCode] - Error code to be used to localize the error message in
 * Sveltia CMS.
 * @returns {Response} Response with HTML.
 */
const outputHTML = ({ provider = 'unknown', token, error, errorCode }) => {
  const state = error ? 'error' : 'success';
  const content = error ? { provider, error, errorCode } : { provider, token };

  return new Response(
    `
      <!doctype html><html><body><script>
        (() => {
          window.addEventListener('message', ({ data, origin }) => {
            if (data === 'authorizing:${provider}') {
              window.opener?.postMessage(
                'authorization:${provider}:${state}:${JSON.stringify(content)}',
                origin
              );
            }
          });
          window.opener?.postMessage('authorizing:${provider}', '*');
        })();
      </script></body></html>
    `,
    {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        // Delete CSRF token
        'Set-Cookie': `csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`,
      },
    },
  );
};

/**
 * Serve the Google Sign-In interstitial. Rendered on this worker's own origin
 * inside Sveltia's auth popup; on a successful sign-in the button's callback
 * POSTs the Google ID token to `/auth/continue`, which resumes the provider
 * OAuth flow. The Google client id is public by design (it ships in every
 * GIS page); `provider` is validated against {@link supportedProviders}
 * before we get here, so neither value is attacker-controlled.
 * @param {object} args - Options.
 * @param {string} args.provider - Validated backend name.
 * @param {string} args.clientId - Google OAuth Web client id.
 * @returns {Response} HTML response carrying its own strict CSP.
 */
const renderGoogleGate = ({ provider, clientId }) => {
  const nonce = globalThis.crypto.randomUUID().replaceAll('-', '');
  const data = JSON.stringify({ clientId, provider });

  const html = `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Belépés — vac811.hu szerkesztő</title>
  <script src="https://accounts.google.com/gsi/client" async></script>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      display: grid; place-items: center; min-height: 100vh; margin: 0;
      background: #f6f7f9; color: #1c2530; text-align: center; }
    @media (prefers-color-scheme: dark) { body { background: #12181f; color: #e7edf3; } }
    main { max-width: 22rem; padding: 2rem 1.5rem; }
    h1 { font-size: 1.15rem; margin: 0 0 .5rem; }
    p { font-size: .9rem; line-height: 1.45; opacity: .85; margin: 0 0 1.25rem; }
    #btn { display: flex; justify-content: center; min-height: 44px; }
    #err { color: #c0392b; font-size: .85rem; margin-top: 1rem; min-height: 1.2em; }
  </style>
</head>
<body>
  <main>
    <h1>vac811.hu szerkesztő</h1>
    <p>A tartalom szerkesztéséhez lépj be a <strong>@vac811.hu</strong> Google-fiókoddal.</p>
    <div id="btn"></div>
    <div id="err" role="alert"></div>
    <noscript><p>Ehhez a belépéshez engedélyezned kell a JavaScriptet.</p></noscript>
  </main>
  <script nonce="${nonce}">
    (() => {
      const cfg = ${data};
      function onCredential(response) {
        if (!response || !response.credential) {
          document.getElementById('err').textContent = 'A Google belépés nem sikerült.';
          return;
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/continue';
        const add = (name, value) => {
          const i = document.createElement('input');
          i.type = 'hidden'; i.name = name; i.value = value;
          form.appendChild(i);
        };
        add('credential', response.credential);
        add('provider', cfg.provider);
        document.body.appendChild(form);
        form.submit();
      }
      function init() {
        if (!window.google || !google.accounts || !google.accounts.id) {
          setTimeout(init, 120);
          return;
        }
        google.accounts.id.initialize({
          client_id: cfg.clientId,
          callback: onCredential,
          auto_select: false,
          cancel_on_tap_outside: false,
          ux_mode: 'popup',
        });
        google.accounts.id.renderButton(document.getElementById('btn'), {
          type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'hu',
        });
        google.accounts.id.prompt();
      }
      init();
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      // This page is served from the worker's own origin, so the site's
      // public/_headers CSP does not apply — set our own, scoped to exactly
      // what Google Identity Services needs.
      'Content-Security-Policy': [
        "default-src 'none'",
        `script-src https://accounts.google.com 'nonce-${nonce}'`,
        "style-src https://accounts.google.com 'unsafe-inline'",
        `style-src-attr 'nonce-${nonce}'`,
        'frame-src https://accounts.google.com',
        'connect-src https://accounts.google.com',
        'img-src https://*.googleusercontent.com https://*.gstatic.com data:',
        "form-action 'self'",
        "base-uri 'none'",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin',
      'Cache-Control': 'no-store',
    },
  });
};

// ───────────────────────────────────────────────────────────────────────────
// Provider OAuth (unchanged upstream logic, split so the Google gate runs first)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build the redirect that hands off to the Git provider's authorize endpoint,
 * setting the CSRF cookie. This is upstream `handleAuth`'s tail, extracted so
 * it can run *after* the Google gate passes.
 * @param {string} provider - Validated backend name.
 * @param {string} origin - Worker origin (for GitLab's redirect_uri).
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {Response} 302 to the provider, or an error HTML response.
 */
export function buildProviderRedirect(provider, origin, env) {
  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_HOSTNAME = 'github.com',
    GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET,
    GITLAB_HOSTNAME = 'gitlab.com',
  } = env;

  // Generate a random string for CSRF protection
  const csrfToken = globalThis.crypto.randomUUID().replaceAll('-', '');
  let authURL = '';

  if (provider === 'github') {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return outputHTML({
        provider,
        error: 'OAuth app client ID or secret is not configured.',
        errorCode: 'MISCONFIGURED_CLIENT',
      });
    }
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo,user',
      state: csrfToken,
    });
    authURL = `https://${GITHUB_HOSTNAME}/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === 'gitlab') {
    if (!GITLAB_CLIENT_ID || !GITLAB_CLIENT_SECRET) {
      return outputHTML({
        provider,
        error: 'OAuth app client ID or secret is not configured.',
        errorCode: 'MISCONFIGURED_CLIENT',
      });
    }
    const params = new URLSearchParams({
      client_id: GITLAB_CLIENT_ID,
      redirect_uri: `${origin}/callback`,
      response_type: 'code',
      scope: 'api',
      state: csrfToken,
    });
    authURL = `https://${GITLAB_HOSTNAME}/oauth/authorize?${params.toString()}`;
  }

  return new Response('', {
    status: 302,
    headers: {
      Location: authURL,
      // Cookie expires in 10 minutes; Use `SameSite=Lax` to make sure the cookie is sent by the
      // browser after redirect
      'Set-Cookie':
        `csrf-token=${provider}_${csrfToken}; ` +
        `HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
}

/**
 * Handle the `auth` method, the first request in the authorization flow. In
 * this fork it does not redirect straight to the provider — it validates the
 * request and then serves the Google sign-in gate.
 * @param {Request} request - HTTP request.
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {Promise<Response>} HTTP response.
 */
const handleAuth = async (request, env) => {
  const { url } = request;
  const { searchParams } = new URL(url);
  const { provider, site_id: domain } = Object.fromEntries(searchParams);

  if (!provider || !supportedProviders.includes(provider)) {
    return outputHTML({
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }

  const { ALLOWED_DOMAINS, GOOGLE_CLIENT_ID } = env;

  // Check if the domain is whitelisted
  if (
    ALLOWED_DOMAINS &&
    !ALLOWED_DOMAINS.split(/,/).some((str) =>
      // Escape the input, then replace a wildcard for regex
      (domain ?? '').match(new RegExp(`^${escapeRegExp(str.trim()).replace('\\*', '.+')}$`)),
    )
  ) {
    return outputHTML({
      provider,
      error: 'Your domain is not allowed to use the authenticator.',
      errorCode: 'UNSUPPORTED_DOMAIN',
    });
  }

  if (!GOOGLE_CLIENT_ID) {
    return outputHTML({
      provider,
      error: 'Google sign-in is not configured on the authenticator.',
      errorCode: 'MISCONFIGURED_CLIENT',
    });
  }

  return renderGoogleGate({ provider, clientId: GOOGLE_CLIENT_ID });
};

/**
 * Handle `/auth/continue`: the Google sign-in interstitial POSTs the ID token
 * here. Verify the @vac811.hu identity, then resume the provider OAuth flow.
 * @param {Request} request - HTTP request.
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {Promise<Response>} HTTP response.
 */
const handleGoogleContinue = async (request, env) => {
  const { url } = request;
  const { origin } = new URL(url);

  let form;
  try {
    form = await request.formData();
  } catch {
    return outputHTML({
      error: 'Malformed sign-in request.',
      errorCode: 'GOOGLE_AUTH_FAILED',
    });
  }

  const provider = String(form.get('provider') || '');
  const credential = String(form.get('credential') || '');

  if (!supportedProviders.includes(provider)) {
    return outputHTML({
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }

  const verdict = await verifyGoogle(credential, env);
  if (!verdict.ok) {
    return outputHTML({ provider, error: verdict.error, errorCode: 'GOOGLE_AUTH_FAILED' });
  }

  return buildProviderRedirect(provider, origin, env);
};

/**
 * Handle the `callback` method, which is the second request in the authorization flow.
 * @param {Request} request - HTTP request.
 * @param {{ [key: string]: string }} env - Environment variables.
 * @returns {Promise<Response>} HTTP response.
 */
const handleCallback = async (request, env) => {
  const { url, headers } = request;
  const { origin, searchParams } = new URL(url);
  const { code, state } = Object.fromEntries(searchParams);

  const [, provider, csrfToken] =
    headers.get('Cookie')?.match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/) ?? [];

  if (!provider || !supportedProviders.includes(provider)) {
    return outputHTML({
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }

  if (!code || !state) {
    return outputHTML({
      provider,
      error: 'Failed to receive an authorization code. Please try again later.',
      errorCode: 'AUTH_CODE_REQUEST_FAILED',
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return outputHTML({
      provider,
      error: 'Potential CSRF attack detected. Authentication flow aborted.',
      errorCode: 'CSRF_DETECTED',
    });
  }

  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_HOSTNAME = 'github.com',
    GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET,
    GITLAB_HOSTNAME = 'gitlab.com',
  } = env;

  let tokenURL = '';
  let requestBody = {};

  if (provider === 'github') {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return outputHTML({
        provider,
        error: 'OAuth app client ID or secret is not configured.',
        errorCode: 'MISCONFIGURED_CLIENT',
      });
    }
    tokenURL = `https://${GITHUB_HOSTNAME}/login/oauth/access_token`;
    requestBody = {
      code,
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
    };
  }

  if (provider === 'gitlab') {
    if (!GITLAB_CLIENT_ID || !GITLAB_CLIENT_SECRET) {
      return outputHTML({
        provider,
        error: 'OAuth app client ID or secret is not configured.',
        errorCode: 'MISCONFIGURED_CLIENT',
      });
    }
    tokenURL = `https://${GITLAB_HOSTNAME}/oauth/token`;
    requestBody = {
      code,
      client_id: GITLAB_CLIENT_ID,
      client_secret: GITLAB_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/callback`,
    };
  }

  let response;
  let token = '';
  let error = '';

  try {
    response = await fetch(tokenURL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    //
  }

  if (!response) {
    return outputHTML({
      provider,
      error: 'Failed to request an access token. Please try again later.',
      errorCode: 'TOKEN_REQUEST_FAILED',
    });
  }

  try {
    ({ access_token: token, error } = await response.json());
  } catch {
    return outputHTML({
      provider,
      error: 'Server responded with malformed data. Please try again later.',
      errorCode: 'MALFORMED_RESPONSE',
    });
  }

  return outputHTML({ provider, token, error });
};

export default {
  /**
   * The main request handler.
   * @param {Request} request - HTTP request.
   * @param {{ [key: string]: string }} env - Environment variables.
   * @returns {Promise<Response>} HTTP response.
   * @see https://developers.cloudflare.com/workers/runtime-apis/fetch/
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
   * @see https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow
   */
  async fetch(request, env) {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === 'GET' && ['/auth', '/oauth/authorize'].includes(pathname)) {
      return handleAuth(request, env);
    }

    if (method === 'POST' && pathname === '/auth/continue') {
      return handleGoogleContinue(request, env);
    }

    if (method === 'GET' && ['/callback', '/oauth/redirect'].includes(pathname)) {
      return handleCallback(request, env);
    }

    return new Response('', { status: 404 });
  },
};
