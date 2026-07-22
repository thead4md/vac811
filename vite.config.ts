import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to Cloudflare Pages at beta.vac811.hu (its own domain root), so
// assets are served from '/' in both dev and prod — no path-prefix base needed.
//
// NOTE: Cloudflare already does automatic Brotli/gzip compression at the edge
// for Pages deployments, same as it did for the old vac811.hu proxy. A prior
// revision here emitted precompressed .br files for the Rackhost/Apache
// deploy — dropped as redundant once the origin itself is behind Cloudflare.
export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
}))
