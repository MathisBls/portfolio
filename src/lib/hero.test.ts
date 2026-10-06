import { describe, expect, it } from 'vitest'
import {
  CAPTIONS,
  HERO,
  RAY_COUNT,
  beamT,
  captionOpacity,
  rayT,
  rayWindow,
  turnT,
  wordT,
  wordWindow,
} from './hero'

describe('fenêtres du hero', () => {
  it('le faisceau est éteint au début et complet à la fin de sa fenêtre', () => {
    expect(beamT(0)).toBe(0)
    expect(beamT(HERO.beam[1])).toBe(1)
    expect(beamT(1)).toBe(1)
  })

  it('les rayons s’allument dans l’ordre et tous avant la fin de leur fenêtre', () => {
    const starts = Array.from({ length: RAY_COUNT }, (_, i) => rayWindow(i)[0])
    expect([...starts].sort((a, b) => a - b)).toEqual(starts)
    expect(rayWindow(0)[0]).toBeCloseTo(HERO.rays[0])
    expect(rayWindow(RAY_COUNT - 1)[1]).toBeCloseTo(HERO.rays[1])
    for (let i = 0; i < RAY_COUNT; i++) expect(rayT(HERO.rays[1], i)).toBe(1)
    expect(rayT(HERO.rays[0], 6)).toBe(0)
  })

  it('les mots se dissolvent dans la fenêtre words, le premier avant le second', () => {
    const [a0, b0] = wordWindow(0, 2)
    const [a1, b1] = wordWindow(1, 2)
    expect(a0).toBeCloseTo(HERO.words[0])
    expect(a1).toBeGreaterThan(a0)
    expect(b1).toBeLessThanOrEqual(HERO.words[1])
    expect(b0).toBeLessThanOrEqual(b1)
    expect(wordT(1, 0, 2)).toBe(1)
    expect(wordT(0, 1, 2)).toBe(0)
  })

  it('le quart de tour est complet à 0.85 et reste à 1 au-delà', () => {
    expect(turnT(0.5)).toBe(0)
    expect(turnT(0.85)).toBe(1)
    expect(turnT(1)).toBe(1)
  })
})

describe('captions du hero', () => {
  it('une seule caption pleinement visible à la fois, dans l’ordre', () => {
    expect(captionOpacity(0.2, 0)).toBe(1)
    expect(captionOpacity(0.2, 1)).toBe(0)
    expect(captionOpacity(0.45, 1)).toBe(1)
    expect(captionOpacity(0.45, 0)).toBe(0)
    expect(captionOpacity(0.8, 2)).toBe(1)
  })

  it('invisibles avant le faisceau et après le pin', () => {
    expect(captionOpacity(0, 0)).toBe(0)
    expect(captionOpacity(1, 2)).toBe(0)
    expect(captionOpacity(0.5, 7)).toBe(0)
  })

  it('les fenêtres se suivent sans trou', () => {
    for (let i = 1; i < CAPTIONS.length; i++) expect(CAPTIONS[i]?.[0]).toBe(CAPTIONS[i - 1]?.[1])
  })
})
