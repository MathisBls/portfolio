// JSON-LD et <head> des pages d'atterrissage : FAQPage complète, fil d'Ariane cohérent, offres reprises de
// services.ts, @id reliés au graphe de l'accueil, aucune balise hreflang (pages en français seul).
import { describe, expect, it } from 'vitest'
import { LANDING_IDS, LANDING_ROUTES } from '../../content/locales'
import { LANDINGS } from '../../content/seo'
import { services } from '../../content/services'
import { site } from '../../content/site'
import { type JsonLdNode, SCHEMA_IDS, structuredData } from '../structuredData'
import { landingSchema, renderLandingHead } from './landingSchema'

const byType = (nodes: JsonLdNode[], type: string) => nodes.find((n) => n['@type'] === type)

describe('landingSchema', () => {
  it('FAQPage : une question par entrée de la FAQ affichée, avec sa réponse', () => {
    for (const id of LANDING_IDS) {
      const page = byType(landingSchema(id), 'FAQPage')
      const faq = LANDINGS[id].faq
      expect(page?.url).toBe(new URL(LANDING_ROUTES[id], site.url).href)
      expect(page?.mainEntity).toEqual(
        faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      )
    }
  })

  it('fil d’Ariane : positions 1..n, de l’accueil à la page', () => {
    for (const id of LANDING_IDS) {
      const items = byType(landingSchema(id), 'BreadcrumbList')?.itemListElement as {
        position: number
        item: string
      }[]
      expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1))
      expect(items[0]?.item).toBe(`${site.url}/`)
      expect(items.at(-1)?.item).toBe(new URL(LANDING_ROUTES[id], site.url).href)
    }
    expect(byType(landingSchema('meme-rina'), 'BreadcrumbList')?.itemListElement).toHaveLength(3)
  })

  it('Service : offres reprises de services.ts, prestataire = l’activité de l’accueil', () => {
    const service = byType(landingSchema('website-paris'), 'Service')
    expect(service?.provider).toEqual({ '@id': SCHEMA_IDS.business })
    const website = services.find((s) => s.id === 'website')
    expect(service?.offers).toContainEqual(
      expect.objectContaining({
        priceSpecification: expect.objectContaining({
          minPrice: website?.price?.amount,
        }) as unknown,
      }),
    )
    // Sur devis : pas de prix inventé
    const app = byType(landingSchema('mobile-app'), 'Service')?.offers as JsonLdNode[]
    expect(app[0]).not.toHaveProperty('priceSpecification')
  })

  it('les @id visés existent dans le graphe de l’accueil', () => {
    const ids = (structuredData('fr')['@graph'] as JsonLdNode[]).map((n) => n['@id'])
    for (const id of [SCHEMA_IDS.business, SCHEMA_IDS.person, SCHEMA_IDS.website]) {
      expect(ids).toContain(id)
    }
  })
})

describe('renderLandingHead', () => {
  it('canonical propre, aucun hreflang ni script exécutable, JSON-LD valide', () => {
    for (const id of LANDING_IDS) {
      const head = renderLandingHead(id)
      const url = new URL(LANDING_ROUTES[id], site.url).href
      expect(head).toContain(`<link rel="canonical" href="${url}" />`)
      expect(head).toContain(`<meta property="og:url" content="${url}" />`)
      expect(head).not.toContain('hreflang')
      expect(head).not.toContain('og:locale:alternate')
      expect(head).not.toContain('<script>')
      const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)?.[1]
      expect(() => {
        JSON.parse(json ?? '')
      }).not.toThrow()
    }
  })
})
