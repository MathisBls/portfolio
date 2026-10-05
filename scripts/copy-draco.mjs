// Copie le décodeur Draco de three dans public/draco/ (servi en local, pas de CDN).
// Lancé en postinstall : le décodeur suit toujours la version de three installée.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/three/examples/jsm/libs/draco/gltf')
const dest = join(root, 'public/draco')
const files = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']

if (!existsSync(src)) {
  console.warn('[copy-draco] three absent, copie ignorée')
  process.exit(0)
}
mkdirSync(dest, { recursive: true })
for (const f of files) copyFileSync(join(src, f), join(dest, f))
console.log(`[copy-draco] ${files.length} fichiers copiés dans public/draco/`)
