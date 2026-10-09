// Données structurées JSON-LD (schema.org) de la page d'accueil, une version par langue : l'activité
// (ProfessionalService, avec ses offres), Mathis (Person) et le site (WebSite), reliés par leurs @id.
// Aucune valeur recopiée : identité et prix viennent de content/services.ts, textes des dictionnaires
// (content/fr.ts, en.ts), domaine et routes de content/site.ts et locales.ts. Injecté dans le <head> par
// head.ts (balise <script type="application/ld+json">, contenu de structuredDataJson).
import { getContent } from '../content'
import type { ServiceCopy } from '../content/dictionary'
import { LOCALES, type Locale, ROUTES } from '../content/locales'
import { type Service, identity, services } from '../content/services'
import { site } from '../content/site'
import { telHref } from '../lib/content'

type Json = Record<string, unknown>

/** Image de partage (public/og/), une par langue : JPEG 1200×630, ~70 Ko. */
export const OG_IMAGE = { width: 1200, height: 630, type: 'image/jpeg' } as const

export function ogImagePath(locale: Locale): string {
  return `/og/og-${locale}.jpg`
}

/** Identifiants stables, communs aux deux langues : l'activité et la personne sont les mêmes. */
const BUSINESS_ID = `${site.url}/#business`
const PERSON_ID = `${site.url}/#person`

/** Zone desservie : Paris et l'Île-de-France (mêmes noms dans les deux langues). */
const AREA_SERVED = [
  { '@type': 'City', name: 'Paris' },
  { '@type': 'AdministrativeArea', name: 'Île-de-France' },
]

/**
 * « 59 rue Pernety, 75014 Paris, France » → PostalAddress. Forme attendue dans services.ts : rue, code
 * postal et ville, pays. Une autre forme lève une erreur (test et prerender) plutôt qu'une adresse fausse.
 */
export function postalAddress(address: string): Json {
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
function offer(service: Service, copy: ServiceCopy, homeUrl: string): Json {
  const base: Json = {
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
      provider: { '@id': BUSINESS_ID },
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

export function structuredData(locale: Locale): Record<string, unknown> {
  const { text } = getContent(locale)
  const homeUrl = new URL(ROUTES[locale].home, site.url).href
  const offers = services.map((service) => offer(service, text.services.items[service.id], homeUrl))

  const business: Json = {
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: identity.name,
    description: text.meta.home.description,
    url: homeUrl,
    // Format international sans espaces (+33…), quelle que soit la langue de la page
    telephone: telHref(identity.phone).replace(/^tel:/, ''),
    email: identity.email,
    address: postalAddress(identity.address),
    areaServed: AREA_SERVED,
    image: new URL(ogImagePath(locale), site.url).href,
    logo: new URL('/icon-512.png', site.url).href,
    // Ordre de grandeur relatif (convention schema.org) : un site vitrine à partir de 900 €, une
    // maintenance à partir de 60 €/mois ; les montants exacts sont dans les offres.
    priceRange: '€€',
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'SIREN',
      value: identity.siren.replace(/\s/g, ''),
    },
    founder: { '@id': PERSON_ID },
    knowsLanguage: [...LOCALES],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: text.nav.links.services,
      itemListElement: offers,
    },
    makesOffer: offers.map((item) => ({ '@id': item['@id'] })),
  }

  const person: Json = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: identity.name,
    jobTitle: text.identity.role,
    url: homeUrl,
    email: identity.email,
    sameAs: [identity.github],
    worksFor: { '@id': BUSINESS_ID },
  }

  const website: Json = {
    '@type': 'WebSite',
    '@id': `${homeUrl}#website`,
    url: homeUrl,
    name: identity.name,
    description: text.meta.home.description,
    inLanguage: locale,
    publisher: { '@id': BUSINESS_ID },
    author: { '@id': PERSON_ID },
  }

  return { '@context': 'https://schema.org', '@graph': [business, person, website] }
}

/** Contenu de la balise <script type="application/ld+json"> : « < » échappé, jamais de </script>. */
export function structuredDataJson(locale: Locale): string {
  return JSON.stringify(structuredData(locale)).replace(/</g, '\\u003c')
}
