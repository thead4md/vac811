# Static prerendering (SSG) with hydration

`beta.vac811.hu` is a React 19 + Vite 8 SPA that is **prerendered to static HTML
at build time** with [`vite-react-ssg`](https://github.com/daydreamer-riri/vite-react-ssg),
then hydrated in the browser. Crawlers and first paint get real per-route HTML +
metadata; the app still behaves as a full SPA after hydration. This is the
technical prerequisite for the SEO cutover (making beta the public site).

## What is prerendered

The 10 static content routes are prerendered to `dist/<route>/index.html`
(`dirStyle: 'nested'`), enumerated by `ssgOptions.includedRoutes` in
`vite.config.ts`:

`/  /rolunk  /tortenet  /cserkeszet  /vezetok  /rajok  /taborok  /naptar  /csatlakozas  /kapcsolat`

**Not** prerendered (client-only, served via the `public/_redirects`
`/* /index.html 200` fallback):

- `/galeria` — dynamic gallery pipeline JSON + Drive images + heavy client state
- `/admin/kuracio` — auth-gated Curate tool
- `/hirek`, `/kuracio` — redirect stubs; `*` — 404

## How it's wired

- **`src/main.tsx`** is the SSG entry: `export const createRoot = ViteReactSSG({ routes, basename })`.
- **`src/routes.tsx`** is the react-router data-route table. The 10 prerendered
  pages are imported **eagerly** (`Component:`); the client-only routes
  (`/galeria`, `/admin/kuracio`, `*`/404) stay `lazy`. See "Why eager" below.
- **`src/layouts/AppLayout.tsx`** is the public shell (Navbar/Footer/chrome) as a
  layout route; pages render into its `<Outlet/>`.
- **`src/components/SeoHead.tsx`** + **`src/lib/seo.ts`** emit per-route
  `<title>`/description/canonical/OG via vite-react-ssg's `<Head>` — baked into
  the static HTML *and* updated on client-side navigation. `pageSeo` lives in
  `src/lib/seo.ts` so a future sitemap generator can reuse it.
- **`index.html`** keeps only site-wide head tags; the page-varying ones are
  owned by `<Head>` (keeping both would duplicate them in the output).

Dev server: `npm run dev` runs `vite-react-ssg dev`. Build: `npm run build`
(`tsc -b && vite-react-ssg build`) — unchanged script name, so CI/`deploy.yml`
need no change.

## SSR-safety notes (why the app hydrates cleanly)

- `Navbar` reads the theme through an external store (`src/lib/theme.ts`,
  `useSyncExternalStore`) whose server snapshot is `'light'` — matching the
  prerendered HTML — then adopts the real client theme after hydration. Reading
  `localStorage`/`matchMedia` directly in render would throw during SSG.
- `CountUp` initialises `display` to the final `value` (so the real number is in
  the static HTML and matches on hydration) and animates from 0 in an effect.
- `githubAuth`/`googleAuth` guard their module-level `sessionStorage` reads
  (`typeof sessionStorage !== 'undefined'`) — they're only pulled in by the
  lazy, client-only Curate route, but the guard hardens SSG regardless.
- Content-fetching pages (`Naptar`, `Leaders`, `Camps`, `Rajok`) render their
  loading skeleton during SSG (`useContent` starts `loading: true`), so the
  static HTML and the client's first render agree. `Home` renders its static
  fallback content directly, so its hero/stats are in the static HTML.

### Why eager, not lazy, for prerendered routes

vite-react-ssg 0.9.2 passes route-level `lazy` straight to
`createBrowserRouter` on the client without pre-resolving it before
`hydrateRoot`. The page chunk then loads *after* hydration starts, so
react-router briefly renders an empty fallback against the fully-prerendered
server HTML → an intermittent hydration mismatch (React #418) and a
"No `HydrateFallback`" warning. Importing the 10 prerendered pages eagerly makes
them available synchronously at hydration, which removes the race. The heavy
client-only routes stay lazy — that's the code-splitting that actually keeps
weight out of the main bundle.

## react-router 7 compatibility patch (important)

vite-react-ssg 0.9.2 predates react-router 7. Two adjustments make them work
together; **both must survive dependency bumps**:

1. **`patches/vite-react-ssg+0.9.2.patch`** (applied automatically by the
   `postinstall: patch-package` script). vite-react-ssg imports
   `{ StaticRouterProvider, createStaticHandler, createStaticRouter }` from
   `react-router-dom/server.js` — a subpath react-router 7 removed. The patch
   redirects that import to `react-router`, which exports all three in v7. If you
   bump vite-react-ssg, regenerate the patch (`npx patch-package vite-react-ssg`)
   or drop it if upstream adds v7 support.
2. **`overrides` in `package.json`** pin `react-router` / `react-router-dom` to a
   single version. Without it, `react-router-dom` pulled a second, nested
   `react-router` copy, so the Router context provider and `useLocation`
   consumer came from different module instances → "useLocation() may be used
   only in the context of a <Router>" during SSG.
3. **`.npmrc` `legacy-peer-deps=true`** — vite-react-ssg declares an optional
   peer on react-router-dom@^6; this lets `npm ci` resolve the v7 tree. Because
   of it, peers are no longer auto-installed, so `@testing-library/dom` (a peer
   of `@testing-library/react`) is now an explicit devDependency.

## Verifying prerender + hydration

```bash
npm run build
# 1) each static route has its own rendered content + metadata:
grep -o '<title[^>]*>[^<]*</title>' dist/rolunk/index.html   # -> "Rólunk – 811. Cserkészcsapat"
grep -oE '<h1[^>]*>[^<]*</h1>' dist/taborok/index.html        # -> "Nyári táboraink"
```

For an in-browser hydration check, serve `dist/` with a server that resolves
clean URLs to the nested `index.html` (as Cloudflare Pages does — **not**
`vite preview`, which only serves the nested file for a trailing-slash URL and
otherwise falls back to `index.html`, producing a *false* mismatch), then load
each route in a headless browser and assert the console has no React #418
hydration errors and the per-route `<title>` survives hydration.
