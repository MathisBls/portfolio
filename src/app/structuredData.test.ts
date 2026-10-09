import { describe, expect, it } from 'vitest'
import { DICTIONARIES } from '../content'
import { LOCALES, ROUTES } from '../content/locales'
import { identity, services } from '../content/services'
import { site } from '../content/site'
import {
  SCHEMA_IDS,
  SITE_NAME,
  SITE_ROOT,
  ogImagePath,
  pageLabel,
  postalAddress,
  structuredData,
  structuredDataJson,
} from './structuredData'

type Node = Record<string, unknown>

const graphOf = (data: Record<string, unknown>) => data['@graph'] as Node[]
const nodeOf = (data: Record<string, unknown>, type: string) => {
  const node = graphOf(data).find((n) => n['@type'] === type)
  if (!node) throw new Error(`nœud ${type} absent`)
  return node
}

/** Tous les { '@id': … } référencés dans un graphe (récursif), hors définitions. */
function references(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => references(v, out))
  else if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    const [first] = entries
    if (entries.length === 1 && first?.[0] === '@id') out.push(String(first[1]))
    else entries.forEach(([, v]) => references(v, out))
  }
  return out
}

/** Tous les @id définis (nœud qui porte un @id et d'autres propriétés). */
function definitions(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => definitions(v, out))
  else if (value && typeof value === 'object') {
    const record = value as Node
    if (typeof record['@id'] === 'string' && Object.keys(record).length > 1) out.push(record['@id'])
    Object.values(record).forEach((v) => definitions(v, out))
  }
  return out
}

describe.each(LOCALES)('structuredData(%s), accueil', (locale) => {
  const data = structuredData(locale)
  const home = new URL(ROUTES[locale].home, site.url).href
  const ogUrl = new URL(ogImagePath(locale), site.url).href

  it('est sérialisable en JSON sans perte', () => {
    expect(JSON.parse(JSON.stringify(data))).toStrictEqual(data)
    expect(JSON.parse(structuredDataJson(locale))).toStrictEqual(data)
    expect(structuredDataJson(locale)).not.toContain('<')
  })

  it('contient l’activité, la personne, le site et la page', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(graphOf(data).map((n) => n['@type'])).toEqual([
      'ProfessionalService',
      'Person',
      'WebSite',
      'WebPage',
    ])
  })

  it('a des @id uniques, et chaque référence pointe vers un nœud du graphe', () => {
    const defined = definitions(data)
    expect(new Set(defined).size).toBe(defined.length)
    for (const id of references(data)) expect(defined).toContain(id)
  })

  it('décrit l’activité depuis l’identité de services.ts, logo et image compris', () => {
    const business = nodeOf(data, 'ProfessionalService')
    expect(business['@id']).toBe(SCHEMA_IDS.business)
    expect(business.name).toBe(identity.name)
    expect(business.url).toBe(home)
    expect(business.email).toBe(identity.email)
    expect(business.telephone).toBe(identity.phone.replace(/\s/g, ''))
    expect(business.telephone).toMatch(/^\+33\d{9}$/)
    expect(business.image).toBe(ogUrl)
    expect(business.logo).toMatchObject({
      '@type': 'ImageObject',
      '@id': SCHEMA_IDS.logo,
      url: 'https://mathisboulais.com/icon-512.png',
      width: 512,
      height: 512,
    })
    expect(business.priceRange).toEqual(expect.any(String))
    expect(JSON.stringify(business.areaServed)).toContain('Paris')
    expect(JSON.stringify(business.areaServed)).toContain('Île-de-France')
  })

  it('donne une adresse postale complète, identique à celle de l’identité', () => {
    const address = nodeOf(data, 'ProfessionalService').address as Record<string, string>
    expect(address['@type']).toBe('PostalAddress')
    expect(address.addressCountry).toBe('FR')
    for (const key of ['streetAddress', 'postalCode', 'addressLocality'] as const) {
      expect(address[key]).toBeTruthy()
    }
    expect(
      `${address.streetAddress}, ${address.postalCode} ${address.addressLocality}, France`,
    ).toBe(identity.address)
  })

  it('publie chaque service en offre, prix compris', () => {
    const business = nodeOf(data, 'ProfessionalService')
    const catalog = business.hasOfferCatalog as { itemListElement: Node[] }
    const offers = catalog.itemListElement
    expect(offers).toHaveLength(services.length)
    expect(business.makesOffer).toEqual(offers.map((o) => ({ '@id': o['@id'] })))
    services.forEach((service) => {
      const offer = offers.find((o) => o['@id'] === `${home}#offer-${service.id}`)
      expect(offer?.name).toBe(DICTIONARIES[locale].services.items[service.id].title)
      const spec = offer?.priceSpecification as Node | undefined
      if (!service.price) {
        expect(spec).toBeUndefined()
        return
      }
      expect(spec?.priceCurrency).toBe('EUR')
      expect(spec?.[service.priceFrom ? 'minPrice' : 'price']).toBe(service.price.amount)
    })
  })

  it('présente Mathis dans la langue de la page, avec son GitHub et une image', () => {
    const person = nodeOf(data, 'Person')
    expect(person['@id']).toBe(SCHEMA_IDS.person)
    expect(person.name).toBe(identity.name)
    expect(person.jobTitle).toBe(DICTIONARIES[locale].identity.role)
    expect(person.sameAs).toEqual([identity.github])
    expect(person.image).toBe(ogUrl)
    // logo n'existe pas sur Person dans schema.org
    expect(person).not.toHaveProperty('logo')
  })

  it('nomme le site « Mathis Boulais » à la racine du domaine (nom affiché par Google)', () => {
    const website = nodeOf(data, 'WebSite')
    expect(website['@id']).toBe(SCHEMA_IDS.website)
    expect(website.name).toBe('Mathis Boulais')
    expect(website.url).toBe('https://mathisboulais.com/')
    expect(website.alternateName).toEqual([
      'Mathis Boulais, développeur web et mobile',
      'mathisboulais.com',
    ])
    expect(website.inLanguage).toEqual([...LOCALES])
  })

  it('décrit la page dans sa langue, rattachée au site', () => {
    const page = nodeOf(data, 'WebPage')
    expect(page.url).toBe(home)
    expect(page.inLanguage).toBe(locale)
    expect(page.name).toBe(DICTIONARIES[locale].meta.home.title)
    expect(page.isPartOf).toEqual({ '@id': SCHEMA_IDS.website })
    expect(page.primaryImageOfPage).toMatchObject({ url: ogUrl, width: 1200, height: 630 })
  })
})

describe('structuredData : WebSite identique sur les deux accueils', () => {
  it('même nom, mêmes noms alternatifs, même URL et même @id', () => {
    const fr = nodeOf(structuredData('fr'), 'WebSite')
    const en = nodeOf(structuredData('en'), 'WebSite')
    for (const key of ['@id', 'name', 'alternateName', 'url', 'inLanguage'] as const) {
      expect(en[key]).toEqual(fr[key])
    }
  })
})

describe.each(LOCALES)('structuredData(%s), mentions légales', (locale) => {
  const data = structuredData(locale, 'legal')
  const url = new URL(ROUTES[locale].legal, site.url).href

  it('décrit la page et son fil d’Ariane, sans répéter l’activité ni le site', () => {
    expect(graphOf(data).map((n) => n['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    const page = nodeOf(data, 'WebPage')
    expect(page.url).toBe(url)
    expect(page.inLanguage).toBe(locale)
    expect(page.isPartOf).toEqual({ '@id': SCHEMA_IDS.website })
    const crumbs = nodeOf(data, 'BreadcrumbList').itemListElement as Node[]
    expect(crumbs.map((c) => c.item)).toEqual([new URL(ROUTES[locale].home, site.url).href, url])
    expect(crumbs[0]?.name).toBe(SITE_NAME)
    expect(crumbs[1]?.name).not.toContain(SITE_NAME)
  })

  it('ajoute les nœuds propres à la page', () => {
    const extra = { '@type': 'Service', name: 'Test', provider: { '@id': SCHEMA_IDS.business } }
    expect(graphOf(structuredData(locale, 'legal', [extra]))).toContainEqual(extra)
  })
})

describe('pageLabel', () => {
  it('retire le nom du site, avant ou après', () => {
    expect(pageLabel('Mathis Boulais · Mentions légales')).toBe('Mentions légales')
    expect(pageLabel('Legal notice · Mathis Boulais')).toBe('Legal notice')
    expect(pageLabel('Mathis Boulais')).toBe('Mathis Boulais')
  })
})

describe('constantes', () => {
  it('SITE_ROOT est la racine du domaine', () => {
    expect(SITE_ROOT).toBe('https://mathisboulais.com/')
  })
})

describe('postalAddress', () => {
  it('refuse une adresse qu’elle ne sait pas découper', () => {
    expect(() => postalAddress('Paris')).toThrow()
  })
})
