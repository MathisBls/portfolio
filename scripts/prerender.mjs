// Prerender statique : injecte le HTML rendu par React (dist-server/entry-server.js) dans les quatre
// pages de dist/ (accueil et mentions légales, en français et en anglais : src/content/locales.ts). Le
// site se lit sans JS ni WebGL, et le client hydrate (src/main.tsx, src/main-legal.tsx) dans la même
// langue. Vérifie que chaque gabarit porte le bon <html lang>.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { pages, render } = await import(
  pathToFileURL(join(root, 'dist-server/entry-server.js')).href
)

const inlineHashes = new Set()
for (const { url, lang } of pages) {
  const file = `dist${url}index.html`
  const path = join(root, file)
  const template = readFileSync(path, 'utf8')
  if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
    throw new Error(`[prerender] marqueurs absents dans ${file}`)
  }
  if (!template.includes(`<html lang="${lang}">`)) {
    throw new Error(`[prerender] ${file} : <html lang="${lang}"> attendu`)
  }
  const { head, html } = render(url)
  writeFileSync(path, template.replace('<!--app-head-->', head).replace('<!--app-html-->', html))
  // Empreintes des scripts inline exécutables (détection de langue), pour une future CSP
  for (const [, code] of head.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    inlineHashes.add(`'sha256-${createHash('sha256').update(code).digest('base64')}'`)
  }
  console.log(`[prerender] ${url} -> ${file} (${lang}, ${(html.length / 1024).toFixed(1)} Ko HTML)`)
}
console.log(`[prerender] scripts inline (CSP script-src) : ${[...inlineHashes].join(' ')}`)
