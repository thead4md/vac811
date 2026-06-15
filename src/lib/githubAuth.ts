// GitHub OAuth for the leader curation app. Reuses the existing Sveltia/Decap
// auth worker (the same one public/admin/config.yml points at) so no new server
// infrastructure is needed. Implements the standard Decap popup handshake:
//   1. open a popup to the worker's /auth endpoint
//   2. the popup posts "authorizing:github" → we echo it back
//   3. the popup posts "authorization:github:success:<json>" with the token
// The token (repo scope) is kept in sessionStorage for the tab's lifetime.

const AUTH_BASE = 'https://sveltia-cms-auth.dudas-adam99.workers.dev';
const SITE_ID = 'vac811.hu';
const TOKEN_KEY = 'vac811:gh-token';

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sessionStorage unavailable — token stays in memory via caller */
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function loginWithGitHub(): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const url =
      `${AUTH_BASE}/auth?provider=github&scope=repo&site_id=${encodeURIComponent(SITE_ID)}`;
    const popup = window.open(
      url,
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!popup) {
      reject(new Error('A felugró ablakot a böngésző blokkolta. Engedélyezd, majd próbáld újra.'));
      return;
    }

    let handshook = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
    };

    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (typeof data !== 'string') return;

      // Step 2: handshake — echo the message back to the popup so it proceeds.
      if (!handshook && data.startsWith('authorizing:github')) {
        handshook = true;
        popup!.postMessage(data, e.origin);
        return;
      }

      // Step 3: result.
      const m = data.match(/^authorization:github:(success|error):([\s\S]+)$/);
      if (!m) return;
      cleanup();
      try {
        popup!.close();
      } catch {
        /* ignore */
      }
      if (m[1] === 'error') {
        reject(new Error('GitHub bejelentkezés sikertelen.'));
        return;
      }
      try {
        const { token } = JSON.parse(m[2]);
        if (!token) throw new Error('missing token');
        setToken(token);
        resolve(token);
      } catch {
        reject(new Error('Érvénytelen válasz a bejelentkezéskor.'));
      }
    }

    const poll = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('A bejelentkezési ablak bezárult.'));
      }
    }, 500);

    window.addEventListener('message', onMessage);
  });
}
