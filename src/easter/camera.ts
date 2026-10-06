// Easter egg v3 (docs/storyboards/easter-park.md, beats 1 à 7) : pose de la caméra selon l'état de la
// séquence (E, state.ts). C'est la séquence qui pilote la caméra (CameraRig est démonté) ; application,
// tremblement et délégation au parc (beat 8, parkCamera de D2) : EasterCamera.tsx. Sans allocation.
// - Ciel (beat 1) : zoom de 3 s vers le prisme intact (E.zoom), recul bref à l'éclatement.
// - Arène (beats 2–3) : descente du ciel vers la table, puis suit la distribution et les retournements
//   (clés sur le temps, spline Catmull-Rom). Reduced-motion : plan fixe.
// - Beat 4 : rapprochement du dos de la légendaire puis plongée sur le B (repère du B de la carte,
//   LOGO_FRAME) jusqu'à ce que son rose remplisse l'écran.
// - Route : caméra fixe dans une voie (c'est la route qui défile), légère dérive, FOV qui s'élargit avec
//   la vitesse.
// - Espace (beats 4 à 7) : à l'origine, regard vers −Z, dérive très lente (lacet, tangage, roulis de
//   quelques centièmes de radian), FOV qui s'ouvre pour le cockpit ; au bond, le regard s'aligne sur la
//   porte et le FOV pousse brièvement. C'est la porte qui approche (space/layout.ts).
import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, lerp, range } from '../lib/math'
import { LOGO_FRAME, SKY_CAMERA, SKY_Y } from './layout'
import { CAMERA_Z } from './roadPath'
import { GATE_DIRECTION } from './space/layout'
import { type EasterState, SHOT } from './state'
import { T } from './times'

export type CameraPose = { position: Vector3; look: Vector3; up: Vector3; fov: number }

type Key = { at: number; position: readonly number[]; look: readonly number[] }

const A = T.arena
// Salon de jeu (arena.glb) : emplacements en z 1.55, paquet dans le sabot en (7.6, 1.4), médaillon du B en
// z -2.35 (layout.ts). La descente montre la salle entière (colonnes, rideaux, sol miroir) puis plonge sur
// la table ; ensuite la caméra suit la distribution depuis le sabot et les retournements.
const ARENA_KEYS: readonly Key[] = [
  { at: A, position: [0, 32, 7], look: [0, 0, -0.6] },
  { at: A + 1.5, position: [-11, 20, 13], look: [0, 0.4, 0.2] },
  { at: A + 3.3, position: [-8, 11, 16.8], look: [0.5, 0.4, 0.6] },
  { at: A + 4.9, position: [2.6, 10.8, 15.6], look: [3.6, 0.6, 1.4] },
  { at: A + 6.1, position: [6.2, 10.6, 13.8], look: [5.9, 0.6, 1.9] },
  { at: A + 7.5, position: [0.5, 11.5, 10.9], look: [0, 0.4, 1.3] },
  { at: A + 9.1, position: [-1, 10, 9.5], look: [-0.6, 0.4, 1.4] },
  { at: A + 10.5, position: [2.3, 8.8, 8.9], look: [2.7, 0.5, 1.4] },
  { at: A + 11.8, position: [3.6, 7.4, 7.9], look: [3.6, 0.8, 1.4] },
  { at: A + 12.9, position: [3.7, 5.6, 9.7], look: [3.6, 2.8, 1.9] },
]
const STILL: Key = { at: 0, position: [0, 11, 10.4], look: [0, 0.4, 1.1] }

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

/** Zoom du ciel : distance au prisme au départ et à l'arrivée, FOV qui se resserre un peu. */
const ZOOM = { from: SKY_CAMERA[2], to: 3.7, narrow: 6 }
/** Face lisible du B (−Z, b_logo.glb 0.05 d'épaisseur) et point visé par la plongée (croissant rose). */
const FACE_Z = -0.025
const DIVE = { x: -0.39, y: 0.43, height: 0.08 }
/** Approche (repère du B) : B entier à l'écran. */
const APPROACH = { y: 0.05, z: -5 }
/** Route : caméra dans la voie de droite, regard vers l'horizon. */
const ROAD = { x: 2.1, y: 1.55, look: { y: 1.05, z: -90 }, drift: 0.35 }

/** Espace : dérive (amplitudes en radians, pulsations en rad/s), ouverture du FOV pour le cockpit. */
const SPACE = {
  yaw: { amp: 0.014, freq: 0.07 },
  pitch: { amp: 0.009, freq: 0.053 },
  roll: { amp: 0.022, freq: 0.041 },
  fov: 60,
}

const local = { position: new Vector3(), look: new Vector3() }
const scratch = new Vector3()
const UP_Y = new Vector3(0, 1, 0)

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
    const p = keyParam(Math.max(e.t, T.arena))
    arenaPosition.getPoint(p, pose.position)
    arenaLook.getPoint(p, pose.look)
  }
  const pull = pullBack(aspect, fov)
  pose.position.sub(pose.look).multiplyScalar(pull).add(pose.look)
  if (e.approach <= 0) return
  // Plongée dans le repère du B de la carte : du B entier à son rose qui remplit l'écran
  const d = e.dive
  local.position.set(
    lerp(0, DIVE.x, d),
    lerp(APPROACH.y, DIVE.y, d),
    lerp(APPROACH.z, FACE_Z - DIVE.height, d),
  )
  local.look.set(local.position.x, local.position.y, FACE_Z)
  pose.position.lerp(scratch.copy(local.position).applyMatrix4(LOGO_FRAME), e.approach)
  pose.look.lerp(scratch.copy(local.look).applyMatrix4(LOGO_FRAME), e.approach)
}

/** FOV du parc (donné pour un écran paysage) élargi en portrait : même champ horizontal qu'à 4:3. */
export function portraitFov(fov: number, aspect: number): number {
  const reference = 4 / 3
  if (aspect >= reference) return fov
  const half = Math.tan((fov * Math.PI) / 360) * reference
  return clamp((2 * Math.atan(half / Math.max(aspect, 0.1)) * 180) / Math.PI, fov, 88)
}

/** FOV de l'espace : celui du cockpit de park.glb (60° en 16:9, park/types.ts), élargi en portrait. */
export function spaceFov(aspect: number): number {
  return portraitFov(SPACE.fov, aspect)
}

/** Beats 4 à 7 : dérive lente autour de −Z, regard aligné sur la porte au bond. */
function spacePose(e: EasterState, pose: CameraPose, aspect: number, fov: number) {
  const t = e.t
  const still = e.reduced ? 0 : 1
  const yaw = still * SPACE.yaw.amp * Math.sin(t * SPACE.yaw.freq)
  const pitch = still * SPACE.pitch.amp * Math.sin(t * SPACE.pitch.freq + 1)
  const roll = still * SPACE.roll.amp * Math.sin(t * SPACE.roll.freq + 2)
  pose.position.set(0, 0, 0)
  pose.look.set(Math.sin(yaw), Math.sin(pitch), -1).lerp(GATE_DIRECTION, e.leap)
  pose.up.set(Math.sin(roll), Math.cos(roll), 0)
  pose.fov =
    lerp(fov, spaceFov(aspect), e.cockpit) +
    40 * Math.pow(e.speed, 1.5) +
    12 * Math.sin(Math.PI * e.leap)
}

export function solveCamera(e: EasterState, aspect: number, pose: CameraPose): void {
  const fov = baseFov(aspect)
  pose.fov = fov
  pose.up.copy(UP_Y)
  if (e.shot === SHOT.sky) {
    pose.position.set(0, SKY_Y, lerp(ZOOM.from, ZOOM.to, e.zoom) + 0.6 * e.flash)
    pose.look.set(0, SKY_Y, 0)
    pose.fov = fov - ZOOM.narrow * e.zoom + 4 * e.kick
  } else if (e.shot === SHOT.arena) {
    arenaPose(e, pose, aspect, fov)
  } else if (e.shot === SHOT.road) {
    const drift = e.reduced ? 0 : ROAD.drift * Math.sin(e.t * 0.4)
    pose.position.set(ROAD.x + drift, ROAD.y, CAMERA_Z)
    pose.look.set(ROAD.x * 0.85 + drift, ROAD.look.y, ROAD.look.z)
    pose.fov = fov + 40 * Math.pow(e.speed, 1.5)
  } else {
    spacePose(e, pose, aspect, fov)
  }
}

/** Amplitude du tremblement (radians) : tension du zoom, éclatement, vitesse, bond. Rien en reduced. */
export function shakeAmount(e: EasterState): number {
  if (e.reduced) return 0
  if (e.shot === SHOT.sky) return 0.0025 * e.tremble + 0.03 * e.kick
  if (e.shot === SHOT.arena) return 0.002 * e.charge
  if (e.shot === SHOT.road) return 0.011 * e.speed * e.speed
  return 0.02 * e.kick + 0.006 * Math.sin(Math.PI * e.leap)
}
