const WORKER_BASE = 'https://sveltia-cms-auth.dudas-adam99.workers.dev';
const SITE_ID = 'vac811.hu';
const SESSION_KEY = 'gh_token';

let _token: string | null = sessionStorage.getItem(SESSION_KEY);

export function getToken(): string | null {
  return _token;
}

export function login(): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${WORKER_BASE}/auth?provider=github&scope=repo&site_id=${SITE_ID}`,
      'github-auth',
      'width=600,height=700,left=200,top=100',
    );

    const handler = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      const match = e.data.match(/^authorization:github:success:(.+)$/);
      if (!match) return;
      window.removeEventListener('message', handler);
      clearInterval(pollClosed);
      _token = match[1];
      sessionStorage.setItem(SESSION_KEY, _token);
      resolve(_token);
      popup?.close();
    };

    window.addEventListener('message', handler);

    const pollClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollClosed);
        window.removeEventListener('message', handler);
        reject(new Error('Bejelentkezés megszakítva'));
      }
    }, 500);
  });
}

export function logout(): void {
  _token = null;
  sessionStorage.removeItem(SESSION_KEY);
}
