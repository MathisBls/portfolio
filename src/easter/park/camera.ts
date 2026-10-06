// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md : « Vol en vaisseau sur une spline à
// travers des tableaux », puis « arrivée face au B géant ») : pose de la caméra du parc, en calcul pur
// (testé, camera.test.ts), sans allocation par frame.
// - Trajectoire : spline Catmull-Rom (centripète) à travers des clés datées (porte, allée des écrans,
//   rail de la géante, roue de la lune, planète des cartes, B). Sur le rail, les clés sont échantillonnées
//   sur la courbe du rail elle-même (rail.ts) : la caméra suit la même courbe que la voie.
// - Vitesse continue : la spline est reparamétrée par l'abscisse curviligne, et l'abscisse en fonction
//   du temps est une Hermite monotone (Fritsch-Carlson) à travers les clés : pas de saut de vitesse aux
//   clés, arrêt en douceur sur la dernière (vitesse nulle). Même chose pour le point visé.
// - Roulis : le « haut » suit des clés (monde, ou haut de la voie sur le rail : la planète devient le
//   sol), plus une inclinaison dans les virages proportionnelle à l'accélération latérale (différences
//   finies sur une demi-seconde : continue même là où la courbure saute).
// - Beat 9 : passé PARK_DURATION, dérive lente autour de la pose finale, qui monte en douceur.
// - Reduced-motion : plans fixes (parkStills), aucun mouvement.
// Coordonnées monde (repère du parc + PARK_ORIGIN). Application à la caméra : applyParkPose.
import { CatmullRomCurve3, type PerspectiveCamera, Vector3 } from 'three'
import { clamp, lerp } from '../../lib/math'
import {
  BEATS,
  CARD_PLANET,
  LEGEND_OFFSET,
  MONUMENT,
  MOON,
  PARK_ORIGIN,
  RAIL,
  STILL_TIME,
  type V3,
  WHEEL,
} from './layout'
import { createFrame, railFrame, railLength } from './rail'

export type ParkPose = {
  position: Vector3
  target: Vector3
  /** FOV vertical (degrés), pour un écran paysage ; à élargir en portrait comme ailleurs. */
  fov: number
  /** Angle (rad) à passer à camera.rotateZ après lookAt(target) avec up = +Y. */
  roll: number
}

export function createPose(): ParkPose {
  return { position: new Vector3(), target: new Vector3(), fov: 60, roll: 0 }
}

type Key = { at: number; position: Vector3; look: Vector3; up: Vector3; fov: number }

const Y = new Vector3(0, 1, 0)
const ORIGIN = new Vector3(...PARK_ORIGIN)
const v = (p: V3) => new Vector3(...p)

/** Normale du plan de la grande roue (monde) et son axe « droite » (3 h). */
export function wheelAxes(): { normal: Vector3; right: Vector3 } {
  const normal = new Vector3(Math.sin(WHEEL.yaw), 0, Math.cos(WHEEL.yaw))
  const right = new Vector3().crossVectors(Y, normal).normalize()
  return { normal, right }
}

/** Point de passage dans la roue : entre la lune et la jante, à 3 h. */
const WHEEL_GAP = MOON.radius + (WHEEL.radius - MOON.radius) * 0.45

/** Pose finale face au B (beat 9) : devant sa face lisible, regard un peu sous son centre. */
export function monumentFacing(): Vector3 {
  return new Vector3(-0.12, -0.08, 1).normalize()
}

function buildKeys(): Key[] {
  const keys: Key[] = []
  const add = (at: number, position: Vector3, look: Vector3, fov: number, up = Y) => {
    keys.push({ at, position, look, up: up.clone(), fov })
  }
  // 1. La porte (anneau en z 0) puis l'allée des écrans, en légers lacets entre les écrans
  add(BEATS.gate, v([0, 1.5, 34]), v([0, 0, -80]), 64)
  add(BEATS.alley, v([2, 0.5, -44]), v([-3, 2, -170]), 62)
  add(6.2, v([-7, 4, -165]), v([4, -1, -300]), 60)
  add(9.6, v([7, -3, -282]), v([-5, 1, -420]), 60)
  add(12.5, v([-3, 2, -385]), v([-60, -2, -640]), 58)
  // 2. La géante : plongée vers elle, puis on rejoint le rail dans l'axe de sa tangente
  const frame = createFrame()
  railFrame(RAIL.enter, frame)
  const entry = frame.point.clone().addScaledVector(frame.up, RAIL.ride)
  add(BEATS.alleyEnd, v([-24, -2, -500]), entry.clone().addScaledVector(frame.tangent, -60), 60)
  add(
    19.4,
    entry.clone().addScaledVector(frame.tangent, -190).addScaledVector(frame.up, 40),
    entry.clone().addScaledVector(frame.tangent, 30),
    63,
    Y.clone().lerp(frame.up, 0.3).normalize(),
  )
  // Sur le rail : clés échantillonnées sur la voie, datées à vitesse constante
  const total = railLength(RAIL.enter, RAIL.exit)
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const theta = lerp(RAIL.enter, RAIL.exit, i / steps)
    railFrame(theta + 0.3, frame)
    const look = frame.point.clone().addScaledVector(frame.up, RAIL.ride * 0.5)
    railFrame(theta, frame)
    const position = frame.point.clone().addScaledVector(frame.up, RAIL.ride)
    const at = BEATS.rail + ((BEATS.railEnd - BEATS.rail) * railLength(RAIL.enter, theta, 60)) / total
    add(at, position, look, 68, Y.clone().lerp(frame.up, 0.7).normalize())
  }
  // 3. Sortie du rail dans l'axe, puis traversée de la grande roue entre la lune et la jante
  railFrame(RAIL.exit, frame)
  const exit = frame.point.clone().addScaledVector(frame.up, RAIL.ride)
  const moon = v(MOON.center)
  const { normal, right } = wheelAxes()
  const gap = moon.clone().addScaledVector(right, WHEEL_GAP)
  add(
    35.6,
    exit.clone().addScaledVector(frame.tangent, 130).addScaledVector(frame.up, 25),
    moon.clone(),
    62,
    Y.clone().lerp(frame.up, 0.2).normalize(),
  )
  add(38, gap.clone().addScaledVector(normal, 120), gap.clone(), 58)
  add(BEATS.wheel, gap.clone().addScaledVector(normal, 4), gap.clone().addScaledVector(normal, -200), 64)
  // 4. La planète des cartes : arc devant elle, la légendaire géante en premier plan
  const planet = v(CARD_PLANET.center)
  const legend = planet.clone().add(v(LEGEND_OFFSET))
  add(45, planet.clone().add(v([190, -40, 380])), legend.clone().add(v([20, 0, 0])), 58)
  add(BEATS.cards, planet.clone().add(v([265, 0, 150])), legend.clone(), 54)
  // 5. Le B : on contourne la planète par la gauche, approche, puis arrêt face à lui
  const monument = v(MONUMENT.center)
  const facing = monumentFacing()
  add(
    BEATS.monument,
    planet.clone().add(v([225, 45, -80])),
    monument.clone().add(v([0, -10, 0])),
    56,
  )
  add(
    64,
    monument.clone().addScaledVector(facing, MONUMENT.distance * 1.5),
    monument.clone().add(v([0, -12, 0])),
    52,
  )
  add(
    BEATS.stop,
    monument.clone().addScaledVector(facing, MONUMENT.distance),
    monument.clone().add(v([0, -14, 0])),
    50,
  )
  return keys
}

// --- Spline datée : abscisse curviligne en fonction du temps (Hermite monotone) ---

type Track = {
  curve: CatmullRomCurve3
  times: number[]
  lengths: number[]
  slopes: number[]
  total: number
}

/** Pentes de Fritsch-Carlson (interpolation monotone), pente nulle imposée à la fin (arrêt). */
function monotoneSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length
  const delta: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1] ?? 0) - (xs[i] ?? 0)
    delta.push(dx > 0 ? ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / dx : 0)
  }
  const m: number[] = new Array<number>(n).fill(0)
  m[0] = delta[0] ?? 0
  for (let i = 1; i < n - 1; i++) {
    const a = delta[i - 1] ?? 0
    const b = delta[i] ?? 0
    m[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  }
  m[n - 1] = 0
  // Garde la monotonie (Fritsch-Carlson : α² + β² ≤ 9)
  for (let i = 0; i < n - 1; i++) {
    const d = delta[i] ?? 0
    if (d === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = (m[i] ?? 0) / d
    const b = (m[i + 1] ?? 0) / d
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      m[i] = k * a * d
      m[i + 1] = k * b * d
    }
  }
  return m
}

/** Hermite cubique entre les clés (xs croissants), bornée aux extrémités. */
function hermite(xs: readonly number[], ys: readonly number[], ms: readonly number[], x: number) {
  const n = xs.length
  const first = xs[0] ?? 0
  const last = xs[n - 1] ?? 0
  if (x <= first) return ys[0] ?? 0
  if (x >= last) return ys[n - 1] ?? 0
  let i = 0
  while (i < n - 2 && x > (xs[i + 1] ?? 0)) i++
  const x0 = xs[i] ?? 0
  const h = (xs[i + 1] ?? 0) - x0
  const s = (x - x0) / h
  const s2 = s * s
  const s3 = s2 * s
  return (
    (2 * s3 - 3 * s2 + 1) * (ys[i] ?? 0) +
    (s3 - 2 * s2 + s) * h * (ms[i] ?? 0) +
    (-2 * s3 + 3 * s2) * (ys[i + 1] ?? 0) +
    (s3 - s2) * h * (ms[i + 1] ?? 0)
  )
}

const DIVISIONS_PER_KEY = 160

function buildTrack(points: Vector3[], times: number[]): Track {
  const curve = new CatmullRomCurve3(points, false, 'centripetal')
  curve.arcLengthDivisions = (points.length - 1) * DIVISIONS_PER_KEY
  const table = curve.getLengths(curve.arcLengthDivisions)
  const lengths = points.map((_, i) => table[i * DIVISIONS_PER_KEY] ?? 0)
  return {
    curve,
    times,
    lengths,
    slopes: monotoneSlopes(times, lengths),
    total: table[table.length - 1] ?? 1,
  }
}

function sampleTrack(track: Track, t: number, out: Vector3): Vector3 {
  const s = hermite(track.times, track.lengths, track.slopes, t)
  return track.curve.getPointAt(clamp(s / track.total), out)
}

/** Paramètre de la spline (0 -> 1, par clé) au temps t : pour interpoler le « haut » des clés. */
function trackParam(track: Track, t: number): number {
  const s = hermite(track.times, track.lengths, track.slopes, t)
  return track.curve.getUtoTmapping(clamp(s / track.total), 0)
}

// --- Scalaires (FOV) : Hermite à pentes Catmull-Rom ---

function catmullSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  return xs.map((x, i) => {
    const a = Math.max(0, i - 1)
    const b = Math.min(xs.length - 1, i + 1)
    const dx = (xs[b] ?? x) - (xs[a] ?? x)
    return i === xs.length - 1 || dx <= 0 ? 0 : ((ys[b] ?? 0) - (ys[a] ?? 0)) / dx
  })
}

const KEYS = buildKeys()
const TIMES = KEYS.map((key) => key.at)
const POSITION = buildTrack(
  KEYS.map((key) => key.position),
  TIMES,
)
const LOOK = buildTrack(
  KEYS.map((key) => key.look),
  TIMES,
)
const UP = new CatmullRomCurve3(
  KEYS.map((key) => key.up),
  false,
  'catmullrom',
  0.5,
)
const FOVS = KEYS.map((key) => key.fov)
const FOV_SLOPES = catmullSlopes(TIMES, FOVS)

/** Fin de la trajectoire (s) : arrêt face au B. */
export const PATH_END = BEATS.stop

// --- Plans fixes (reduced-motion) ---

export type Still = { position: V3; target: V3; fov: number }

/** Instants (s du parc) des plans fixes : allée, rail de la géante, grande roue, cartes, le B. */
const STILL_AT = [7.5, 26.5, 38.6, BEATS.cards, BEATS.stop] as const

/** Plans fixes du parc (reduced-motion), pris sur la trajectoire aux instants STILL_AT. */
export function buildStills(): Still[] {
  const toV3 = (p: Vector3): V3 => [p.x, p.y, p.z]
  const at = (t: number): Still => {
    const position = new Vector3()
    const target = new Vector3()
    sampleTrack(POSITION, t, position)
    sampleTrack(LOOK, t, target)
    return { position: toV3(position), target: toV3(target), fov: hermite(TIMES, FOVS, FOV_SLOPES, t) }
  }
  return STILL_AT.map(at)
}

// --- Pose ---

const scratch = {
  a: new Vector3(),
  b: new Vector3(),
  c: new Vector3(),
  forward: new Vector3(),
  ref: new Vector3(),
  up: new Vector3(),
  right: new Vector3(),
  accel: new Vector3(),
  cross: new Vector3(),
}

/** Position sur la trajectoire au temps t (repère local du parc, sans dérive). */
export function pathPoint(t: number, out: Vector3): Vector3 {
  return sampleTrack(POSITION, t, out)
}

/** Point visé au temps t (repère local du parc). */
export function pathLook(t: number, out: Vector3): Vector3 {
  return sampleTrack(LOOK, t, out)
}

/** Demi-fenêtre des différences finies du roulis (s), gain et borne de l'inclinaison. */
const BANK = { h: 0.45, gain: 0.0042, max: 0.42 }

/** Dérive du beat 9 (unités, rad) qui monte en douceur sur 5 s après l'arrêt. */
const DRIFT = { position: 4, look: 2.5, roll: 0.025, rise: 5 }

function drift(t: number, pose: ParkPose) {
  const x = t - PATH_END
  if (x <= 0) return
  const k = clamp(x / DRIFT.rise)
  const ramp = k * k * (3 - 2 * k)
  pose.position.x += ramp * DRIFT.position * Math.sin(x * 0.21)
  pose.position.y += ramp * DRIFT.position * 0.6 * Math.sin(x * 0.17 + 1.3)
  pose.position.z += ramp * DRIFT.position * 0.5 * Math.sin(x * 0.13 + 2.1)
  pose.target.x += ramp * DRIFT.look * Math.sin(x * 0.15 + 0.7)
  pose.target.y += ramp * DRIFT.look * Math.sin(x * 0.11 + 2.6)
  pose.roll += ramp * DRIFT.roll * Math.sin(x * 0.09 + 0.4)
}

/** Roulis : « haut » des clés ramené dans le plan de l'écran, plus l'inclinaison dans les virages. */
function solveRoll(t: number, pose: ParkPose): number {
  const s = scratch
  s.forward.subVectors(pose.target, pose.position).normalize()
  // Haut monde et haut voulu, projetés perpendiculairement au regard
  s.ref.copy(Y).addScaledVector(s.forward, -s.forward.dot(Y)).normalize()
  UP.getPoint(clamp(trackParam(POSITION, t)), s.up)
  s.up.addScaledVector(s.forward, -s.forward.dot(s.up)).normalize()
  s.cross.crossVectors(s.ref, s.up)
  const base = Math.atan2(-s.cross.dot(s.forward), s.ref.dot(s.up))
  // Accélération latérale (différences finies centrées, fenêtre BANK.h)
  const h = BANK.h
  sampleTrack(POSITION, t - h, s.a)
  sampleTrack(POSITION, t, s.b)
  sampleTrack(POSITION, t + h, s.c)
  s.accel.copy(s.a).add(s.c).addScaledVector(s.b, -2).divideScalar(h * h)
  s.right.crossVectors(s.forward, s.up).normalize()
  const bank = clamp(-BANK.gain * s.accel.dot(s.right), -BANK.max, BANK.max)
  return base + bank
}

/** Plan fixe affiché au temps t en reduced-motion (chacun dure STILL_TIME, le dernier reste). */
export function stillIndex(t: number): number {
  return clamp(Math.floor(Math.max(0, t) / STILL_TIME), 0, STILL_AT.length - 1)
}

/**
 * Temps de la scène (s du parc) pour poser les objets : en reduced-motion, l'instant du plan fixe
 * courant (objets figés tels qu'ils sont à ce moment du vol), sinon le temps lui-même.
 */
export function sceneTime(t: number, reduced: boolean): number {
  return reduced ? (STILL_AT[stillIndex(t)] ?? 0) : t
}

/**
 * Pose de la caméra du parc au temps t (s depuis le début du beat 8 ; au-delà de PATH_END, dérive du
 * beat 9). En reduced-motion : plan fixe (parkStills) selon t, sans aucun mouvement.
 */
export function parkCamera(t: number, out: ParkPose, reduced = false): void {
  if (reduced) {
    const shot = STILLS[stillIndex(t)]
    if (shot) {
      out.position.set(...shot.position).add(ORIGIN)
      out.target.set(...shot.target).add(ORIGIN)
      out.fov = shot.fov
    }
    out.roll = 0
    return
  }
  const time = Math.max(0, t)
  sampleTrack(POSITION, time, out.position)
  sampleTrack(LOOK, time, out.target)
  out.fov = hermite(TIMES, FOVS, FOV_SLOPES, time)
  out.roll = solveRoll(time, out)
  drift(time, out)
  out.position.add(ORIGIN)
  out.target.add(ORIGIN)
}

const STILLS = buildStills()

/** Applique une pose du parc à la caméra (position, regard, roulis, FOV). */
export function applyParkPose(camera: PerspectiveCamera, pose: ParkPose): void {
  camera.position.copy(pose.position)
  camera.up.copy(Y)
  camera.lookAt(pose.target)
  if (pose.roll !== 0) camera.rotateZ(pose.roll)
  if (Math.abs(camera.fov - pose.fov) > 0.01) {
    camera.fov = pose.fov
    camera.updateProjectionMatrix()
  }
}
