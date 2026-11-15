import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Health Monitoring Software NASA',
        short_name: 'HealthMon',
        theme_color: '#000000',
        background_color: '#1a1a1a',
        display: 'standalone',
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }
    })
  ],
  define: {
    'process.env': {}
  }
})