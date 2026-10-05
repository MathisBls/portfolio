import { describe, expect, it } from 'vitest'
import {
  AMBIENT,
  columnY,
  createRandom,
  layoutAmbientShapes,
  parallaxFor,
  visibleHalfHeight,
  wrap,
} from '../scene/objects/ambientLayout'

describe('createRandom', () => {
  it('est déterministe et reste dans [0, 1)', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    for (let i = 0; i < 100; i++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('parallaxFor', () => {
  it('va de 0.3 (lointain) à 0.9 (proche), borné', () => {
    expect(parallaxFor(-9)).toBeCloseTo(0.3)
    expect(parallaxFor(-2)).toBeCloseTo(0.9)
    expect(parallaxFor(-5.5)).toBeCloseTo(0.6)
    expect(parallaxFor(-20)).toBeCloseTo(0.3)
    expect(parallaxFor(5)).toBeCloseTo(0.9)
  })
})

describe('visibleHalfHeight', () => {
  it('suit tan(fov / 2) × distance', () => {
    expect(visibleHalfHeight(10, 90)).toBeCloseTo(10)
    expect(visibleHalfHeight(14)).toBeCloseTo(14 * Math.tan((35 * Math.PI) / 360))
  })
})

describe('wrap / columnY', () => {
  it('ramène dans [0, length)', () => {
    expect(wrap(5, 4)).toBe(1)
    expect(wrap(-1, 4)).toBe(3)
    expect(wrap(0, 4)).toBe(0)
    expect(wrap(3, 0)).toBe(0)
  })

  it('monte avec le scroll et boucle en bas une fois sortie par le haut', () => {
    const column = 10
    const start = columnY(0.5, 0, column)
    expect(start).toBeCloseTo(0)
    expect(columnY(0.5, 2, column)).toBeCloseTo(2)
    // sortie par le haut (> +5) -> réapparaît en bas
    expect(columnY(0.5, 6, column)).toBeCloseTo(-4)
    for (let rise = 0; rise < 50; rise += 0.7) {
      const y = columnY(0.3, rise, column)
      expect(y).toBeGreaterThanOrEqual(-column / 2)
      expect(y).toBeLessThan(column / 2)
    }
  })
})

describe('layoutAmbientShapes', () => {
  const desktop = layoutAmbientShapes(AMBIENT.count.desktop)
  const mobile = layoutAmbientShapes(AMBIENT.count.mobile)

  it('donne 10 formes sur desktop, 5 sur mobile, toujours les mêmes', () => {
    expect(desktop).toHaveLength(10)
    expect(mobile).toHaveLength(5)
    expect(layoutAmbientShapes(10)).toEqual(desktop)
  })

  it('respecte les bornes de taille, profondeur, côté, rotation et parallaxe', () => {
    for (const s of [...desktop, ...mobile]) {
      expect(s.size).toBeGreaterThanOrEqual(0.15)
      expect(s.size).toBeLessThanOrEqual(0.6)
      expect(s.z).toBeGreaterThanOrEqual(-9)
      expect(s.z).toBeLessThanOrEqual(-2)
      expect(s.xFrac).toBeGreaterThanOrEqual(0.35)
      expect(s.xFrac).toBeLessThanOrEqual(1)
      expect(s.yFrac).toBeGreaterThanOrEqual(0)
      expect(s.yFrac).toBeLessThan(1)
      for (const spin of [s.spinX, s.spinY]) {
        expect(Math.abs(spin)).toBeGreaterThanOrEqual(0.05)
        expect(Math.abs(spin)).toBeLessThanOrEqual(0.25)
      }
      expect(s.parallax).toBeCloseTo(parallaxFor(s.z))
    }
  })

  it('équilibre les deux côtés et mélange les types de chaque côté', () => {
    const left = desktop.filter((s) => s.side === -1)
    const right = desktop.filter((s) => s.side === 1)
    expect(left).toHaveLength(5)
    expect(right).toHaveLength(5)
    expect(new Set(left.map((s) => s.kind)).size).toBeGreaterThanOrEqual(3)
    expect(new Set(right.map((s) => s.kind)).size).toBeGreaterThanOrEqual(3)
    expect(new Set(mobile.map((s) => s.kind)).size).toBe(4)
  })

  it('teinte 3 formes sur desktop, 2 sur mobile, des deux côtés', () => {
    const tinted = (shapes: typeof desktop) => shapes.filter((s) => s.tint !== null)
    expect(tinted(desktop)).toHaveLength(3)
    expect(tinted(mobile)).toHaveLength(2)
    expect(new Set(tinted(desktop).map((s) => s.side)).size).toBe(2)
    expect(new Set(tinted(mobile).map((s) => s.side)).size).toBe(2)
  })

  it('étale les formes sur toute la hauteur de la colonne (une strate chacune)', () => {
    const ys = desktop.map((s) => s.yFrac).sort((a, b) => a - b)
    ys.forEach((y, i) => {
      expect(Math.floor(y * desktop.length)).toBe(i)
    })
  })
})
