// Easter egg v3, beat 8, tableau 2 (« Un rail de montagnes russes l'enlace et des wagons y foncent. On
// suit le rail sur un tronçon. ») : la courbe du rail, en calcul pur, partagée par la géométrie du rail
// (coaster.ts), les wagons et la caméra (camera.ts échantillonne la même courbe). Boucle fermée autour de
// la géante, dans son plan équatorial incliné, avec des ondulations verticales : elle passe entre la
// surface et l'anneau intérieur. Repère de la voie : tangente, « haut » radial (la planète est le sol),
// côté. Sans allocation (sorties passées en argument).
import { Euler, Quaternion, Vector3 } from 'three'
import { GIANT, RAIL } from './layout'

const TILT = new Quaternion().setFromEuler(new Euler(...GIANT.tilt, 'YXZ'))
const CENTER = new Vector3(...GIANT.center)
const TAU = Math.PI * 2

/** Orientation du plan équatorial de la géante (partagée avec la planète et ses anneaux). */
export function giantTilt(): Quaternion {
  return TILT.clone()
}

/** Point du rail (repère local du parc) à l'angle θ (rad, période 2π). */
export function railPoint(theta: number, out: Vector3): Vector3 {
  const h = RAIL.rise * Math.sin(RAIL.waves * theta)
  out.set(RAIL.radius * Math.cos(theta), h, RAIL.radius * Math.sin(theta))
  return out.applyQuaternion(TILT).add(CENTER)
}

export type RailFrame = { point: Vector3; tangent: Vector3; up: Vector3; side: Vector3 }

export function createFrame(): RailFrame {
  return { point: new Vector3(), tangent: new Vector3(), up: new Vector3(), side: new Vector3() }
}

const ahead = new Vector3()
const behind = new Vector3()

/** Repère de la voie à l'angle θ : tangente (sens des θ croissants), haut radial, côté (droite). */
export function railFrame(theta: number, out: RailFrame): RailFrame {
  railPoint(theta, out.point)
  railPoint(theta + 1e-3, ahead)
  railPoint(theta - 1e-3, behind)
  out.tangent.subVectors(ahead, behind).normalize()
  out.up.subVectors(out.point, CENTER).normalize()
  out.side.crossVectors(out.tangent, out.up).normalize()
  out.up.crossVectors(out.side, out.tangent).normalize()
  return out
}

/** Longueur (unités) du rail entre deux angles, par sommation fine. */
export function railLength(from: number, to: number, steps = 400): number {
  let length = 0
  const a = new Vector3()
  const b = new Vector3()
  railPoint(from, a)
  for (let i = 1; i <= steps; i++) {
    railPoint(from + ((to - from) * i) / steps, b)
    length += a.distanceTo(b)
    a.copy(b)
  }
  return length
}

/** Angle ramené dans [0, 2π). */
export const wrapAngle = (theta: number): number => ((theta % TAU) + TAU) % TAU
