// Tests du profil de vitesse et du placement des repères sur la route de l'easter egg (roadPath.ts),
// route longue du correctif 2 (≈ 19 s, montée lente, projets et arches répartis).
import { describe, expect, it } from 'vitest'
import {
  ARCH_PASSES,
  CAMERA_Z,
  LANDMARKS,
  ROAD_LENGTH,
  ROAD_TIME,
  distanceEase,
  landmarkDistance,
  landmarkZ,
  passDistance,
  roadDistance,
  roadSpeed,
  speedEase,
} from './roadPath'

describe('profil de la route', () => {
  it('dure entre 18 et 20 s', () => {
    expect(ROAD_TIME).toBeGreaterThanOrEqual(18)
    expect(ROAD_TIME).toBeLessThanOrEqual(20)
  })

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
    for (const p of [0.2, 0.6, 0.9]) {
      const dp = 1e-4
      const derivative = (roadDistance(p + dp) - roadDistance(p - dp)) / (2 * dp) / ROAD_TIME
      expect(derivative).toBeCloseTo(roadSpeed(p), 1)
    }
  })

  it('monte lentement : encore sous 60 unités/s aux deux tiers du temps', () => {
    expect(roadSpeed(0.66)).toBeLessThan(60)
    expect(roadSpeed(0.66)).toBeGreaterThan(roadSpeed(0) * 3)
  })

  it('accélère fort sur la fin (vitesse de la lumière)', () => {
    expect(roadSpeed(1)).toBeGreaterThan(roadSpeed(0.7) * 4)
  })

  it('intensité perçue qui monte tout du long (pas seulement à la fin)', () => {
    expect(speedEase(0.5)).toBeGreaterThan(0.2)
    expect(speedEase(0.5)).toBeLessThan(0.5)
    let last = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const s = speedEase(p)
      expect(s).toBeGreaterThan(last)
      last = s
    }
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
  it('alternent gauche et droite, le convoi Wegir en premier', () => {
    expect(LANDMARKS[0]?.id).toBe('wegir')
    LANDMARKS.forEach((mark, i) => {
      const next = LANDMARKS[i + 1]
      if (next) expect(next.side).toBe(-mark.side)
    })
  })

  it('sont répartis sur la route (au moins 2 s entre deux, le dernier avant les deux tiers)', () => {
    LANDMARKS.forEach((mark, i) => {
      const next = LANDMARKS[i + 1]
      if (next) expect(next.pass - mark.pass).toBeGreaterThanOrEqual(2)
    })
    expect(LANDMARKS.at(-1)?.pass ?? 0).toBeLessThan((ROAD_TIME * 2) / 3)
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

  it('se lisent à vitesse de croisière (moins de 80 unités/s au passage)', () => {
    LANDMARKS.forEach((mark) => {
      expect(roadSpeed(mark.pass / ROAD_TIME)).toBeLessThan(80)
    })
  })
})

describe('arches au-dessus de la route', () => {
  it('nombreuses, dans l’ordre, avant la fin', () => {
    expect(ARCH_PASSES.length).toBeGreaterThanOrEqual(12)
    ARCH_PASSES.forEach((pass, i) => {
      const next = ARCH_PASSES[i + 1]
      if (next !== undefined) expect(next).toBeGreaterThan(pass)
      expect(passDistance(pass)).toBeLessThan(ROAD_LENGTH)
    })
  })

  it('passent à moins de 3 par seconde (aucun effet stroboscopique)', () => {
    ARCH_PASSES.forEach((pass, i) => {
      const next = ARCH_PASSES[i + 1]
      if (next !== undefined) expect(next - pass).toBeGreaterThan(1 / 3)
    })
  })

  it('ne masquent pas les projets (au moins 0.3 s d’écart)', () => {
    ARCH_PASSES.forEach((pass) => {
      LANDMARKS.forEach((mark) => {
        expect(Math.abs(mark.pass - pass)).toBeGreaterThan(0.3)
      })
    })
  })
})
