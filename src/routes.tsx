import type { RouteRecord } from 'vite-react-ssg';
import { Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
// The 10 prerendered static routes are imported eagerly and hydrated
// synchronously. Route-level `lazy` would resolve the page chunk *after*
// hydrateRoot starts, so react-router renders an empty fallback for one tick
// against the fully-prerendered server HTML — an intermittent hydration
// mismatch. Eager `Component` avoids that race. The heavy client-only routes
// that are NOT prerendered (Curate + its auth libs, the gallery, the 404) stay
// lazy — that's the code-splitting that actually keeps weight out of the main
// bundle.
import Home from './pages/Home';
import About from './pages/About';
import History from './pages/History';
import Scouting from './pages/Scouting';
import Leaders from './pages/Leaders';
import Rajok from './pages/Rajok';
import Camps from './pages/Camps';
import Naptar from './pages/Naptar';
import Join from './pages/Join';
import Contact from './pages/Contact';

// react-router's data-router `lazy` convention expects the module to expose a
// `Component` (or `element`) export; our pages use default exports, so adapt.
const page = (loader: () => Promise<{ default: React.ComponentType }>) => () =>
  loader().then((m) => ({ Component: m.default }));

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <AppLayout />,
    entry: 'src/layouts/AppLayout.tsx',
    children: [
      { index: true, Component: Home },
      { path: 'rolunk', Component: About },
      { path: 'tortenet', Component: History },
      { path: 'cserkeszet', Component: Scouting },
      { path: 'vezetok', Component: Leaders },
      { path: 'rajok', Component: Rajok },
      { path: 'taborok', Component: Camps },
      { path: 'naptar', Component: Naptar },
      { path: 'csatlakozas', Component: Join },
      { path: 'kapcsolat', Component: Contact },
      // Client-only (not prerendered): heavy gallery pipeline + 404.
      { path: 'galeria', lazy: page(() => import('./pages/GaleriaPage')) },
      // Faithful slug kept; the beta's /hirek redirects here
      { path: 'hirek', element: <Navigate to="/naptar" replace /> },
      { path: '*', lazy: page(() => import('./pages/NotFound')) },
    ],
  },
  {
    // Lazy so the Curate tool + its auth libs (Google GSI / GitHub PAT) are
    // code-split out of the main bundle — no visitor else downloads them, and
    // they're never evaluated during SSG (this route isn't prerendered).
    path: '/admin/kuracio',
    lazy: page(() => import('./layouts/CurateLayout')),
  },
  { path: '/kuracio', element: <Navigate to="/admin/kuracio" replace /> },
];
