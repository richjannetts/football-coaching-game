import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// GitHub Pages serves the site from /<repository name>/.
const base = '/football-coaching-game/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt', // a new version waits until we offer it between chapters
      injectRegister: false, // registered in src/main.js
      filename: 'sw.js', // fixed name, as the iPhone rules ask
      includeAssets: ['icons/*.png', 'icons/*.svg', 'voices/**/*'],
      manifest: {
        name: 'Spots! Football puzzles',
        short_name: 'Spots!',
        description: 'A match-day puzzle game about where to stand at centre kicks.',
        lang: 'en-GB',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#58b8ff',
        theme_color: '#58b8ff',
        // The maskable icon keeps the picture in the middle, because Android
        // may cut it to a circle. icon.svg is the full-size drawing.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Store every file, including voice recordings, for offline play.
        globPatterns: ['**/*.{js,css,html,svg,png,json,mp3,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Each file is stored with a fingerprint of its contents. When a new
        // version activates, files that changed or went are deleted, and
        // caches from older Workbox formats are cleared out.
        cacheId: 'spots',
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        clientsClaim: false,
        skipWaiting: false,
      },
    }),
  ],
});
