import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to Cloudflare Pages at beta.vac811.hu (its own domain root), so
// assets are served from '/' in both dev and prod — no path-prefix base needed.
//
// NOTE: Cloudflare already does automatic Brotli/gzip compression at the edge
// for Pages deployments, same as it did for the old vac811.hu proxy. A prior
// revision here emitted precompressed .br files for the Rackhost/Apache
// deploy — dropped as redundant once the origin itself is behind Cloudflare.

// Static content routes prerendered to real HTML at build time (vite-react-ssg).
// /galeria (dynamic Drive pipeline + heavy client state) and /admin/kuracio
// (auth-gated) are intentionally left client-only, served via the _redirects
// catch-all; /hirek is a redirect-only route.
const STATIC_ROUTES = [
  '/',
  '/rolunk',
  '/tortenet',
  '/cserkeszet',
  '/vezetok',
  '/rajok',
  '/taborok',
  '/naptar',
  '/csatlakozas',
  '/kapcsolat',
]

export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    // Prerender only the static routes; everything else stays client-only SPA.
    // The crawler emits child segments relative to their parent (e.g. "rolunk"),
    // so normalize to absolute paths before matching, and return absolute paths.
    includedRoutes: (paths: string[]) => {
      const toAbsolute = (p: string) => (p === '/' ? '/' : `/${p.replace(/^\/+/, '')}`)
      return paths.map(toAbsolute).filter((p) => STATIC_ROUTES.includes(p))
    },
  },
}))
