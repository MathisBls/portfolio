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

const pages = ['index.html', 'legal/index.html']
const initial = new Set()
for (const page of pages) {
  const html = readFileSync(join(dist, page), 'utf8')
  for (const [, file] of html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)) initial.add(file)
}

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
console.log(`JS total : ${allJs.reduce((sum, f) => sum + gz(f), 0).toFixed(1)} Ko gz`)
if (initialKb > BUDGET_KB) process.exit(1)
