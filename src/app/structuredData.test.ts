import { describe, expect, it } from 'vitest'
import { DICTIONARIES } from '../content'
import { LOCALES, ROUTES } from '../content/locales'
import { identity, services } from '../content/services'
import { site } from '../content/site'
import { ogImagePath, postalAddress, structuredData, structuredDataJson } from './structuredData'

type Node = Record<string, unknown>

const graphOf = (data: Record<string, unknown>) => data['@graph'] as Node[]
const nodeOf = (data: Record<string, unknown>, type: string) => {
  const node = graphOf(data).find((n) => n['@type'] === type)
  if (!node) throw new Error(`nœud ${type} absent`)
  return node
}

describe.each(LOCALES)('structuredData(%s)', (locale) => {
  const data = structuredData(locale)
  const home = new URL(ROUTES[locale].home, site.url).href

  it('est sérialisable en JSON sans perte', () => {
    expect(JSON.parse(JSON.stringify(data))).toStrictEqual(data)
    expect(JSON.parse(structuredDataJson(locale))).toStrictEqual(data)
    expect(structuredDataJson(locale)).not.toContain('<')
  })

  it('contient l’activité, la personne et le site', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(graphOf(data).map((n) => n['@type'])).toEqual([
      'ProfessionalService',
      'Person',
      'WebSite',
    ])
  })

  it('décrit l’activité depuis l’identité de services.ts', () => {
    const business = nodeOf(data, 'ProfessionalService')
    expect(business.name).toBe(identity.name)
    expect(business.url).toBe(home)
    expect(business.email).toBe(identity.email)
    expect(business.telephone).toBe(identity.phone.replace(/\s/g, ''))
    expect(business.telephone).toMatch(/^\+33\d{9}$/)
    expect(business.image).toBe(new URL(ogImagePath(locale), site.url).href)
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

  it('présente Mathis dans la langue de la page, avec son GitHub', () => {
    const person = nodeOf(data, 'Person')
    expect(person.name).toBe(identity.name)
    expect(person.jobTitle).toBe(DICTIONARIES[locale].identity.role)
    expect(person.sameAs).toEqual([identity.github])
  })

  it('décrit le site dans sa langue', () => {
    const website = nodeOf(data, 'WebSite')
    expect(website.url).toBe(home)
    expect(website.inLanguage).toBe(locale)
  })
})

describe('postalAddress', () => {
  it('refuse une adresse qu’elle ne sait pas découper', () => {
    expect(() => postalAddress('Paris')).toThrow()
  })
})
