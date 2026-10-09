// Pages d'atterrissage : routes, règles de contenu (FAQ de 4 à 6 questions, méthode en 4 étapes, titres et
// descriptions uniques et de bonne longueur, rien « à compléter » de publié, typographie française) et
// synchronisation du sitemap (public/sitemap.xml) avec toutes les routes.
import { describe, expect, it } from 'vitest'
import sitemap from '../../../public/sitemap.xml?raw'
import { DICTIONARIES } from '../index'
import {
  LANDING_IDS,
  LANDING_ROUTES,
  LOCALES,
  PAGES,
  ROUTES,
  landingFromPath,
  pageFromPath,
} from '../locales'
import { projects } from '../projects'
import { site } from '../site'
import { LANDINGS } from './index'
import { landingNav } from './nav'

/** Toutes les chaînes d'un objet, avec leur chemin. */
function strings(value: unknown, path = ''): { path: string; value: string }[] {
  if (typeof value === 'string') return [{ path, value }]
  if (Array.isArray(value))
    return value.flatMap((v: unknown, i) => strings(v, `${path}.${String(i)}`))
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => strings(v, path ? `${path}.${key}` : key))
  }
  return []
}

describe('routes des pages d’atterrissage', () => {
  it('retrouve chaque page depuis son URL, avec ou sans / final ni index.html', () => {
    for (const id of LANDING_IDS) {
      const path = LANDING_ROUTES[id]
      expect(landingFromPath(path)).toBe(id)
      expect(landingFromPath(path.slice(0, -1))).toBe(id)
      expect(landingFromPath(`${path}index.html`)).toBe(id)
    }
    expect(landingFromPath('/')).toBeUndefined()
    expect(landingFromPath('/mentions-legales/')).toBeUndefined()
  })

  it('n’empiète sur aucune page bilingue', () => {
    const bilingual = LOCALES.flatMap((l) => Object.values(ROUTES[l]))
    for (const path of Object.values(LANDING_ROUTES)) {
      expect(bilingual).not.toContain(path)
      expect(path).toMatch(/^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/)
      // Hors du préfixe anglais : pageFromPath les verrait en français, comme il se doit
      expect(pageFromPath(path).locale).toBe('fr')
    }
  })
})

describe('contenu des pages d’atterrissage', () => {
  const all = LANDING_IDS.map((id) => ({ id, landing: LANDINGS[id] }))

  it('une FAQ de 4 à 6 questions et une méthode en 4 étapes', () => {
    for (const { id, landing } of all) {
      expect(landing.faq.length, id).toBeGreaterThanOrEqual(4)
      expect(landing.faq.length, id).toBeLessThanOrEqual(6)
      const steps = landing.blocks.filter((b) => b.type === 'steps')
      expect(steps, id).toHaveLength(1)
      expect(
        landing.blocks.some((b) => b.type === 'pricing'),
        id,
      ).toBe(true)
      expect(
        landing.blocks.some((b) => b.type === 'examples'),
        id,
      ).toBe(true)
    }
  })

  it('titres et descriptions uniques sur tout le site, de longueur raisonnable', () => {
    const titles = [
      ...all.map(({ landing }) => landing.meta.title),
      ...LOCALES.flatMap((l) => [
        DICTIONARIES[l].meta.home.title,
        DICTIONARIES[l].meta.legal.title,
      ]),
    ]
    const descriptions = [
      ...all.map(({ landing }) => landing.meta.description),
      ...LOCALES.flatMap((l) => [
        DICTIONARIES[l].meta.home.description,
        DICTIONARIES[l].meta.legal.description,
      ]),
    ]
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
    for (const { id, landing } of all) {
      expect(landing.meta.title.length, id).toBeLessThanOrEqual(65)
      expect(landing.meta.title, id).toMatch(/ · Mathis Boulais$/)
      expect(landing.meta.description.length, id).toBeGreaterThanOrEqual(110)
      expect(landing.meta.description.length, id).toBeLessThanOrEqual(160)
    }
    const h1s = all.map(({ landing }) => landing.title)
    expect(new Set(h1s).size).toBe(h1s.length)
  })

  it('rien « à compléter » de publié, et la typographie française', () => {
    for (const { id, landing } of all) {
      for (const { path, value } of strings(landing)) {
        expect(value.trim(), `${id}.${path}`).not.toBe('')
        expect(value, `${id}.${path}`).not.toMatch(/TODO|à compléter|à valider|XX/i)
        expect(value, `${id}.${path}`).not.toMatch(/ [:;?!€»]/)
        expect(value, `${id}.${path}`).not.toMatch(/« /)
      }
    }
    for (const { path, value } of strings(landingNav)) {
      expect(value, path).not.toMatch(/ [:;?!€»]/)
    }
  })

  it('les exemples visent des projets de l’accueil, jamais la page elle-même', () => {
    const slugs = projects.map((p) => p.slug)
    for (const { id, landing } of all) {
      for (const block of landing.blocks) {
        if (block.type !== 'examples') continue
        for (const item of block.items) {
          expect(slugs, id).toContain(item.project)
          if (item.caseStudy) expect(item.caseStudy, id).not.toBe(id)
        }
      }
      if (landing.parent) expect(landing.parent.href).toBe(`/#${site.sections.projects.id}`)
    }
  })

  it('un nom court par page (footer, fil d’Ariane)', () => {
    expect(Object.keys(landingNav.links).sort()).toEqual([...LANDING_IDS].sort())
  })
})

describe('sitemap', () => {
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, block = '']) => ({
    loc: /<loc>(.*?)<\/loc>/.exec(block)?.[1],
    lastmod: /<lastmod>(.*?)<\/lastmod>/.exec(block)?.[1],
    alternates: [...block.matchAll(/hreflang="([^"]+)"/g)].map(([, lang]) => lang),
  }))
  const absolute = (path: string) => new URL(path, site.url).href

  it('liste chaque page une fois, avec une date de modification', () => {
    const expected = [
      ...PAGES.map(({ locale, kind }) => absolute(ROUTES[locale][kind])),
      ...LANDING_IDS.map((id) => absolute(LANDING_ROUTES[id])),
    ]
    expect(urls.map((u) => u.loc).sort()).toEqual(expected.sort())
    for (const { loc, lastmod } of urls) expect(lastmod, loc).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('pages bilingues avec fr, en et x-default ; pages d’atterrissage sans alternate', () => {
    const landingUrls = LANDING_IDS.map((id) => absolute(LANDING_ROUTES[id]))
    for (const { loc, alternates } of urls) {
      if (loc && landingUrls.includes(loc)) expect(alternates, loc).toEqual([])
      else expect(alternates.sort(), loc).toEqual(['en', 'fr', 'x-default'])
    }
  })
})
