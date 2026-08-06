import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH wird bei einem spaeteren GitHub-Pages-Deploy automatisch gesetzt.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? process.env.BASE_PATH ?? '/arbeitskleidung/' : '/',
  server: { port: 5175 },
}))
