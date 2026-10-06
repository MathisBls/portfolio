// Easter egg n° 2 « Le Sanctuaire » : le modèle d'atmosphère (même calcul que le GLSL du ciel) ne doit
// jamais produire de NaN ni d'infini (un NaN sous bloom donne un écran noir), et garder un crépuscule
// cohérent : plus lumineux vers le soleil, lumière directe rougie près de l'horizon, nuit plus sombre.
import { describe, expect, it } from 'vitest'
import {
  type Dir,
  type Rgb,
  SKY_PARAMS,
  chapman,
  scatter,
  sunAt,
  sunTransmittance,
} from './atmosphere'

const rgb = (): Rgb => ({ r: 0, g: 0, b: 0 })
const finite = (c: Rgb) => [c.r, c.g, c.b].every((v) => Number.isFinite(v) && v >= 0)
const luminance = (c: Rgb) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
const DEG = Math.PI / 180
const BASE = { x: -0.52, y: 0.1, z: -0.85 }

function dir(azimuth: number, elevation: number): Dir {
  const a = azimuth * DEG
  const e = elevation * DEG
  return { x: Math.sin(a) * Math.cos(e), y: Math.sin(e), z: -Math.cos(a) * Math.cos(e) }
}

describe('chapman', () => {
  it('reste fini pour toutes les incidences, soleil sous l’horizon compris', () => {
    for (let c = -1; c <= 1; c += 0.05) {
      for (const h of [0, 0.01, 0.5, 3]) {
        expect(Number.isFinite(chapman(1147, h, c))).toBe(true)
      }
    }
  })
  it('croît vers l’horizon (plus d’air traversé)', () => {
    expect(chapman(1147, 0, 0.1)).toBeGreaterThan(chapman(1147, 0, 0.9))
  })
})

describe('scatter', () => {
  it('ne produit jamais de NaN, même sous l’horizon ou soleil couché', () => {
    const out = rgb()
    const trans = rgb()
    for (const elevation of [2, -3, -14]) {
      const sun = sunAt(BASE, elevation * DEG, { x: 0, y: 0, z: 0 })
      for (let az = -180; az <= 180; az += 30) {
        for (const el of [-20, -0.5, 0, 0.5, 5, 30, 89.9]) {
          scatter(dir(az, el), sun, SKY_PARAMS, 8, out, trans)
          expect(finite(out)).toBe(true)
          expect(finite(trans)).toBe(true)
        }
      }
    }
  })
  it('est plus lumineux vers le soleil qu’à l’opposé', () => {
    const sun = sunAt(BASE, 2 * DEG, { x: 0, y: 0, z: 0 })
    const toward = scatter(dir(-31, 3), sun, SKY_PARAMS, 12, rgb())
    const away = scatter(dir(149, 3), sun, SKY_PARAMS, 12, rgb())
    expect(luminance(toward)).toBeGreaterThan(luminance(away) * 3)
  })
  it('s’assombrit à la nuit', () => {
    const dusk = sunAt(BASE, 2 * DEG, { x: 0, y: 0, z: 0 })
    const night = sunAt(BASE, -14 * DEG, { x: 0, y: 0, z: 0 })
    const zenith = dir(0, 89)
    expect(luminance(scatter(zenith, night, SKY_PARAMS, 12, rgb()))).toBeLessThan(
      luminance(scatter(zenith, dusk, SKY_PARAMS, 12, rgb())) * 0.2,
    )
  })
})

describe('sunTransmittance et sunAt', () => {
  it('rougit la lumière directe près de l’horizon, reste dans [0, 1]', () => {
    const low = sunTransmittance(sunAt(BASE, 2 * DEG, { x: 0, y: 0, z: 0 }), SKY_PARAMS, rgb())
    const high = sunTransmittance(sunAt(BASE, 60 * DEG, { x: 0, y: 0, z: 0 }), SKY_PARAMS, rgb())
    for (const c of [low, high]) {
      expect(finite(c)).toBe(true)
      expect(Math.max(c.r, c.g, c.b)).toBeLessThanOrEqual(1)
    }
    expect(low.r / Math.max(low.b, 1e-9)).toBeGreaterThan(high.r / Math.max(high.b, 1e-9))
  })
  it('garde l’azimut, impose l’élévation, rend un vecteur unitaire', () => {
    const out = sunAt(BASE, 10 * DEG, { x: 0, y: 0, z: 0 })
    expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(1, 6)
    expect(Math.asin(out.y)).toBeCloseTo(10 * DEG, 6)
    expect(Math.atan2(out.z, out.x)).toBeCloseTo(Math.atan2(BASE.z, BASE.x), 6)
  })
})
