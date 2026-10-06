// Easter egg n° 2 « Le Sanctuaire » : relief au CPU des débris et des cascades (montagne approchée,
// plaine qui se soulève, lignes de plus grande pente).
import { describe, expect, it } from 'vitest'
import { MOUNTAIN } from '../layout'
import {
  coneHeight,
  descentPath,
  fieldHeight,
  plainHeight,
  proceduralField,
  surfaceHeight,
} from './terrain'

const plain = { bulge: 1, collar: 1, collarRadius: MOUNTAIN.radius * 0.97 }

describe('montagne approchée', () => {
  it('a sa pointe au centre et son pied au rayon du layout', () => {
    expect(coneHeight(0)).toBeCloseTo(MOUNTAIN.height, 6)
    expect(coneHeight(MOUNTAIN.radius)).toBeCloseTo(0, 6)
    expect(coneHeight(MOUNTAIN.radius * 0.5)).toBeGreaterThan(0)
  })
  it('donne un champ haut au centre et nul hors de l’emprise', () => {
    const field = proceduralField()
    expect(fieldHeight(field, 0, 0)).toBeGreaterThan(MOUNTAIN.height * 0.9)
    expect(fieldHeight(field, MOUNTAIN.radius * 3, 0)).toBe(0)
  })
})

describe('surface', () => {
  it('suit la montagne enfoncée, jamais sous la plaine', () => {
    const field = proceduralField()
    const sunk = MOUNTAIN.sunk * 0.5
    for (const r of [0, 300, 800, 1500, 4000]) {
      const s = surfaceHeight(field, plain, sunk, r, 0)
      expect(Number.isFinite(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(plainHeight(plain, r, 0) - 1e-6)
    }
    expect(surfaceHeight(field, plain, 0, 0, 0)).toBeGreaterThan(MOUNTAIN.height * 0.9)
  })
})

describe('lignes de plus grande pente', () => {
  it('descendent du flanc jusqu’au pied', () => {
    const field = proceduralField()
    const path = descentPath(field, MOUNTAIN.radius * 0.2, MOUNTAIN.radius * 0.1, 32)
    expect(path).not.toBeNull()
    if (!path) return
    const first = path[1] ?? 0
    const last = path[31 * 3 + 1] ?? 0
    expect(first).toBeGreaterThan(last)
    expect(last).toBeLessThan(40)
    expect(Array.from(path).every((v) => Number.isFinite(v))).toBe(true)
  })
})
