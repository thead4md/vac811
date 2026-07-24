import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Pulls in vite-react-ssg's `declare module 'vite'` augmentation so the
// `ssgOptions` config key below type-checks.
import type {} from 'vite-react-ssg'

// Deployed to Cloudflare Pages at beta.vac811.hu (its own domain root), so
// assets are served from '/' in both dev and prod — no path-prefix base needed.
//
// NOTE: Cloudflare already does automatic Brotli/gzip compression at the edge
// for Pages deployments, same as it did for the old vac811.hu proxy. A prior
// revision here emitted precompressed .br files for the Rackhost/Apache
// deploy — dropped as redundant once the origin itself is behind Cloudflare.
// Only these 10 routes are prerendered to static HTML. /galeria (dynamic
// pipeline JSON + Drive images + heavy client state) and /admin/kuracio
// (auth-gated) stay client-only SPA routes, served via the public/_redirects
// fallback. Redirect stubs (/hirek, /kuracio) and the 404 catch-all are not
// prerendered either.
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
    entry: 'src/main.tsx',
    // Emit /foo/index.html (not /foo.html) so Cloudflare Pages serves clean URLs.
    dirStyle: 'nested' as const,
    // beasties critical-CSS inlining needs an extra optional peer dep and can
    // fight Cloudflare's edge caching of the hashed CSS; leave it off.
    beastiesOptions: false,
    includedRoutes: () => STATIC_ROUTES,
  },
}))
