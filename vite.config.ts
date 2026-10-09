import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

// Empreinte de chaque GLB de public/models, ajoutée en ?v= à son URL (src/lib/assetVersion.ts) : un
// visiteur qui revient après un déploiement ne garde jamais un ancien modèle avec le nouveau code.
function modelVersions(): Record<string, string> {
  const dir = resolve(root, 'public/models')
  const versions: Record<string, string> = {}
  const walk = (folder: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.glb')) {
        const key = `/models/${relative(dir, path).split(sep).join('/')}`
        versions[key] = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 10)
      }
    }
  }
  walk(dir)
  return versions
}

export default defineConfig({
  plugins: [react()],
  define: { __MODEL_VERSIONS__: JSON.stringify(modelVersions()) },
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
