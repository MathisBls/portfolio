// Tests du profil de vitesse et du placement des projets sur la route de l'easter egg (roadPath.ts).
import { describe, expect, it } from 'vitest'
import {
  CAMERA_Z,
  LANDMARKS,
  ROAD_LENGTH,
  ROAD_TIME,
  distanceEase,
  landmarkDistance,
  landmarkZ,
  roadDistance,
  roadSpeed,
  speedEase,
} from './roadPath'

describe('profil de la route', () => {
  it('part de zéro et la distance croît strictement', () => {
    expect(roadDistance(0)).toBe(0)
    let last = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const d = roadDistance(p)
      expect(d).toBeGreaterThan(last)
      last = d
    }
  })

  it('la distance est bien l’intégrale de la vitesse', () => {
    const p = 0.6
    const dp = 1e-4
    const derivative = (roadDistance(p + dp) - roadDistance(p - dp)) / (2 * dp) / ROAD_TIME
    expect(derivative).toBeCloseTo(roadSpeed(p), 1)
  })

  it('accélère fort sur la fin (vitesse de la lumière)', () => {
    expect(roadSpeed(1)).toBeGreaterThan(roadSpeed(0.7) * 4)
  })

  it('eases GSAP bornés à [0, 1]', () => {
    expect(distanceEase(0)).toBe(0)
    expect(distanceEase(1)).toBeCloseTo(1)
    expect(speedEase(0)).toBe(0)
    expect(speedEase(1)).toBeCloseTo(1)
    expect(roadDistance(1)).toBe(ROAD_LENGTH)
  })
})

describe('projets en bord de route', () => {
  it('alternent gauche et droite, la convoi Wegir en premier', () => {
    expect(LANDMARKS[0]?.id).toBe('wegir')
    LANDMARKS.forEach((mark, i) => {
      const next = LANDMARKS[i + 1]
      if (next) expect(next.side).toBe(-mark.side)
    })
  })

  it('passent dans l’ordre, avant la fin de la route', () => {
    for (const reduced of [false, true]) {
      let last = 0
      LANDMARKS.forEach((_, i) => {
        const d = landmarkDistance(i, reduced)
        expect(d).toBeGreaterThan(last)
        expect(d).toBeLessThan(ROAD_LENGTH)
        last = d
      })
    }
  })

  it('croisent la caméra quand la distance parcourue atteint la leur', () => {
    const d = landmarkDistance(2, false)
    expect(landmarkZ(d, d)).toBe(CAMERA_Z)
    expect(landmarkZ(d, d - 50)).toBeLessThan(CAMERA_Z)
    expect(landmarkZ(d, d + 50)).toBeGreaterThan(CAMERA_Z)
  })

  it('se lisent à vitesse de croisière (moins de 120 unités/s au passage)', () => {
    LANDMARKS.forEach((mark) => {
      expect(roadSpeed(mark.pass / ROAD_TIME)).toBeLessThan(120)
    })
  })
})
