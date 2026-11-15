import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app that keeps working without a connection (crew devices lose the link)
    VitePWA({
      registerType: 'autoUpdate',
      // The service worker is only built for production; test offline with `npm run build && npm run preview`
      devOptions: { enabled: false },
      manifest: {
        name: 'Vital-X — Space Health Monitoring System',
        short_name: 'Vital-X',
        theme_color: '#16191d',
        background_color: '#16191d',
        display: 'standalone',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Cloud uploads must always hit the network, never a cached response
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
