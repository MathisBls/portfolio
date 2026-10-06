// Prerender statique : injecte le HTML rendu par React (dist-server/entry-server.js) dans les pages
// de dist/. Le site se lit sans JS ni WebGL, et le client hydrate (src/main.tsx).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { render } = await import(pathToFileURL(join(root, 'dist-server/entry-server.js')).href)

const pages = [
  { url: '/', file: 'dist/index.html' },
  { url: '/legal/', file: 'dist/legal/index.html' },
]

for (const { url, file } of pages) {
  const path = join(root, file)
  const template = readFileSync(path, 'utf8')
  if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
    throw new Error(`[prerender] marqueurs absents dans ${file}`)
  }
  const { head, html } = render(url)
  writeFileSync(path, template.replace('<!--app-head-->', head).replace('<!--app-html-->', html))
  console.log(`[prerender] ${url} -> ${file} (${(html.length / 1024).toFixed(1)} Ko HTML)`)
}
