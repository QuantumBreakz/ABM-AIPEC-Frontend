import { realpathSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The project folder as the filesystem spells it (canonical drive-letter case on Windows).
// If "@/" pointed at "c:\Users\..." while Vite's root is "C:\Users\...", Vite would load every file
// imported through "@/" a second time under another URL. That breaks shared state such as the
// React auth context ("useAuth must be used inside <AuthProvider>").
const root = realpathSync.native(process.cwd())

// https://vite.dev/config/
export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: {
    // Same job as the Vercel rewrite in production: /api/* -> backend (no /api prefix).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Rendering a 50-row table with tooltips in jsdom is slow; real bugs still fail fast.
    testTimeout: 15_000,
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
