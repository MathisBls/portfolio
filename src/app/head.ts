// <head> par page, injecté au prerender (scripts/prerender.mjs, via entry-server.tsx) ; jamais chargé
// côté client. Par page : titre, description, canonical, alternates hreflang (fr, en, x-default vers le
// français), Open Graph et Twitter (image de partage par langue), icônes, manifeste, données
// structurées JSON-LD (structuredData.ts), et sur les deux accueils le script de détection de langue
// (langRedirect.ts).
import { getContent } from '../content'
import { LOCALES, OG_LOCALES, type Page, ROUTES } from '../content/locales'
import { site } from '../content/site'
import { langRedirectScript } from './langRedirect'
import { OG_IMAGE, ogImagePath, structuredDataJson } from './structuredData'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const absolute = (path: string) => new URL(path, site.url).href

export function renderHead({ locale, kind }: Page): string {
  const { text } = getContent(locale)
  const { title, description } = text.meta[kind]
  const url = absolute(ROUTES[locale][kind])
  const image = absolute(ogImagePath(locale))
  const other = LOCALES.filter((l) => l !== locale)

  const meta = (attr: 'name' | 'property', key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`
  const link = (rel: string, href: string, extra = '') =>
    `<link rel="${rel}" href="${escapeHtml(href)}"${extra} />`

  const tags = [
    // Avant tout le reste : la redirection part avant le chargement des polices et du CSS
    kind === 'home' ? `<script>${langRedirectScript(locale)}</script>` : '',
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
    link('canonical', url),
    ...LOCALES.map((l) => link('alternate', absolute(ROUTES[l][kind]), ` hreflang="${l}"`)),
    link('alternate', absolute(ROUTES.fr[kind]), ' hreflang="x-default"'),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'Mathis Boulais'),
    meta('property', 'og:locale', OG_LOCALES[locale]),
    ...other.map((l) => meta('property', 'og:locale:alternate', OG_LOCALES[l])),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:type', OG_IMAGE.type),
    meta('property', 'og:image:width', String(OG_IMAGE.width)),
    meta('property', 'og:image:height', String(OG_IMAGE.height)),
    meta('property', 'og:image:alt', text.meta.ogImageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    link('apple-touch-icon', '/apple-touch-icon.png', ' sizes="180x180"'),
    link('manifest', '/site.webmanifest'),
    // Données structurées (structuredData.ts) : JSON déjà échappé pour la balise
    `<script type="application/ld+json">${structuredDataJson(locale)}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}
