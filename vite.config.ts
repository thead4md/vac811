import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// Deployed under vac811.hu/beta, so production assets are served from /beta/.
// BrowserRouter (see src/App.tsx) uses basename="/beta" to match these paths.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Emit precompressed .br alongside build output (audit finding P9) —
    // Rackhost already serves gzip on the fly (mod_deflate) but not brotli;
    // a static .htaccess rewrite serves this file directly when the client
    // supports it. (Only one viteCompression instance: the plugin's mtime
    // cache is module-scoped, so a second instance in the same build thinks
    // every file is already compressed and silently no-ops.)
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
  ],
  base: command === 'serve' ? '/' : '/beta/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
}))
