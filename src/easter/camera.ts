// Easter egg : pose de la caméra selon l'état de la séquence (E, state.ts). C'est la séquence qui pilote
// la caméra (CameraRig est démonté). Sans allocation par frame.
// - Ciel (beat 1) : face au prisme, secousse pendant le tremblement.
// - Arène (beats 2–3) : descente du ciel vers la table, puis suit la distribution et les retournements
//   (clés sur le temps, spline Catmull-Rom). Reduced-motion : plan fixe.
// - Beat 4 : rapprochement du dos de la légendaire puis plongée, dans le repère du B de la carte.
// - Beat 5 : vol le long du B géant (flight.ts), même repère local mis à l'échelle : la bascule de la
//   carte au B géant ne se voit pas. Inclinaison dans les virages, FOV qui s'élargit, tremblement.
// - Beat 6 : le B entier, de face, secousse unique à l'impact.
import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, easeInOut, lerp, range } from '../lib/math'
import { FACE_Z, FLIGHT_START, flightPoint, flightTangent } from './flight'
import { FINALE_CAMERA, GIANT_FRAME, LOGO_FRAME, SKY_CAMERA, SKY_Y } from './layout'
import { type EasterState, SHOT } from './state'

export type CameraPose = { position: Vector3; look: Vector3; up: Vector3; fov: number }

type Key = { at: number; position: readonly number[]; look: readonly number[] }

const ARENA_KEYS: readonly Key[] = [
  { at: 1.5, position: [0, 32, 6], look: [0, 0, -1] },
  { at: 3, position: [-10, 20, 12], look: [0, 0.4, 0] },
  { at: 4.8, position: [-8, 11, 16], look: [0.5, 0.4, 0] },
  { at: 6.4, position: [2, 11, 15], look: [3, 0.6, 0.8] },
  { at: 7.6, position: [5.5, 11, 12.5], look: [5.5, 0.6, 1.2] },
  { at: 9, position: [0.5, 11.5, 10], look: [0, 0.4, 0.4] },
  { at: 10.6, position: [-1, 10, 8.6], look: [-0.6, 0.4, 0.5] },
  { at: 12, position: [2.2, 8.8, 8], look: [2.6, 0.5, 0.5] },
  { at: 13.3, position: [3.5, 7.4, 7], look: [3.5, 0.8, 0.5] },
  { at: 14.4, position: [3.6, 5.6, 8.8], look: [3.5, 2.8, 1] },
]
const STILL: Key = { at: 0, position: [0, 11, 9.5], look: [0, 0.4, 0.2] }

const toCurve = (pick: (key: Key) => readonly number[]) =>
  new CatmullRomCurve3(
    ARENA_KEYS.map((key) => new Vector3().fromArray(pick(key))),
    false,
    'centripetal',
  )
const arenaPosition = toCurve((key) => key.position)
const arenaLook = toCurve((key) => key.look)

/** Index fractionnaire (0 -> 1 sur la spline) du temps t entre les clés. */
function keyParam(t: number): number {
  const last = ARENA_KEYS.length - 1
  for (let i = 0; i < last; i++) {
    const a = ARENA_KEYS[i]
    const b = ARENA_KEYS[i + 1]
    if (a && b && t < b.at) return (i + range(t, a.at, b.at)) / last
  }
  return 1
}

/** Approche (logo-local) : B entier à l'écran, puis plongée au-dessus du départ du vol. */
const APPROACH = { y: 0.05, z: -5 }
/** Hauteur de vol au-dessus de la face (unités locales) : lente, puis rasante. */
const HEIGHT = { dive: 0.1, slow: 0.24, fast: 0.09 }
const AHEAD = { slow: 0.06, fast: 0.1 }

const local = { position: new Vector3(), look: new Vector3(), up: new Vector3() }
const scratch = { a: new Vector3(), b: new Vector3(), bank: new Vector3() }
const UP_Y = new Vector3(0, 1, 0)
const UP_FACE = new Vector3(0, 0, -1)

/** Pose locale (repère du B) pendant la plongée (shot arène) ou le vol (shot vol). */
function localPose(e: EasterState): void {
  const { position, look, up } = local
  if (e.shot < SHOT.flight) {
    const d = e.dive
    position.set(
      lerp(0, FLIGHT_START.x, d),
      lerp(APPROACH.y, FLIGHT_START.y, d),
      lerp(APPROACH.z, FACE_Z - HEIGHT.dive, d),
    )
    look.set(position.x, position.y, FACE_Z)
    up.copy(UP_Y)
    return
  }
  const u = e.flight
  const k = easeInOut(range(u, 0, 0.07))
  flightPoint(u, position)
  // Après la plongée, la caméra reprend de la hauteur pour lire la courbe, puis rase la surface
  const cruise = lerp(HEIGHT.slow, HEIGHT.fast, Math.sqrt(e.speed))
  position.z = FACE_Z - lerp(HEIGHT.dive, cruise, easeInOut(range(u, 0, 0.05)))
  flightPoint(u + lerp(AHEAD.slow, AHEAD.fast, e.speed), scratch.a)
  flightPoint(u, look).lerp(scratch.a, k)
  // Visée au-dessus de la surface : on voit loin devant (l'horizon, les traînées), pas ses pieds
  look.z = FACE_Z - 0.6 * k * (FACE_Z - position.z)
  // Inclinaison vers l'intérieur du virage (courbure), plafonnée
  flightTangent(u, scratch.a)
  flightTangent(u + 0.02, scratch.bank).sub(scratch.a)
  const bend = scratch.bank.length()
  if (bend > 0.35) scratch.bank.multiplyScalar(0.35 / bend)
  up.copy(UP_Y)
    .lerp(UP_FACE, k)
    .normalize()
    .addScaledVector(scratch.bank, 1.5 * k)
    .normalize()
}

/** FOV vertical de base : 35°, élargi en portrait pour garder la table en largeur (plafonné). */
function baseFov(aspect: number): number {
  const half = Math.tan((17.5 * Math.PI) / 180) * 1.45
  const fov = (2 * Math.atan(half / Math.max(aspect, 0.1)) * 180) / Math.PI
  return clamp(fov, 35, 72)
}

/** Recul en portrait étroit, quand le FOV plafonné ne suffit plus. */
function pullBack(aspect: number, fov: number): number {
  const need = Math.tan((17.5 * Math.PI) / 180) * 1.45
  const have = Math.tan((fov * Math.PI) / 360) * aspect
  return Math.max(1, need / have)
}

function arenaPose(e: EasterState, pose: CameraPose, aspect: number, fov: number) {
  if (e.reduced) {
    pose.position.fromArray(STILL.position)
    pose.look.fromArray(STILL.look)
  } else {
    const p = keyParam(Math.max(e.t, 1.5))
    arenaPosition.getPoint(p, pose.position)
    arenaLook.getPoint(p, pose.look)
  }
  const pull = pullBack(aspect, fov)
  pose.position.sub(pose.look).multiplyScalar(pull).add(pose.look)
  pose.up.copy(UP_Y)
  if (e.approach <= 0) return
  localPose(e)
  const w = e.approach
  pose.position.lerp(scratch.a.copy(local.position).applyMatrix4(LOGO_FRAME), w)
  pose.look.lerp(scratch.b.copy(local.look).applyMatrix4(LOGO_FRAME), w)
}

export function solveCamera(e: EasterState, aspect: number, pose: CameraPose): void {
  const fov = baseFov(aspect)
  pose.fov = fov
  pose.up.copy(UP_Y)
  if (e.shot === SHOT.sky) {
    pose.position.fromArray(SKY_CAMERA)
    pose.position.z += 0.4 * e.flash
    pose.look.set(0, SKY_Y, 0)
  } else if (e.shot === SHOT.arena) {
    arenaPose(e, pose, aspect, fov)
  } else if (e.shot === SHOT.flight) {
    localPose(e)
    pose.position.copy(local.position).applyMatrix4(GIANT_FRAME)
    pose.look.copy(local.look).applyMatrix4(GIANT_FRAME)
    pose.up.copy(local.up).transformDirection(GIANT_FRAME)
    pose.fov = fov + 42 * Math.pow(e.speed, 1.6)
  } else {
    pose.position.fromArray(FINALE_CAMERA)
    pose.look.set(0, 0, 0)
    pose.fov = fov + 5 * e.impact
  }
}

/** Amplitude du tremblement (radians) : prisme qui charge, vitesse du vol, impact. Rien en reduced. */
export function shakeAmount(e: EasterState): number {
  if (e.reduced) return 0
  if (e.shot === SHOT.sky) return 0.006 * e.tremble
  if (e.shot === SHOT.arena) return 0.002 * e.charge
  if (e.shot === SHOT.flight) return 0.011 * e.speed * e.speed
  return 0.02 * e.impact
}
