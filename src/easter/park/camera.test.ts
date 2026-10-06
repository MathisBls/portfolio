// Tests de la caméra du parc (camera.ts) : trajectoire continue, sans saut entre échantillons voisins,
// vitesse et roulis continus, arrêt face au B puis dérive douce, plans fixes immobiles (reduced-motion).
import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { PATH_END, createPose, parkCamera, sceneTime, stillIndex } from './camera'
import { MONUMENT, PARK_ORIGIN, STILL_TIME } from './layout'
import { PARK_DURATION, parkDuration, parkStills } from './timeline'

const DT = 1 / 60

function sample(from: number, to: number) {
  const poses = []
  for (let t = from; t <= to; t += DT) {
    const pose = createPose()
    parkCamera(t, pose)
    poses.push({ t, pose })
  }
  return poses
}

describe('trajectoire du parc', () => {
  const poses = sample(0, PARK_DURATION + 30)

  it('ne produit jamais de valeur invalide', () => {
    for (const { pose } of poses) {
      expect(Number.isFinite(pose.position.x + pose.position.y + pose.position.z)).toBe(true)
      expect(Number.isFinite(pose.target.x + pose.target.y + pose.target.z)).toBe(true)
      expect(Number.isFinite(pose.fov + pose.roll)).toBe(true)
    }
  })

  it('est continue : pas de saut entre deux images voisines (60 i/s)', () => {
    for (let i = 1; i < poses.length; i++) {
      const a = poses[i - 1]
      const b = poses[i]
      if (!a || !b) continue
      // 150 unités/s au plus (plongée vers la géante) : 2.5 unités par image
      expect(a.pose.position.distanceTo(b.pose.position)).toBeLessThan(2.5)
      expect(a.pose.target.distanceTo(b.pose.target)).toBeLessThan(6)
      expect(Math.abs(a.pose.fov - b.pose.fov)).toBeLessThan(0.2)
      expect(Math.abs(a.pose.roll - b.pose.roll)).toBeLessThan(0.02)
    }
  })

  it('a une vitesse continue : aucun saut de vitesse aux clés (Δv < 2.5 unités/s par image)', () => {
    for (let i = 2; i < poses.length; i++) {
      const a = poses[i - 2]
      const b = poses[i - 1]
      const c = poses[i]
      if (!a || !b || !c) continue
      const v1 = new Vector3().subVectors(b.pose.position, a.pose.position)
      const v2 = new Vector3().subVectors(c.pose.position, b.pose.position)
      // Une clé mal raccordée ferait sauter la vitesse de dizaines d'unités/s d'une image à l'autre
      expect(v2.sub(v1).length() / DT).toBeLessThan(2.5)
    }
  })

  it('s’arrête face au B à la fin du vol, puis dérive à peine (beat 9)', () => {
    const end = createPose()
    parkCamera(PATH_END, end)
    const center = new Vector3(...MONUMENT.center).add(new Vector3(...PARK_ORIGIN))
    expect(end.position.distanceTo(center)).toBeCloseTo(MONUMENT.distance, 0)
    const later = createPose()
    for (const t of [PATH_END + 5, PATH_END + 60, PATH_END + 600]) {
      parkCamera(t, later)
      expect(later.position.distanceTo(end.position)).toBeLessThan(8)
      expect(Math.abs(later.roll)).toBeLessThan(0.05)
    }
  })
})

describe('plans fixes (reduced-motion)', () => {
  it('chaque plan est immobile et le dernier (le B) reste', () => {
    const a = createPose()
    const b = createPose()
    for (let i = 0; i < parkStills.length; i++) {
      parkCamera(i * STILL_TIME + 0.2, a, true)
      parkCamera(i * STILL_TIME + STILL_TIME - 0.2, b, true)
      expect(a.position.distanceTo(b.position)).toBe(0)
      expect(a.roll).toBe(0)
    }
    expect(stillIndex(parkDuration(true) + 100)).toBe(parkStills.length - 1)
  })

  it('pose les objets à l’instant du plan, pas au temps de la timeline', () => {
    expect(sceneTime(0.3, true)).toBe(sceneTime(STILL_TIME - 0.3, true))
    expect(sceneTime(12.3, false)).toBe(12.3)
  })
})
