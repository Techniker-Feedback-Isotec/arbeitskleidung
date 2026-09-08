import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ausgeliefert wird auf Azure unter "/". In der Entwicklung beantwortet der
// lokale Server (npm run server) die /api-Aufrufe, Vite leitet sie weiter.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5175,
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    rollupOptions: {
      output: {
        // React getrennt, damit der Anwendungscode bei Änderungen allein neu geladen wird
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
})
