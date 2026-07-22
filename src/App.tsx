/* eslint-disable react-refresh/only-export-components --
 * This is the route-configuration entry module consumed by main.tsx (it
 * exports the `routes` array alongside the layout components used only here).
 * React Fast Refresh's "only export components" constraint doesn't apply to a
 * router-definition file, and vite-react-ssg expects routes co-located here. */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { Head, type RouteRecord } from 'vite-react-ssg';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackgroundField from './components/BackgroundField';
import ScrollProgress from './components/ScrollProgress';
// Home is the most-visited landing page — keep it in the main chunk so first
// paint isn't gated on a second chunk fetch. Every other route (including the
// admin-only Curate tool, which pulls in auth libs no visitor else needs) is
// lazy-loaded so its code doesn't ship to someone just viewing Home. The
// data-router `lazy` convention below adapts our default-exported pages
// ({ Component: default }) and lets vite-react-ssg fully resolve each chunk
// at prerender time — no renderToString/Suspense race.
import Home from './pages/Home';
// Curate (admin-only, auth libs) lazy-loaded at module scope — never during
// render, which would recreate the component type on every render.
const Curate = lazy(() => import('./pages/Curate'));

// Origin baked into canonical/OG URLs of the prerendered HTML. Kept in sync
// with index.html's canonical; Phase 3 reconciles this at the SEO cutover.
const SITE_ORIGIN = 'https://beta.vac811.hu';

// Per-route SEO: title + meta description. Descriptions are unique per page so
// search engines don't see duplicate snippets across the site.
const DEFAULT_TITLE = '811. Szent József Cserkészcsapat – Vác';
const DEFAULT_DESC =
  'A 811. Szent József Cserkészcsapat Vác egyik legnagyobb ifjúsági szervezete. Cserkészet, táborok, közösség 1929 óta.';

interface RouteSeo { title: string; description: string }
const pageSeo: Record<string, RouteSeo> = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESC },
  '/rolunk': { title: 'Rólunk – 811. Cserkészcsapat', description: 'Ismerd meg a 811. Szent József Cserkészcsapatot: keresztény értékrend, közösség és kaland Vácon, 1929 óta.' },
  '/tortenet': { title: 'Történet – 811. Cserkészcsapat', description: 'A váci 811. cserkészcsapat története 1929-től napjainkig: alapítás, betiltás, újjáalakulás.' },
  '/cserkeszet': { title: 'A cserkészetről – 811. Cserkészcsapat', description: 'Mi a cserkészet? Korosztályok, fogadalom, cserkésztörvény és a cserkészélet a 811. csapatnál.' },
  '/vezetok': { title: 'Vezetők – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat csapatvezető törzse, rajparancsnokai és rajvezetői.' },
  '/rajok': { title: 'Rajok – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat rajai korosztályonként – a fiatalabbaktól a felnőtt cserkészekig.' },
  '/taborok': { title: 'Táborok – 811. Cserkészcsapat', description: 'A 811. cserkészcsapat nyári táborainak évkönyve: helyszínek, keretmesék és emlékek.' },
  '/naptar': { title: 'Naptár – 811. Cserkészcsapat', description: 'Közelgő csapatmisék, portyák, versenyek és táborok a 811. cserkészcsapat programnaptárában.' },
  '/galeria': { title: 'Galéria – 811. Cserkészcsapat', description: 'Fotók táborainkról, portyáinkról és közösségi életünkről a 811. cserkészcsapatnál.' },
  '/csatlakozas': { title: 'Csatlakozz! – 811. Cserkészcsapat', description: 'Csatlakozz a váci 811. cserkészcsapathoz! Korosztályok, a csatlakozás lépései és gyakori kérdések.' },
  '/kapcsolat': { title: 'Kapcsolat – 811. Cserkészcsapat', description: 'Lépj kapcsolatba a 811. Szent József Cserkészcsapattal Vácon – cím, e-mail és közösségi média.' },
};

// Scroll to top on route change
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Bakes per-route <title>/description/canonical/OG into the static HTML at
// prerender time (via vite-react-ssg's Head → react-helmet-async) and keeps
// them in sync on client-side route transitions. Replaces the old post-mount
// DOM-mutation SeoManager, which was invisible to crawlers.
function RouteHead() {
  const { pathname } = useLocation();
  const seo = pageSeo[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const url = `${SITE_ORIGIN}${base}${pathname === '/' ? '/' : pathname}`;
  return (
    <Head>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <link rel="canonical" href={url} />
    </Head>
  );
}

function AppLayout() {
  return (
    <>
      <BackgroundField />
      <ScrollProgress />
      <a href="#main-content" className="skip-link">Ugrás a tartalomra</a>
      <Navbar />
      <div id="main-content">
        <ScrollReset />
        <RouteHead />
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
    </>
  );
}

// /admin/kuracio rendered outside the AppLayout shell (no Navbar/Footer,
// full-screen) and never prerendered — excluded from includedRoutes, served
// client-only via the _redirects catch-all.
function CurateLayout() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <a
        href="/admin/"
        style={{
          position: 'fixed',
          top: 8,
          left: 12,
          zIndex: 9999,
          fontSize: 13,
          color: 'var(--color-text-muted, #888)',
          textDecoration: 'none',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        ← Admin panel
      </a>
      <Suspense fallback={null}>
        <Curate />
      </Suspense>
    </>
  );
}

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, Component: Home },
      { path: 'rolunk', lazy: async () => ({ Component: (await import('./pages/About')).default }) },
      { path: 'tortenet', lazy: async () => ({ Component: (await import('./pages/History')).default }) },
      { path: 'cserkeszet', lazy: async () => ({ Component: (await import('./pages/Scouting')).default }) },
      { path: 'vezetok', lazy: async () => ({ Component: (await import('./pages/Leaders')).default }) },
      { path: 'rajok', lazy: async () => ({ Component: (await import('./pages/Rajok')).default }) },
      { path: 'taborok', lazy: async () => ({ Component: (await import('./pages/Camps')).default }) },
      { path: 'naptar', lazy: async () => ({ Component: (await import('./pages/Naptar')).default }) },
      // Faithful slug kept; the beta's /hirek redirects here
      { path: 'hirek', element: <Navigate to="/naptar" replace /> },
      { path: 'galeria', lazy: async () => ({ Component: (await import('./pages/GaleriaPage')).default }) },
      { path: 'csatlakozas', lazy: async () => ({ Component: (await import('./pages/Join')).default }) },
      { path: 'kapcsolat', lazy: async () => ({ Component: (await import('./pages/Contact')).default }) },
      { path: '*', lazy: async () => ({ Component: (await import('./pages/NotFound')).default }) },
    ],
  },
  {
    path: '/admin/kuracio',
    element: <CurateLayout />,
  },
  {
    path: '/kuracio',
    element: <Navigate to="/admin/kuracio" replace />,
  },
];
