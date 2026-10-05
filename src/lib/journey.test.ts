import { describe, expect, it } from 'vitest'
import { focusPresence, liftT, retractT, untwistT } from './journey'

describe('liftT', () => {
  it('reste au centre pendant le hero', () => {
    expect(liftT(0, 0)).toBe(0)
  })

  it('sort le prisme par le haut entre projects 0 et 0.15, puis le garde hors cadre', () => {
    expect(liftT(0.075, 0)).toBeCloseTo(0.5)
    expect(liftT(0.15, 0)).toBe(1)
    expect(liftT(1, 0)).toBe(1)
  })

  it('le redescend au centre entre contact 0 et 0.5', () => {
    expect(liftT(1, 0.25)).toBeCloseTo(0.5)
    expect(liftT(1, 0.5)).toBe(0)
    expect(liftT(1, 1)).toBe(0)
  })
})

describe('untwistT', () => {
  it('défait le quart de tour pendant la descente seulement', () => {
    expect(untwistT(0)).toBe(0)
    expect(untwistT(0.5)).toBe(1)
    expect(untwistT(1)).toBe(1)
  })
})

describe('retractT', () => {
  it('rétracte les rayons entre services 0 et 0.4, définitivement', () => {
    expect(retractT(0)).toBe(0)
    expect(retractT(0.2)).toBeCloseTo(0.5)
    expect(retractT(0.4)).toBe(1)
    expect(retractT(1)).toBe(1)
  })
})

describe('focusPresence', () => {
  it('est nulle quand la card entre ou sort', () => {
    expect(focusPresence(0)).toBe(0)
    expect(focusPresence(0.1)).toBe(0)
    expect(focusPresence(0.9)).toBe(0)
    expect(focusPresence(1)).toBe(0)
  })

  it('vaut 1 au cœur de la card', () => {
    expect(focusPresence(0.3)).toBe(1)
    expect(focusPresence(0.5)).toBe(1)
    expect(focusPresence(0.7)).toBe(1)
  })
})
