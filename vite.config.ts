import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed under vac811.hu/beta, so production assets are served from /beta/.
// BrowserRouter (see src/App.tsx) uses basename="/beta" to match these paths.
//
// NOTE: vac811.hu is proxied through Cloudflare (confirmed live: `server:
// cloudflare` on responses), which already does automatic Brotli/gzip
// compression at the edge. A prior revision here also emitted precompressed
// .br files served via an .htaccess rewrite — that broke production: Apache
// (or Cloudflare's request to origin always asking for `br`) served the raw
// .br bytes as `Content-Type: text/html` with no `Content-Encoding` header
// (and a stray `content-language: br`, suggesting mod_negotiation read the
// `.br` suffix as the Breton language code, not a compression encoding).
// Removed — Cloudflare's own compression makes it redundant anyway.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/beta/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
}))
