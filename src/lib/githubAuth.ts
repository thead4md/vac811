const SESSION_KEY = 'gh_token';

let _token: string | null = sessionStorage.getItem(SESSION_KEY);

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
