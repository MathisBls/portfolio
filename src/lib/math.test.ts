import { describe, expect, it } from 'vitest'
import { type CameraKey, type Vec3, clamp, range, sampleKeyframes } from './math'

describe('clamp / range', () => {
  it('borne les valeurs', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('ramène un intervalle vers [0, 1]', () => {
    expect(range(0.5, 0, 1)).toBe(0.5)
    expect(range(0.3, 0.2, 0.4)).toBeCloseTo(0.5)
    expect(range(1, 0.2, 0.4)).toBe(1)
    expect(range(0.1, 0.2, 0.2)).toBe(0)
  })
})

describe('sampleKeyframes', () => {
  const keys: CameraKey[] = [
    { at: 0, position: [0, 0, 8], lookAt: [0, 0, 0] },
    { at: 0.5, position: [0, 0, 12], lookAt: [0, -2, 0] },
    { at: 1, position: [4, 0, 12], lookAt: [0, -2, 0] },
  ]
  const out = { position: [0, 0, 0] as Vec3, lookAt: [0, 0, 0] as Vec3 }

  it('renvoie les clés exactes aux bornes', () => {
    sampleKeyframes(keys, 0, out)
    expect(out.position).toEqual([0, 0, 8])
    sampleKeyframes(keys, 0.5, out)
    expect(out.position).toEqual([0, 0, 12])
    sampleKeyframes(keys, 1, out)
    expect(out.position).toEqual([4, 0, 12])
  })

  it('interpole entre deux clés (ease in-out, symétrique au milieu)', () => {
    sampleKeyframes(keys, 0.25, out)
    expect(out.position[2]).toBeCloseTo(10)
    expect(out.lookAt[1]).toBeCloseTo(-1)
  })

  it('reste sur la dernière clé au-delà de 1, sur la première avant 0', () => {
    sampleKeyframes(keys, 1.4, out)
    expect(out.position).toEqual([4, 0, 12])
    sampleKeyframes(keys, -0.2, out)
    expect(out.position).toEqual([0, 0, 8])
  })

  it('gère une seule clé', () => {
    const single: CameraKey[] = [{ at: 0, position: [1, 2, 3], lookAt: [0, 0, 0] }]
    sampleKeyframes(single, 0.7, out)
    expect(out.position).toEqual([1, 2, 3])
  })
})
