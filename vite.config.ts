import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  // Démo à distance du serveur de dev via un tunnel ngrok (sous-domaines *.ngrok-free.app)
  server: { allowedHosts: ['.ngrok-free.app'] },
  preview: { allowedHosts: ['.ngrok-free.app'] },
  build: {
    target: 'es2022',
    // La scène (three + R3F) est un chunk lazy d'environ 1 Mo non compressé, attendu.
    // Le budget qui compte est le JS initial : `npm run size` (350 Ko gz max).
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        legal: resolve(root, 'legal/index.html'),
      },
    },
  },
  // gsap/ScrollTrigger est publié en ESM sans "type": "module" : on le bundle pour le prerender
  ssr: { noExternal: ['gsap'] },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
