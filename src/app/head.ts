// <head> par page, injecté au prerender (scripts/prerender.mjs, via entry-server.tsx) à la place du
// marqueur <!--app-head--> des gabarits HTML ; jamais chargé côté client. Par page : titre, description,
// robots, canonical, alternates hreflang, Open Graph et Twitter (image de partage par langue, avec alt et
// dimensions), icônes et manifeste, theme-color, nom de l'application, données structurées JSON-LD
// (structuredData.ts), et sur les deux accueils le script de détection de langue (langRedirect.ts) suivi
// de celui qui garde l'ancre d'une section pour un défilement doux (homeAnchor.ts).
// Les gabarits HTML ne portent que charset, viewport, color-scheme et les préchargements de polices :
// tout le reste vient d'ici, ne pas le dupliquer dans un gabarit.
//
// API (stable) :
// - renderHead(page, { jsonLd? }) : pages bilingues de ROUTES/PAGES (content/locales.ts). Titre et
//   description dans text.meta[kind] des deux dictionnaires ; hreflang fr, en et x-default (français).
//   jsonLd : nœuds schema.org propres à la page, ajoutés au graphe de structuredData(locale, kind).
// - renderHeadTags(input) : toute autre page (pages d'atterrissage en français seul, par exemple).
//     renderHeadTags({
//       locale: 'fr', path: '/creation-site-internet-paris/', title, description,
//       jsonLd: jsonLdGraph([...webPageGraph({ locale: 'fr', path, title, description }), service]),
//     })
//   Sans `alternates`, aucune balise hreflang (page sans traduction). Titre : « … · Mathis Boulais » ou
//   « Mathis Boulais · … » (le fil d'Ariane retire le nom du site, structuredData.ts pageLabel).
import { analyticsTag } from './analytics'
import { homeAnchorScript } from './homeAnchor'
import { getContent } from '../content'
import { LOCALES, type Locale, OG_LOCALES, type Page, ROUTES } from '../content/locales'
import { site } from '../content/site'
import { langRedirectScript } from './langRedirect'
import {
  type JsonLdNode,
  OG_IMAGE,
  SITE_NAME,
  ogImagePath,
  serializeJsonLd,
  structuredData,
} from './structuredData'

/** Couleur du navigateur (barre d'adresse mobile, onglet) : fond du site (--bg), comme le manifeste. */
export const THEME_COLOR = '#0a0a0c'

/**
 * Icônes, toutes dérivées de public/favicon.svg. Ordre voulu : l'ICO (Google, vieux navigateurs), les PNG
 * multiples de 48 px (exigence Google pour l'icône des résultats), le SVG en dernier (Firefox prend la
 * dernière déclarée ; Chrome préfère le SVG).
 */
export const ICONS = [
  { href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
  { href: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
  { href: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
  { href: '/favicon.svg', type: 'image/svg+xml' },
] as const

export const APPLE_TOUCH_ICON = { href: '/apple-touch-icon.png', sizes: '180x180' } as const
export const MANIFEST = '/site.webmanifest'

export type HeadInput = {
  locale: Locale
  /** Chemin de la page, avec le / final (« /creation-site-internet-paris/ »). */
  path: string
  title: string
  description: string
  /** Chemin de la page dans chaque langue (hreflang, x-default : le français). Absent : aucun hreflang. */
  alternates?: Partial<Record<Locale, string>>
  /** Document JSON-LD complet (jsonLdGraph ou structuredData). Absent : pas de balise. */
  jsonLd?: JsonLdNode
  /** Script inline exécuté en tout premier (détection de langue des accueils). */
  script?: string
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const absolute = (path: string) => new URL(path, site.url).href

const meta = (attr: 'name' | 'property', key: string, value: string) =>
  `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`

const link = (rel: string, href: string, attrs: Record<string, string | undefined> = {}) => {
  const extra = Object.entries(attrs)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join('')
  return `<link rel="${rel}" href="${escapeHtml(href)}"${extra} />`
}

/** Balises du <head> d'une page quelconque (voir l'API en tête de fichier). */
export function renderHeadTags(input: HeadInput): string {
  const { locale, title, description, alternates, jsonLd, script } = input
  const { text } = getContent(locale)
  const url = absolute(input.path)
  const image = absolute(ogImagePath(locale))
  const imageAlt = text.meta.ogImageAlt
  const other = LOCALES.filter((l) => l !== locale)
  const translated = alternates
    ? LOCALES.flatMap((l) => (alternates[l] ? [[l, alternates[l]] as const] : []))
    : []

  const tags = [
    // Avant tout le reste : la redirection part avant le chargement des polices et du CSS
    script ? `<script>${script}</script>` : '',
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
    // Grand aperçu d'image autorisé (Discover, résultats), extrait sans limite
    meta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1'),
    meta('name', 'author', SITE_NAME),
    link('canonical', url),
    ...translated.map(([l, path]) => link('alternate', absolute(path), { hreflang: l })),
    alternates?.fr ? link('alternate', absolute(alternates.fr), { hreflang: 'x-default' }) : '',
    // Partage (Open Graph, puis Twitter/X qui reprend og:* sauf l'image et son alt)
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:locale', OG_LOCALES[locale]),
    ...(translated.length > 1
      ? other.map((l) => meta('property', 'og:locale:alternate', OG_LOCALES[l]))
      : []),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:secure_url', image),
    meta('property', 'og:image:type', OG_IMAGE.type),
    meta('property', 'og:image:width', String(OG_IMAGE.width)),
    meta('property', 'og:image:height', String(OG_IMAGE.height)),
    meta('property', 'og:image:alt', imageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', imageAlt),
    // Icônes, manifeste, nom de l'application (raccourci, écran d'accueil, onglet épinglé)
    ...ICONS.map(({ href, ...attrs }) => link('icon', href, attrs)),
    link('apple-touch-icon', APPLE_TOUCH_ICON.href, { sizes: APPLE_TOUCH_ICON.sizes }),
    link('manifest', MANIFEST),
    meta('name', 'theme-color', THEME_COLOR),
    meta('name', 'application-name', SITE_NAME),
    meta('name', 'apple-mobile-web-app-title', SITE_NAME),
    // Données structurées : JSON échappé pour la balise (jamais de </script>)
    jsonLd ? `<script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>` : '',
    // Mesure d'audience sans cookies (analytics.ts), en defer : ne bloque pas le rendu
    analyticsTag(),
  ]
  return tags.filter(Boolean).join('\n    ')
}

export type HeadOptions = { jsonLd?: readonly JsonLdNode[] }

/** Balises du <head> d'une page bilingue (ROUTES, PAGES). */
export function renderHead({ locale, kind }: Page, { jsonLd = [] }: HeadOptions = {}): string {
  const { title, description } = getContent(locale).text.meta[kind]
  return renderHeadTags({
    locale,
    path: ROUTES[locale][kind],
    title,
    description,
    alternates: Object.fromEntries(LOCALES.map((l) => [l, ROUTES[l][kind]])),
    jsonLd: structuredData(locale, kind, jsonLd),
    // Accueil : détection de langue, puis l'ancre d'une section gardée pour un défilement doux (homeAnchor.ts)
    script: kind === 'home' ? `${langRedirectScript(locale)};${homeAnchorScript()}` : undefined,
  })
}
