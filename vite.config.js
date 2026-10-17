import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Backend roda somente em nuvem (Vercel + Neon)
      '/api': {
        target: 'https://omnihomecare.vercel.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
