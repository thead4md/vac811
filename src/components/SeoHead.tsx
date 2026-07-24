import { Head } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { pageSeo, canonicalUrl, normalizePath, DEFAULT_TITLE, DEFAULT_DESC } from '../lib/seo';

// Per-route SEO baked into the static HTML at prerender time (vite-react-ssg's
// <Head> is a react-helmet-async wrapper: the tags below are emitted into each
// page's static <head> during SSG *and* updated reactively on client-side route
// transitions). This replaces the old post-mount DOM-mutation SeoManager, which
// was invisible to crawlers because it only ran after hydration.
export default function SeoHead() {
  const { pathname } = useLocation();
  const seo = pageSeo[normalizePath(pathname)] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  const url = canonicalUrl(pathname);

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
