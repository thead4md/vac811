// Client-only light/dark theme, exposed as an external store so components can
// read it via useSyncExternalStore. This is the SSR-safe way to surface
// browser-only state: the server snapshot is a fixed 'light', which matches the
// prerendered HTML, and React swaps in the real client value right after
// hydration without a mismatch (and without an in-effect setState).
//
// index.html's inline pre-paint script has already applied the real theme to
// <html data-theme> before React runs, so there's no flash — this store only
// keeps React's rendered controls (the theme toggle icon) in sync.

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  listeners.forEach((l) => l());
}

export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  // Follow OS changes only while the user hasn't set an explicit preference.
  const onSystemChange = () => {
    if (localStorage.getItem('theme') == null) onChange();
  };
  mq.addEventListener('change', onSystemChange);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener('change', onSystemChange);
  };
}

// Server/hydration snapshot — must equal what the prerendered HTML rendered.
export const getServerTheme = (): Theme => 'light';
