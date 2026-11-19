import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { transformHtmlPlugin } from './vite/transformHtml.js'

// NOTE: never point `outDir` at /var/www/html — always build locally and copy with deploy.sh.
export default defineConfig({
  // `react` first, then the HTML token fill. `transformHtmlPlugin` is
  // `enforce: 'pre'`, so {NAME}/{TITLE}/{DESCRIPTION}/{SITE_URL}/{OG_IMAGE}/{EMAIL}
  // are replaced from src/data/portfolio.js in dev AND at build time.
  plugins: [transformHtmlPlugin(), react()],
  // Relative base so the site works both at a domain root and inside a subfolder
  // (e.g. https://example.com/portfolio/). No code changes needed for Vercel.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: ['chrome100', 'firefox100', 'safari15'],
    cssCodeSplit: true,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.test.{js,jsx}'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
