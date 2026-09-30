import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SmartHome Kontrollzentrum',
        short_name: 'SmartHome',
        description: 'Zentrale Steuerung für Rollläden, Türklingel und Kameras',
        lang: 'de',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // Im Dev-Modus werden API-Aufrufe ans Backend auf Port 3001 weitergeleitet
      '/api': 'http://localhost:3001',
    },
  },
})
