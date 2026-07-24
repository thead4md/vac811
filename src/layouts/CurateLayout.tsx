import { Head } from 'vite-react-ssg';
import Curate from '../pages/Curate';

// /admin/kuracio rendered outside the public AppLayout shell (no Navbar/Footer,
// full-screen). Auth-gated and excluded from prerendering (see vite.config.ts
// includedRoutes) — it ships as a client-only SPA route via the _redirects
// fallback. noindex keeps it out of search results.
export default function CurateLayout() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
        <title>Fotókuráció – 811. Cserkészcsapat</title>
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
      <Curate />
    </>
  );
}
