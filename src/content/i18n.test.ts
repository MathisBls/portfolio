// Parité des dictionnaires : les deux langues ont exactement les mêmes clés, des tableaux de même
// longueur et aucun texte vide ; typographie française ; contenu fusionné par langue.
import { describe, expect, it } from 'vitest'
import { DICTIONARIES, getContent } from './index'
import { LOCALES, PAGES, ROUTES, pageFromPath } from './locales'
import { projects } from './projects'
import { services } from './services'

type Leaf = { path: string; value: unknown }

/** Feuilles d'un objet, chemin compris (`contact.form.projectTypes.adult`, `about.lines.2`). */
function leaves(value: unknown, path = ''): Leaf[] {
  if (Array.isArray(value)) {
    const items = value as unknown[]
    return [
      { path: `${path}[]`, value: items.length },
      ...items.flatMap((v, i) => leaves(v, `${path}.${String(i)}`)),
    ]
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => leaves(v, path ? `${path}.${key}` : key))
  }
  return [{ path, value }]
}

const shape = (value: unknown) =>
  leaves(value)
    .map(({ path, value: v }) => (path.endsWith('[]') ? `${path}=${String(v)}` : path))
    .sort()

describe('dictionnaires', () => {
  it('fr et en ont exactement les mêmes clés et des tableaux de même longueur', () => {
    expect(shape(DICTIONARIES.fr)).toEqual(shape(DICTIONARIES.en))
  })

  it('aucun texte vide ni « TODO »', () => {
    for (const locale of LOCALES) {
      for (const { path, value } of leaves(DICTIONARIES[locale])) {
        if (typeof value !== 'string') continue
        expect(value.trim(), `${locale}.${path}`).not.toBe('')
        expect(value, `${locale}.${path}`).not.toMatch(/TODO/)
      }
    }
  })

  it('français : espaces insécables avant : ; ? ! € et dans les guillemets', () => {
    for (const { path, value } of leaves(DICTIONARIES.fr)) {
      if (typeof value !== 'string') continue
      expect(value, path).not.toMatch(/ [:;?!€»]/)
      expect(value, path).not.toMatch(/« /)
    }
  })

  it('un texte par projet et par service des données communes', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].projects.items).sort()).toEqual(
        projects.map((p) => p.slug).sort(),
      )
      expect(Object.keys(DICTIONARIES[locale].services.items).sort()).toEqual(
        services.map((s) => s.id).sort(),
      )
    }
  })
})

describe('contenu par langue', () => {
  it('met les prix et le téléphone en forme selon la langue', () => {
    const fr = getContent('fr')
    const en = getContent('en')
    expect(fr.services.map((s) => s.price)).toEqual(['900\u00a0€', 'Sur devis', '60\u00a0€/mois'])
    expect(en.services.map((s) => s.price)).toEqual(['€900', 'Custom quote', '€60/month'])
    expect(fr.identity.phone).toBe('07 82 07 17 88')
    expect(en.identity.phone).toBe('+33 7 82 07 17 88')
  })

  it('garde l’ordre et les données communes des projets', () => {
    for (const locale of LOCALES) {
      const merged = getContent(locale).projects
      expect(merged.map((p) => p.slug)).toEqual(projects.map((p) => p.slug))
      expect(merged.map((p) => p.accent)).toEqual(projects.map((p) => p.accent))
    }
  })
})

describe('routes', () => {
  it('reconnaît les quatre pages', () => {
    expect(PAGES).toHaveLength(4)
    for (const page of PAGES) {
      expect(pageFromPath(ROUTES[page.locale][page.kind])).toEqual(page)
    }
    expect(pageFromPath('/en')).toEqual({ locale: 'en', kind: 'home' })
    expect(pageFromPath('/en/legal')).toEqual({ locale: 'en', kind: 'legal' })
    expect(pageFromPath('/mentions-legales/index.html')).toEqual({ locale: 'fr', kind: 'legal' })
    expect(pageFromPath('/inconnue/')).toEqual({ locale: 'fr', kind: 'home' })
  })
})
