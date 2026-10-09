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
      // Une page HTML par langue (src/content/locales.ts, ROUTES) : accueil et mentions légales ; puis les
      // pages d'atterrissage, en français seul (LANDING_ROUTES : un gabarit par URL)
      input: {
        main: resolve(root, 'index.html'),
        'main-en': resolve(root, 'en/index.html'),
        legal: resolve(root, 'mentions-legales/index.html'),
        'legal-en': resolve(root, 'en/legal/index.html'),
        'landing-website-paris': resolve(root, 'creation-site-internet-paris/index.html'),
        'landing-artisan': resolve(root, 'site-internet-artisan/index.html'),
        'landing-mobile-app': resolve(root, 'application-mobile-sur-mesure/index.html'),
        'landing-meme-rina': resolve(root, 'realisations/meme-rina/index.html'),
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
