const SESSION_KEY = 'gh_token';

// Guarded so importing this module doesn't throw where sessionStorage is absent
// (e.g. during vite-react-ssg prerendering).
let _token: string | null =
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;

export function getToken(): string | null {
  return _token;
}

export function login(pat: string): void {
  _token = pat.trim();
  sessionStorage.setItem(SESSION_KEY, _token);
}

export function logout(): void {
  _token = null;
  sessionStorage.removeItem(SESSION_KEY);
}
