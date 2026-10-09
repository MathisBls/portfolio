// Données structurées JSON-LD (schema.org), une version par page, injectées dans le <head> par head.ts
// (balise <script type="application/ld+json">, contenu de structuredDataJson).
// - Accueils (/ et /en/) : l'activité (ProfessionalService, offres, logo), Mathis (Person), le site
//   (WebSite, nom affiché par Google à la place de l'URL : docs Google « Site names ») et la page (WebPage).
// - Autres pages (mentions légales, et toute page ajoutée à ROUTES) : la page (WebPage) et son fil
//   d'Ariane (BreadcrumbList), reliés au site et à l'activité par leurs @id.
// Les @id sont stables et communs aux deux langues : une seule activité, une seule personne, un seul site.
// Aucune valeur recopiée : identité et prix viennent de content/services.ts, textes des dictionnaires
// (content/fr.ts, en.ts), domaine et routes de content/site.ts et locales.ts.
import { DICTIONARIES, getContent } from '../content'
import type { ServiceCopy } from '../content/dictionary'
import { DEFAULT_LOCALE, LOCALES, type Locale, type PageKind, ROUTES } from '../content/locales'
import { type Service, identity, services } from '../content/services'
import { site } from '../content/site'
import { telHref } from '../lib/content'

export type JsonLdNode = Record<string, unknown>

/** Nom du site : og:site_name, application-name, manifeste, WebSite.name. Toujours en tête des titres. */
export const SITE_NAME = identity.name

/** Racine du site, avec le / final : URL canonique de l'accueil principal et WebSite.url. */
export const SITE_ROOT = `${site.url}/`

/** Image de partage (public/og/), une par langue : JPEG 1200×630, ~70 Ko. */
export const OG_IMAGE = { width: 1200, height: 630, type: 'image/jpeg' } as const

export function ogImagePath(locale: Locale): string {
  return `/og/og-${locale}.jpg`
}

/** Logo de l'activité (public/icon-512.png, dérivé de favicon.svg) : Organization.logo pour Google. */
export const LOGO = { path: '/icon-512.png', width: 512, height: 512 } as const

/** Identifiants stables, communs aux deux langues et à toutes les pages. */
export const SCHEMA_IDS = {
  business: `${site.url}/#business`,
  person: `${site.url}/#person`,
  website: `${site.url}/#website`,
  logo: `${site.url}/#logo`,
} as const

const absolute = (path: string) => new URL(path, site.url).href

/** Zone desservie : Paris et l'Île-de-France (mêmes noms dans les deux langues). */
const AREA_SERVED = [
  { '@type': 'City', name: 'Paris' },
  { '@type': 'AdministrativeArea', name: 'Île-de-France' },
]

/**
 * Libellé court d'une page, tiré de son titre : « Mathis Boulais · Mentions légales » → « Mentions
 * légales » (le nom du site et le séparateur « · » sont retirés). Fil d'Ariane.
 */
export function pageLabel(title: string): string {
  const parts = title.split(' · ').filter((part) => part.trim() !== SITE_NAME)
  return parts.join(' · ').trim() || title
}

/**
 * « 59 rue Pernety, 75014 Paris, France » → PostalAddress. Forme attendue dans services.ts : rue, code
 * postal et ville, pays. Une autre forme lève une erreur (test et prerender) plutôt qu'une adresse fausse.
 */
export function postalAddress(address: string): JsonLdNode {
  const match = /^(.+?),\s*(\d{5})\s+([^,]+?),\s*France$/.exec(address.trim())
  if (!match) throw new Error(`[structuredData] adresse non reconnue : « ${address} »`)
  const [, streetAddress, postalCode, addressLocality] = match
  return {
    '@type': 'PostalAddress',
    streetAddress,
    postalCode,
    addressLocality,
    addressCountry: 'FR',
  }
}

/** Un service de services.ts en Offer : prix « à partir de » en minPrice, prix mensuel à l'unité MON. */
function offer(service: Service, copy: ServiceCopy, homeUrl: string): JsonLdNode {
  const base: JsonLdNode = {
    '@type': 'Offer',
    '@id': `${homeUrl}#offer-${service.id}`,
    name: copy.title,
    description: copy.for,
    url: `${homeUrl}#${site.sections.services.id}`,
    // Zone desservie portée par l'activité (business.areaServed), pas répétée ici
    itemOffered: {
      '@type': 'Service',
      name: copy.title,
      description: copy.for,
      provider: { '@id': SCHEMA_IDS.business },
    },
  }
  // Sur devis : pas de prix publié
  if (!service.price) return base
  const { amount, perMonth = false } = service.price
  return {
    ...base,
    priceCurrency: 'EUR',
    priceSpecification: {
      '@type': perMonth ? 'UnitPriceSpecification' : 'PriceSpecification',
      priceCurrency: 'EUR',
      ...(service.priceFrom ? { minPrice: amount } : { price: amount }),
      // Code UN/CEFACT du mois
      ...(perMonth ? { unitCode: 'MON' } : {}),
    },
  }
}

/** Image de partage de la langue, en ImageObject (dimensions comprises). */
function ogImageObject(locale: Locale): JsonLdNode {
  const url = absolute(ogImagePath(locale))
  return {
    '@type': 'ImageObject',
    url,
    contentUrl: url,
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
    caption: getContent(locale).text.meta.ogImageAlt,
  }
}

/**
 * Le site, identique sur les deux accueils : nom « Mathis Boulais », noms alternatifs (rôle en français,
 * langue principale, et domaine), URL de la racine. Google ne gère le nom de site qu'au niveau du domaine :
 * /en/ porte donc la même URL racine.
 */
function website(locale: Locale): JsonLdNode {
  const role = DICTIONARIES[DEFAULT_LOCALE].identity.role.toLowerCase()
  return {
    '@type': 'WebSite',
    '@id': SCHEMA_IDS.website,
    url: SITE_ROOT,
    name: SITE_NAME,
    alternateName: [`${SITE_NAME}, ${role}`, new URL(site.url).hostname],
    description: getContent(locale).text.meta.home.description,
    inLanguage: [...LOCALES],
    publisher: { '@id': SCHEMA_IDS.business },
    author: { '@id': SCHEMA_IDS.person },
  }
}

function homeGraph(locale: Locale): JsonLdNode[] {
  const { text } = getContent(locale)
  const homeUrl = absolute(ROUTES[locale].home)
  const image = absolute(ogImagePath(locale))
  const offers = services.map((service) => offer(service, text.services.items[service.id], homeUrl))

  const business: JsonLdNode = {
    '@type': 'ProfessionalService',
    '@id': SCHEMA_IDS.business,
    name: identity.name,
    description: text.meta.home.description,
    url: homeUrl,
    // Format international sans espaces (+33…), quelle que soit la langue de la page
    telephone: telHref(identity.phone).replace(/^tel:/, ''),
    email: identity.email,
    address: postalAddress(identity.address),
    areaServed: AREA_SERVED,
    image,
    logo: {
      '@type': 'ImageObject',
      '@id': SCHEMA_IDS.logo,
      url: absolute(LOGO.path),
      contentUrl: absolute(LOGO.path),
      width: LOGO.width,
      height: LOGO.height,
      caption: SITE_NAME,
    },
    // Ordre de grandeur relatif (convention schema.org) : un site vitrine à partir de 900 €, une
    // maintenance à partir de 60 €/mois ; les montants exacts sont dans les offres.
    priceRange: '€€',
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'SIREN',
      value: identity.siren.replace(/\s/g, ''),
    },
    founder: { '@id': SCHEMA_IDS.person },
    knowsLanguage: [...LOCALES],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: text.nav.links.services,
      itemListElement: offers,
    },
    makesOffer: offers.map((item) => ({ '@id': item['@id'] })),
  }

  // Person n'a pas de propriété logo dans schema.org : l'image de partage seulement
  const person: JsonLdNode = {
    '@type': 'Person',
    '@id': SCHEMA_IDS.person,
    name: identity.name,
    jobTitle: text.identity.role,
    url: homeUrl,
    image,
    email: identity.email,
    sameAs: [identity.github],
    worksFor: { '@id': SCHEMA_IDS.business },
  }

  const page: JsonLdNode = {
    '@type': 'WebPage',
    '@id': `${homeUrl}#webpage`,
    url: homeUrl,
    name: text.meta.home.title,
    description: text.meta.home.description,
    inLanguage: locale,
    isPartOf: { '@id': SCHEMA_IDS.website },
    about: { '@id': SCHEMA_IDS.business },
    primaryImageOfPage: ogImageObject(locale),
  }

  return [business, person, website(locale), page]
}

/**
 * Page autre qu'un accueil : WebPage et fil d'Ariane (accueil de la langue > page), reliés au site et à
 * l'activité par leurs @id. Pour les pages bilingues (structuredData) comme pour les autres (head.ts,
 * renderHeadTags).
 */
export function webPageGraph({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale
  path: string
  title: string
  description: string
}): JsonLdNode[] {
  const homeUrl = absolute(ROUTES[locale].home)
  const url = absolute(path)
  const breadcrumbId = `${url}#breadcrumb`
  return [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: locale,
      isPartOf: { '@id': SCHEMA_IDS.website },
      publisher: { '@id': SCHEMA_IDS.business },
      breadcrumb: { '@id': breadcrumbId },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: homeUrl },
        { '@type': 'ListItem', position: 2, name: pageLabel(title), item: url },
      ],
    },
  ]
}

/** Document JSON-LD : contexte schema.org et graphe de nœuds. */
export function jsonLdGraph(nodes: readonly JsonLdNode[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': [...nodes] }
}

/**
 * Graphe JSON-LD d'une page bilingue (ROUTES). `extra` : nœuds propres à la page (par exemple un Service
 * avec sa zone desservie), ajoutés au graphe ; les relier par { '@id': SCHEMA_IDS.… }.
 */
export function structuredData(
  locale: Locale,
  kind: PageKind = 'home',
  extra: readonly JsonLdNode[] = [],
): JsonLdNode {
  const { title, description } = getContent(locale).text.meta[kind]
  const graph =
    kind === 'home'
      ? homeGraph(locale)
      : webPageGraph({ locale, path: ROUTES[locale][kind], title, description })
  return jsonLdGraph([...graph, ...extra])
}

/** Contenu d'une balise <script type="application/ld+json"> : « < » échappé, jamais de </script>. */
export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** structuredData sérialisé pour la balise <script type="application/ld+json">. */
export function structuredDataJson(
  locale: Locale,
  kind: PageKind = 'home',
  extra: readonly JsonLdNode[] = [],
): string {
  return serializeJsonLd(structuredData(locale, kind, extra))
}
