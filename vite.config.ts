import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use './' for production build (S3 static hosting needs relative paths)
  // Use '/' for dev server so /admin/index.html and /content/*.json resolve correctly
  base: command === 'serve' ? '/' : './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}))
