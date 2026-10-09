import { describe, expect, it } from 'vitest'
import { DICTIONARIES } from '../content'
import { type Page, PAGES } from '../content/locales'
import manifestRaw from '../../public/site.webmanifest?raw'
import { APPLE_TOUCH_ICON, ICONS, MANIFEST, THEME_COLOR, renderHead, renderHeadTags } from './head'
import { SITE_NAME, jsonLdGraph, webPageGraph } from './structuredData'

/** Fichiers de public/ (chemin servi, « /favicon.ico »), pour vérifier que chaque icône déclarée existe. */
const publicFiles = Object.keys(
  import.meta.glob('../../public/*.{ico,png,svg,webmanifest}', { query: '?url' }),
).map((path) => path.replace('../../public', ''))

const manifest = JSON.parse(manifestRaw) as {
  id: string
  name: string
  short_name: string
  description: string
  start_url: string
  scope: string
  lang: string
  dir: string
  display: string
  theme_color: string
  background_color: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

const KNOWN: Page[] = [
  { locale: 'fr', kind: 'home' },
  { locale: 'en', kind: 'home' },
  { locale: 'fr', kind: 'legal' },
  { locale: 'en', kind: 'legal' },
]

describe('renderHead', () => {
  it('accueil français : titre, canonical, hreflang, og:locale, script de langue', () => {
    const head = renderHead({ locale: 'fr', kind: 'home' })
    expect(head).toContain('<title>Mathis Boulais · Création de sites internet')
    expect(head).toContain('<link rel="canonical" href="https://mathisboulais.com/" />')
    expect(head).toContain('href="https://mathisboulais.com/" hreflang="fr"')
    expect(head).toContain('href="https://mathisboulais.com/en/" hreflang="en"')
    expect(head).toContain('href="https://mathisboulais.com/" hreflang="x-default"')
    expect(head).toContain('<meta property="og:locale" content="fr_FR" />')
    expect(head).toContain('<meta property="og:locale:alternate" content="en_US" />')
    expect(head).toContain('content="https://mathisboulais.com/og/og-fr.jpg"')
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(head.indexOf('<script>')).toBe(0)
    expect(head).toContain('<link rel="manifest" href="/site.webmanifest" />')
    expect(head).toContain('<script type="application/ld+json">{')
  })

  it('mentions légales anglaises : URL anglaises, x-default vers le français, sans script', () => {
    const head = renderHead({ locale: 'en', kind: 'legal' })
    expect(head).toContain('<title>Mathis Boulais · Legal notice</title>')
    expect(head).toContain('<link rel="canonical" href="https://mathisboulais.com/en/legal/" />')
    expect(head).toContain('href="https://mathisboulais.com/mentions-legales/" hreflang="fr"')
    expect(head).toContain(
      'href="https://mathisboulais.com/mentions-legales/" hreflang="x-default"',
    )
    expect(head).toContain('<meta property="og:locale" content="en_US" />')
    expect(head).not.toContain('<script>')
  })

  it.each(KNOWN)('$locale/$kind : titre qui commence par le nom du site', (page) => {
    expect(DICTIONARIES[page.locale].meta[page.kind].title.startsWith(`${SITE_NAME} · `)).toBe(true)
  })

  it.each(PAGES)('$locale/$kind : icônes, manifeste, nom et couleur du site', (page) => {
    const head = renderHead(page)
    expect(head).toContain('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />')
    expect(head).toContain(
      '<link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />',
    )
    expect(head).toContain(
      '<link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />',
    )
    expect(head).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />')
    expect(head).toContain(
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />',
    )
    expect(head).toContain('<link rel="manifest" href="/site.webmanifest" />')
    expect(head).toContain(`<meta name="theme-color" content="${THEME_COLOR}" />`)
    expect(head).toContain('<meta name="application-name" content="Mathis Boulais" />')
    expect(head).toContain('<meta name="apple-mobile-web-app-title" content="Mathis Boulais" />')
    expect(head).toContain('<meta property="og:site_name" content="Mathis Boulais" />')
    // Une seule déclaration de chaque (les gabarits n'en portent plus)
    expect(head.match(/rel="icon"/g)).toHaveLength(ICONS.length)
    expect(head.match(/name="theme-color"/g)).toHaveLength(1)
  })

  it.each(PAGES)('$locale/$kind : image de partage avec alt et dimensions', (page) => {
    const head = renderHead(page)
    const image = `https://mathisboulais.com/og/og-${page.locale}.jpg`
    const alt = DICTIONARIES[page.locale].meta.ogImageAlt
    expect(head).toContain(`<meta property="og:image" content="${image}" />`)
    expect(head).toContain(`<meta name="twitter:image" content="${image}" />`)
    expect(head).toContain('<meta property="og:image:width" content="1200" />')
    expect(head).toContain('<meta property="og:image:height" content="630" />')
    expect(head).toContain(`<meta property="og:image:alt" content="${alt}" />`)
    expect(head).toContain(`<meta name="twitter:image:alt" content="${alt}" />`)
  })

  it.each(PAGES)('$locale/$kind : JSON-LD lisible', (page) => {
    const head = renderHead(page)
    const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(head)
    expect(match).not.toBeNull()
    const data = JSON.parse(match?.[1] ?? '') as { '@graph': unknown[] }
    expect(data['@graph'].length).toBeGreaterThan(0)
  })

  it('ajoute au JSON-LD les nœuds propres à la page', () => {
    const head = renderHead({ locale: 'fr', kind: 'legal' }, { jsonLd: [{ '@type': 'Service' }] })
    expect(head).toContain('{"@type":"Service"}')
  })
})

describe('renderHeadTags : page sans traduction', () => {
  const page = {
    locale: 'fr' as const,
    path: '/une-page/',
    title: 'Une page · Mathis Boulais',
    description: 'Description.',
  }
  const head = renderHeadTags({ ...page, jsonLd: jsonLdGraph(webPageGraph(page)) })

  it('canonical, sans hreflang ni og:locale:alternate, mêmes icônes et même nom', () => {
    expect(head).toContain('<link rel="canonical" href="https://mathisboulais.com/une-page/" />')
    expect(head).not.toContain('hreflang')
    expect(head).not.toContain('og:locale:alternate')
    expect(head).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />')
    expect(head).toContain('<meta property="og:site_name" content="Mathis Boulais" />')
    expect(head).not.toContain('<script>')
  })

  it('JSON-LD : page et fil d’Ariane', () => {
    expect(head).toContain('"@type":"BreadcrumbList"')
    expect(head).toContain('"name":"Une page"')
  })
})

describe('fichiers d’icônes et manifeste', () => {
  it('chaque icône déclarée existe dans public/', () => {
    for (const href of [...ICONS.map((i) => i.href), APPLE_TOUCH_ICON.href, MANIFEST]) {
      expect(publicFiles).toContain(href)
    }
    for (const icon of manifest.icons) expect(publicFiles).toContain(icon.src)
  })

  it('le manifeste est complet et cohérent avec le <head>', () => {
    expect(manifest).toMatchObject({
      id: '/',
      name: SITE_NAME,
      start_url: '/',
      scope: '/',
      lang: 'fr',
      dir: 'ltr',
      theme_color: THEME_COLOR,
      background_color: THEME_COLOR,
    })
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.description).toBeTruthy()
    const has = (sizes: string, purpose: string) =>
      manifest.icons.some(
        (i) => i.sizes === sizes && i.purpose === purpose && i.type === 'image/png',
      )
    expect(has('192x192', 'any')).toBe(true)
    expect(has('512x512', 'any')).toBe(true)
    expect(has('512x512', 'maskable')).toBe(true)
  })
})
