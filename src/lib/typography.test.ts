import { describe, expect, it } from 'vitest'
import { frenchSpacing, typesetFrench } from './typography'

const NBSP = '\u00a0'

describe('frenchSpacing', () => {
  it('pose une espace insécable avant : ; ? ! € et dans les guillemets', () => {
    expect(frenchSpacing('Délai : 24 h ; vite ? Oui ! 900 €')).toBe(
      `Délai${NBSP}: 24 h${NBSP}; vite${NBSP}? Oui${NBSP}! 900${NBSP}€`,
    )
    expect(frenchSpacing('« Démarrer »')).toBe(`«${NBSP}Démarrer${NBSP}»`)
  })

  it('ne touche ni aux URL ni aux ponctuations collées', () => {
    expect(frenchSpacing('https://mathisboulais.com')).toBe('https://mathisboulais.com')
    expect(frenchSpacing('60 €/mois')).toBe(`60${NBSP}€/mois`)
  })
})

describe('typesetFrench', () => {
  it('parcourt objets et tableaux sans changer leur forme', () => {
    const source = { a: 'Oui !', b: ['Non ?', { c: 'x : y' }], n: 3, flag: true }
    expect(typesetFrench(source)).toEqual({
      a: `Oui${NBSP}!`,
      b: [`Non${NBSP}?`, { c: `x${NBSP}: y` }],
      n: 3,
      flag: true,
    })
    // Copie : la source reste intacte
    expect(source.a).toBe('Oui !')
  })
})
