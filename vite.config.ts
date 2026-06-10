import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed under vac811.hu/beta, so production assets are served from /beta/.
// BrowserRouter (see src/App.tsx) uses basename="/beta" to match these paths.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/beta/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
}))
