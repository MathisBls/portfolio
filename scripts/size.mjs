// Mesure le JS initial en gzip : scripts module + modulepreload référencés par les pages HTML de dist/
// (les imports dynamiques, comme la scène 3D, n'y sont pas). Budget CLAUDE.md : 350 Ko gz.
// Liste aussi tous les chunks JS > 100 Ko gz.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 350
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length / 1024

// Les pages (src/content/locales.ts, ROUTES puis LANDING_ROUTES) : les deux langues partagent les mêmes
// scripts. Le budget porte sur l'union ; le JS initial de chaque page d'atterrissage est aussi affiché.
const pages = ['index.html', 'en/index.html', 'mentions-legales/index.html', 'en/legal/index.html']
const landings = [
  'creation-site-internet-paris/index.html',
  'site-internet-artisan/index.html',
  'application-mobile-sur-mesure/index.html',
  'realisations/meme-rina/index.html',
]
const scriptsOf = (page) => {
  const html = readFileSync(join(dist, page), 'utf8')
  return [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(([, file]) => file)
}
const initial = new Set()
for (const page of [...pages, ...landings]) for (const file of scriptsOf(page)) initial.add(file)

const initialKb = [...initial].reduce((sum, f) => sum + gz(f), 0)
const allJs = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`)
const big = allJs.map((f) => [f, gz(f)]).filter(([, kb]) => kb > 100)

console.log(`JS initial : ${initialKb.toFixed(1)} Ko gz / budget ${BUDGET_KB} Ko`)
for (const f of initial) console.log(`  ${f}  ${gz(f).toFixed(1)} Ko`)
console.log(big.length ? 'Chunks > 100 Ko gz :' : 'Aucun chunk > 100 Ko gz')
for (const [f, kb] of big) {
  console.log(`  ${f}  ${kb.toFixed(1)} Ko ${initial.has(f) ? '(initial)' : '(lazy)'}`)
}
for (const page of landings) {
  const kb = scriptsOf(page).reduce((sum, f) => sum + gz(f), 0)
  console.log(`JS initial de /${page.replace('index.html', '')} : ${kb.toFixed(1)} Ko gz`)
}
console.log(`JS total : ${allJs.reduce((sum, f) => sum + gz(f), 0).toFixed(1)} Ko gz`)
if (initialKb > BUDGET_KB) process.exit(1)
