import { describe, expect, it } from 'vitest'
import {
  BURST,
  BURST_RAYS_END,
  burstBeam,
  burstBeamLevel,
  burstFan,
  burstInner,
  burstRay,
} from './burst'
import { RAY_COUNT } from './hero'

describe('rafale de l’envoi', () => {
  const fan = { opening: 0, length: 0, flash: 0 }

  it('avant l’envoi (−1) : tout est éteint', () => {
    expect(burstBeam(-1)).toBe(0)
    expect(burstInner(-1)).toBe(0)
    for (let i = 0; i < RAY_COUNT; i++) expect(burstRay(-1, i)).toBe(0)
    expect(burstFan(-1, fan).flash).toBe(0)
  })

  it('le faisceau entre d’abord, puis les rayons jaillissent un par un', () => {
    expect(burstBeam(BURST.rays.start)).toBe(1)
    expect(burstRay(BURST.rays.start, 0)).toBe(0)
    expect(burstRay(BURST.rays.start + 0.1, 0)).toBeGreaterThan(burstRay(BURST.rays.start + 0.1, 6))
    for (let i = 0; i < RAY_COUNT; i++) expect(burstRay(BURST_RAYS_END, i)).toBe(1)
    expect(BURST_RAYS_END).toBeLessThan(BURST.duration)
  })

  it('jaillit en éventail large puis se pose en éventail calme, dans les 2 s', () => {
    burstFan(BURST.rays.start + 0.2, fan)
    expect(fan.opening).toBe(BURST.wide.opening)
    expect(fan.length).toBe(BURST.wide.length)
    expect(fan.flash).toBeGreaterThan(1)
    burstFan(BURST.duration, fan)
    expect(fan.opening).toBe(BURST.calm.opening)
    expect(fan.length).toBe(BURST.calm.length)
    expect(fan.flash).toBe(0)
  })

  it('le faisceau éclaire à plein pendant le jaillissement, puis se pose', () => {
    expect(burstBeamLevel(BURST.rays.start)).toBe(1)
    expect(burstBeamLevel(BURST.duration)).toBe(BURST.beamRest)
    expect(burstBeamLevel(Infinity)).toBe(BURST.beamRest)
  })

  it('reduced-motion (Infinity) : spectre posé directement', () => {
    expect(burstBeam(Infinity)).toBe(1)
    expect(burstRay(Infinity, 6)).toBe(1)
    burstFan(Infinity, fan)
    expect(fan.opening).toBe(BURST.calm.opening)
    expect(fan.flash).toBe(0)
  })
})
