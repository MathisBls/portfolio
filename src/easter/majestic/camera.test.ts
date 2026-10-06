// Tests de la caméra du second niveau (camera.ts) : trajectoire continue (position, regard, FOV, roulis,
// vitesse), jamais sous la plaine ni dans la montagne ni dans un colosse, plans fixes immobiles
// (reduced-motion), tremblement borné et coupé en reduced-motion.
import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  PATH_END,
  PATH_START,
  SHAKE_MAX,
  STILL_FROM,
  createMajesticPose,
  majesticCamera,
  majesticShake,
  stillIndex,
} from './camera'
import { CHOIR, MOUNTAIN, choirCount, choirSlot } from './layout'
import { MT } from './times'

const DT = 1 / 60

function sample(from: number, to: number) {
  const poses = []
  for (let t = from; t <= to; t += DT) {
    poses.push({ t, pose: majesticCamera(t, createMajesticPose(), false) })
  }
  return poses
}

const poses = sample(PATH_START, PATH_END + 2)
const direction = (pose: ReturnType<typeof createMajesticPose>) =>
  new Vector3().subVectors(pose.target, pose.position).normalize()

describe('trajectoire du second niveau', () => {
  it('ne produit jamais de valeur invalide', () => {
    for (const { pose } of poses) {
      expect(Number.isFinite(pose.position.x + pose.position.y + pose.position.z)).toBe(true)
      expect(Number.isFinite(pose.target.x + pose.target.y + pose.target.z)).toBe(true)
      expect(Number.isFinite(pose.fov + pose.roll)).toBe(true)
    }
  })

  it('est continue à 60 i/s : position, regard, FOV et roulis sans saut', () => {
    for (let i = 1; i < poses.length; i++) {
      const a = poses[i - 1]
      const b = poses[i]
      if (!a || !b) continue
      // Piqué à 2.5 km/s au plus : ≈ 42 m par image
      expect(a.pose.position.distanceTo(b.pose.position)).toBeLessThan(42)
      // Le regard tourne de moins de 1.2° par image (72°/s)
      expect(direction(a.pose).angleTo(direction(b.pose))).toBeLessThan(0.021)
      expect(Math.abs(a.pose.fov - b.pose.fov)).toBeLessThan(0.1)
      expect(Math.abs(a.pose.roll - b.pose.roll)).toBeLessThan(0.004)
    }
  })

  it('a une vitesse continue : pas de coup d’accélérateur aux clés', () => {
    for (let i = 2; i < poses.length; i++) {
      const a = poses[i - 2]
      const b = poses[i - 1]
      const c = poses[i]
      if (!a || !b || !c) continue
      const v1 = b.pose.position.clone().sub(a.pose.position).divideScalar(DT)
      const v2 = c.pose.position.clone().sub(b.pose.position).divideScalar(DT)
      // 25 m/s gagnés ou perdus par image au plus (≈ 150 g lissés : le piqué ressource fort)
      expect(v1.distanceTo(v2)).toBeLessThan(25)
    }
  })

  it('reste au-dessus de la plaine, hors de la montagne et des colosses', () => {
    const count = choirCount(false)
    const slot: [number, number, number] = [0, 0, 0]
    for (const { t, pose } of poses) {
      const p = pose.position
      expect(p.y).toBeGreaterThan(12)
      const fromAxis = Math.hypot(p.x - MOUNTAIN.position[0], p.z - MOUNTAIN.position[2])
      if (t >= MT.mountain && p.y < MOUNTAIN.height + 50) {
        expect(fromAxis).toBeGreaterThan(MOUNTAIN.radius * (1 - p.y / MOUNTAIN.height) + 150)
      }
      if (t >= MT.choir && p.y < CHOIR.height + 40) {
        for (let i = 0; i < count; i++) {
          choirSlot(i, count, slot)
          expect(Math.hypot(p.x - slot[0], p.z - slot[2])).toBeGreaterThan(90)
        }
      }
    }
  })

  it('tient chaque plan fixe en reduced-motion, et en change aux repères', () => {
    for (let i = 0; i < STILL_FROM.length; i++) {
      const from = STILL_FROM[i] ?? 0
      const to = STILL_FROM[i + 1] ?? from + 5
      const a = majesticCamera(from + 0.01, createMajesticPose(), true)
      const b = majesticCamera(to - 0.01, createMajesticPose(), true)
      expect(a.position.distanceTo(b.position)).toBe(0)
      expect(stillIndex(from + 0.01)).toBe(i)
    }
  })
})

describe('tremblement', () => {
  it('est nul en reduced-motion', () => {
    expect(majesticShake({ reduced: true, entry: 1, quake: 1, rise: 0.5 })).toBe(0)
  })

  it('reste borné et doux, même au plus fort du séisme', () => {
    for (const quake of [0, 0.3, 0.7, 1]) {
      for (const rise of [0, 0.5, 1]) {
        const shake = majesticShake({ reduced: false, entry: 1, quake, rise })
        expect(shake).toBeGreaterThanOrEqual(0)
        expect(shake).toBeLessThanOrEqual(SHAKE_MAX)
      }
    }
    expect(SHAKE_MAX).toBeLessThan(0.01)
  })
})
