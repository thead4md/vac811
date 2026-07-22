import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackgroundField from './components/BackgroundField';
import ScrollProgress from './components/ScrollProgress';
// Home is the most-visited landing page — keep it in the main chunk so first
// paint isn't gated on a second chunk fetch. Every other route (including the
// admin-only Curate tool, which pulls in auth libs no visitor else needs) is
// lazy-loaded so its code doesn't ship to someone just viewing Home.
import Home from './pages/Home';
const About = lazy(() => import('./pages/About'));
const History = lazy(() => import('./pages/History'));
const Leaders = lazy(() => import('./pages/Leaders'));
const Rajok = lazy(() => import('./pages/Rajok'));
const Camps = lazy(() => import('./pages/Camps'));
const Naptar = lazy(() => import('./pages/Naptar'));
const GaleriaPage = lazy(() => import('./pages/GaleriaPage'));
const Join = lazy(() => import('./pages/Join'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Scouting = lazy(() => import('./pages/Scouting'));
const Curate = lazy(() => import('./pages/Curate'));

// Scroll to top on route change
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

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

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  const el = document.head.querySelector<HTMLElement>(selector);
  if (el) el.setAttribute(attr, value);
}

function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const seo = pageSeo[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESC };
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${pathname}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', 'content', seo.description);
    setMeta('meta[property="og:title"]', 'content', seo.title);
    setMeta('meta[property="og:description"]', 'content', seo.description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', seo.title);
    setMeta('meta[name="twitter:description"]', 'content', seo.description);
    // Self-referential canonical for the actual deployment URL.
    setMeta('link[rel="canonical"]', 'href', url);
  }, [pathname]);
  return null;
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
        <SeoManager />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rolunk" element={<About />} />
            <Route path="/tortenet" element={<History />} />
            <Route path="/vezetok" element={<Leaders />} />
            <Route path="/rajok" element={<Rajok />} />
            <Route path="/taborok" element={<Camps />} />
            <Route path="/naptar" element={<Naptar />} />
            {/* Faithful slug kept; the beta's /hirek redirects here */}
            <Route path="/hirek" element={<Navigate to="/naptar" replace />} />
            <Route path="/galeria" element={<GaleriaPage />} />
            <Route path="/csatlakozas" element={<Join />} />
            <Route path="/kapcsolat" element={<Contact />} />
            <Route path="/cserkeszet" element={<Scouting />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </>
  );
}

// /admin/kuracio rendered outside the AppLayout shell (no Navbar/Footer, full-screen)
function CurateLayout() {
  return (
    <>
      <meta name="robots" content="noindex" />
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/kuracio" element={<CurateLayout />} />
        <Route path="/kuracio" element={<Navigate to="/admin/kuracio" replace />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
