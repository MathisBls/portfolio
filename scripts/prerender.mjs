// Prerender statique : injecte le HTML rendu par React (dist-server/entry-server.js) dans les pages de
// dist/ : accueil et mentions légales en français et en anglais (src/content/locales.ts, ROUTES), puis
// les pages d'atterrissage en français (LANDING_ROUTES). Le site se lit sans JS ni WebGL, et le client
// hydrate (src/main.tsx, src/main-legal.tsx, src/main-landing.tsx) dans la même langue.
// Vérifie que chaque gabarit porte le bon <html lang>, que chaque JSON-LD est un JSON valide, et que les
// ancres de l'accueil visées depuis les autres pages (« /#contact », « /#project-wegir »…) existent.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { pages, render } = await import(
  pathToFileURL(join(root, 'dist-server/entry-server.js')).href
)

const inlineHashes = new Set()
/** HTML rendu par page, pour vérifier les ancres de l'accueil une fois toutes les pages écrites. */
const rendered = new Map()
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
  for (const [, json] of head.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(json)
    } catch (error) {
      throw new Error(`[prerender] ${file} : JSON-LD invalide (${error.message})`)
    }
  }
  rendered.set(url, html)
  writeFileSync(path, template.replace('<!--app-head-->', head).replace('<!--app-html-->', html))
  // Empreintes des scripts inline exécutables (détection de langue), pour une future CSP
  for (const [, code] of head.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    inlineHashes.add(`'sha256-${createHash('sha256').update(code).digest('base64')}'`)
  }
  console.log(`[prerender] ${url} -> ${file} (${lang}, ${(html.length / 1024).toFixed(1)} Ko HTML)`)
}

// Liens « /#ancre » et « /en/#ancre » des pages vers les accueils : l'ancre doit exister dans l'accueil visé
for (const [url, html] of rendered) {
  for (const [, home, anchor] of html.matchAll(/href="(\/(?:en\/)?)#([^"]+)"/g)) {
    const target = rendered.get(home)
    if (target === undefined) throw new Error(`[prerender] ${url} : accueil ${home} non prérendu`)
    if (!target.includes(`id="${anchor}"`)) {
      throw new Error(`[prerender] ${url} : ancre ${home}#${anchor} absente de l'accueil`)
    }
  }
}
console.log(`[prerender] scripts inline (CSP script-src) : ${[...inlineHashes].join(' ')}`)
