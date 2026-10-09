// Données structurées JSON-LD d'une page d'atterrissage (français seulement), et son <head> complet.
// Graphe : la page en FAQPage (sous-type de WebPage : questions et réponses affichées en bas de page), son
// fil d'Ariane (BreadcrumbList), et selon la page un Service (offres reprises de services.ts) ou la
// réalisation présentée (CreativeWork). Reliés à l'activité, à Mathis et au site de l'accueil par leurs
// @id (structuredData.ts, SCHEMA_IDS). <head> : head.ts, renderHeadTags, sans hreflang (aucune traduction).
import { getContent } from '../../content'
import { type LandingId, LANDING_ROUTES, ROUTES } from '../../content/locales'
import { projects } from '../../content/projects'
import { LANDINGS } from '../../content/seo'
import { landingNav } from '../../content/seo/nav'
import type { Landing } from '../../content/seo/types'
import { type ServiceId, services } from '../../content/services'
import { site } from '../../content/site'
import { renderHeadTags } from '../head'
import { type JsonLdNode, SCHEMA_IDS, SITE_NAME, jsonLdGraph } from '../structuredData'

const absolute = (path: string) => new URL(path, site.url).href

const AREAS = {
  Paris: { '@type': 'City', name: 'Paris' },
  'Île-de-France': { '@type': 'AdministrativeArea', name: 'Île-de-France' },
} as const

/** Offre d'un service de services.ts : prix « à partir de » en minPrice, mensuel à l'unité MON, sinon sans prix. */
function offer(id: ServiceId): JsonLdNode {
  const { text } = getContent('fr')
  const service = services.find((s) => s.id === id)
  if (!service) throw new Error(`[seo] service inconnu : ${id}`)
  const base: JsonLdNode = {
    '@type': 'Offer',
    name: text.services.items[id].title,
    url: `${absolute(ROUTES.fr.home)}#${site.sections.services.id}`,
  }
  if (!service.price) return base
  const { amount, perMonth = false } = service.price
  return {
    ...base,
    priceCurrency: 'EUR',
    priceSpecification: {
      '@type': perMonth ? 'UnitPriceSpecification' : 'PriceSpecification',
      priceCurrency: 'EUR',
      ...(service.priceFrom ? { minPrice: amount } : { price: amount }),
      ...(perMonth ? { unitCode: 'MON' } : {}),
    },
  }
}

/** Ce dont parle la page : le service proposé, ou la réalisation présentée. */
function subject(id: LandingId, landing: Landing, url: string): JsonLdNode {
  const { schema } = landing
  if (schema.type === 'service') {
    return {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: landingNav.links[id],
      serviceType: schema.serviceType,
      description: landing.meta.description,
      url,
      provider: { '@id': SCHEMA_IDS.business },
      areaServed: schema.area.map((area) => AREAS[area]),
      offers: schema.offers.map(offer),
    }
  }
  const project = projects.find((p) => p.slug === schema.project)
  if (!project) throw new Error(`[seo] projet inconnu : ${schema.project}`)
  const { client } = schema
  return {
    '@type': 'CreativeWork',
    '@id': `${url}#realisation`,
    name: getContent('fr').text.projects.items[project.slug].tagline,
    url: project.links.site,
    ...(project.year ? { dateCreated: project.year } : {}),
    creator: { '@id': SCHEMA_IDS.person },
    keywords: project.stack.join(', '),
    about: {
      '@type': 'Restaurant',
      name: client.name,
      ...(project.links.site ? { url: project.links.site } : {}),
      address: {
        '@type': 'PostalAddress',
        addressLocality: client.locality,
        postalCode: client.postalCode,
        addressCountry: 'FR',
      },
    },
  }
}

/** Nœuds JSON-LD de la page (sans contexte : jsonLdGraph l'ajoute). */
export function landingSchema(id: LandingId): JsonLdNode[] {
  const landing = LANDINGS[id]
  const url = absolute(LANDING_ROUTES[id])
  const breadcrumbId = `${url}#breadcrumb`
  const about = subject(id, landing, url)
  // Même convention que les autres pages (structuredData.ts, webPageGraph) : l'accueil porte le nom du site
  const crumbs = [
    { name: SITE_NAME, item: absolute(ROUTES.fr.home) },
    ...(landing.parent ? [{ name: landing.parent.name, item: absolute(landing.parent.href) }] : []),
    { name: landingNav.links[id], item: url },
  ]

  const page: JsonLdNode = {
    '@type': 'FAQPage',
    '@id': `${url}#webpage`,
    url,
    name: landing.meta.title,
    description: landing.meta.description,
    inLanguage: 'fr',
    isPartOf: { '@id': SCHEMA_IDS.website },
    publisher: { '@id': SCHEMA_IDS.business },
    breadcrumb: { '@id': breadcrumbId },
    about: { '@id': about['@id'] },
    mainEntity: landing.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  const breadcrumb: JsonLdNode = {
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: crumbs.map(({ name, item }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item,
    })),
  }

  return [page, breadcrumb, about]
}

/** <head> de la page : titre, description, canonical, partage, icônes, JSON-LD. Pas de hreflang. */
export function renderLandingHead(id: LandingId): string {
  const { title, description } = LANDINGS[id].meta
  return renderHeadTags({
    locale: 'fr',
    path: LANDING_ROUTES[id],
    title,
    description,
    jsonLd: jsonLdGraph(landingSchema(id)),
  })
}
