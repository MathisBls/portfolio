// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7) : pose de la caméra
// du second niveau, en calcul pur (testé, camera.test.ts), sans allocation par frame. Le cockpit de
// l'Explorer reste autour d'elle (space/Cockpit.tsx). Repère : layout.ts (mètres, montagne à l'origine).
// - Beat 1 : piqué depuis 7 km d'altitude, à travers la couche de nuages.
// - Beat 2 : ressource au ras de la plaine, vol bas (≈ 25 m) vers le futur emplacement de la montagne,
//   légers lacets.
// - Beat 3 : le vaisseau ralentit et se pose en vol stationnaire (FLIGHT.hold), regard vers −Z.
// - Beat 4 : la montagne sort devant nous ; recul en arc vers son flanc droit et montée pour garder le
//   cadre (FLIGHT.retreat) : le B de face, puis la silhouette en contre-jour.
// - Beat 5 : descente vers le chœur et orbite au ras des colosses (sens horaire), la montagne derrière
//   eux, jusqu'à revenir face au B.
// - Beat 6 : montée face au sommet qui s'ouvre (les coques s'écartent de part et d'autre, le spectre du
//   prisme s'ouvre en éventail face à +Z), le B allumé en dessous.
// - Beat 7 : recul et montée finale, la montagne sous l'aurore, puis le noir.
// Trajectoire : spline Catmull-Rom (centripète) à travers des clés datées, reparamétrée par l'abscisse
// curviligne ; l'abscisse en fonction du temps est une Hermite monotone (Fritsch-Carlson, park/camera.ts)
// : vitesse continue aux clés, aucun retour en arrière. Même chose pour le point visé ; FOV et roulis en
// Hermite à pentes Catmull-Rom. Reduced-motion : plans fixes (STILLS) pris sur cette trajectoire.
import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, lerp } from '../../lib/math'
import { hermite, monotoneSlopes } from '../park/camera'
import { CHOIR, CLOUDS, FLIGHT, MOUNTAIN, SUMMIT, type V3 } from './layout'
import { MT, beatDurations } from './times'

export type MajesticPose = {
  position: Vector3
  target: Vector3
  /** FOV vertical (degrés) pour un écran paysage (élargi en portrait par EasterCamera). */
  fov: number
  /** Roulis (rad) appliqué après lookAt avec up = +Y. */
  roll: number
}

export function createMajesticPose(): MajesticPose {
  return { position: new Vector3(), target: new Vector3(), fov: 60, roll: 0 }
}

type Key = { at: number; position: V3; look: V3; fov: number; roll: number }

/** Visage d'un colosse du chœur à l'angle `angle` (rad, comme choirAngle), un peu sous sa lueur. */
function colossus(angle: number): V3 {
  return orbit(angle, CHOIR.radius, CHOIR.glowHeight - 14)
}

/** Point d'une orbite autour de la montagne : angle depuis +Z (rad), rayon et altitude (m). */
function orbit(angle: number, radius: number, y: number): V3 {
  const [x, , z] = MOUNTAIN.position
  return [x + Math.sin(angle) * radius, y, z + Math.cos(angle) * radius]
}

function buildKeys(): Key[] {
  const d = beatDurations()
  const keys: Key[] = []
  const add = (at: number, position: V3, look: V3, fov: number, roll = 0) => {
    keys.push({ at, position, look, fov, roll })
  }
  const midCloud = (CLOUDS.base + CLOUDS.top) / 2
  const [hx, hy, hz] = FLIGHT.hold
  const [pFrom, pTo] = FLIGHT.plain
  const top = SUMMIT.focus
  // 1. Piqué : du haut de l'atmosphère, à travers les nuages, ressource au-dessus de la plaine
  add(MT.entry, FLIGHT.entry, [0, 0, 9000], 66)
  add(MT.entry + 0.45 * d.entry, [0, midCloud, 13200], [0, 0, 6500], 67, 0.02)
  add(MT.entry + 0.8 * d.entry, [-40, 700, pFrom + 1600], [0, 150, 3800], 64, -0.03)
  // 2. Vol au ras de la plaine, légers lacets, vers le futur emplacement de la montagne
  add(MT.plain, [-20, 64, pFrom], [0, 40, 0], 63, 0.02)
  add(
    MT.plain + 0.35 * d.plain,
    [-90, FLIGHT.low + 4, lerp(pFrom, pTo, 0.42)],
    [-30, 34, 0],
    62,
    0.05,
  )
  add(
    MT.plain + 0.72 * d.plain,
    [70, FLIGHT.low - 3, lerp(pFrom, pTo, 0.8)],
    [10, 44, 0],
    61,
    -0.04,
  )
  // 3. Le séisme : le vaisseau ralentit et se pose en vol stationnaire face au futur emplacement
  add(MT.quake, [20, FLIGHT.low + 2, pTo], [0, 58, 0], 60)
  add(MT.quake + 0.55 * d.quake, [hx + 6, hy, hz + 60], [0, 74, 0], 60)
  add(MT.mountain, [hx, hy + 4, hz], [0, 110, 0], 60)
  // 4. La montagne sort devant nous : recul en arc vers son flanc droit, montée pour garder le cadre
  // Caméra basse, regard levé : la montagne domine le cadre
  add(MT.mountain + 0.35 * d.mountain, orbit(0.25, 1950, 75), [0, 520, 0], 63)
  add(MT.mountain + 0.7 * d.mountain, orbit(0.85, 2350, 180), [0, 620, 0], 62)
  add(MT.choir, FLIGHT.retreat, [0, 560, 0], 60)
  // 5. Le chœur : descente vers les colosses (sens horaire). Le regard suit la statue qu'on frôle, son
  // visage et ses mains allumés, la montagne derrière elle ; puis il revient au sommet, face au B
  const near = colossus(Math.PI / 4)
  add(MT.choir + 0.22 * d.choir, orbit(1.33, 1900, 110), colossus(1.31), 59, -0.03)
  add(MT.choir + 0.45 * d.choir, orbit(1.0, 1560, 56), near, 58, -0.05)
  add(MT.choir + 0.6 * d.choir, orbit(0.8, 1490, 48), near, 57, -0.04)
  add(MT.choir + 0.78 * d.choir, orbit(0.58, 1600, 90), [0, 430, 0], 57, -0.04)
  add(MT.prism, orbit(0.25, 1850, 160), [0, 560, 0], 57, -0.02)
  // 6. Le prisme : montée face au sommet qui s'ouvre, le B allumé en dessous, le spectre au-dessus
  add(MT.prism + 0.45 * d.prism, orbit(0.12, 2250, 760), [0, top[1] - 100, 0], 58)
  add(MT.exit, orbit(0.06, 2700, 1150), [0, top[1] + 150, 0], 60)
  // 7. Sortie : recul et montée, la montagne sous l'aurore, puis le noir
  add(MT.exit + 0.55 * d.exit, orbit(0.03, 3700, 1500), [0, 1200, 0], 62)
  add(MT.end, orbit(0, 4800, 1950), [0, 1400, 0], 63)
  return keys
}

// --- Spline datée : abscisse curviligne en fonction du temps ---

type Track = {
  curve: CatmullRomCurve3
  times: number[]
  lengths: number[]
  slopes: number[]
  total: number
}

const DIVISIONS_PER_KEY = 200

function buildTrack(points: Vector3[], times: number[]): Track {
  const curve = new CatmullRomCurve3(points, false, 'centripetal')
  curve.arcLengthDivisions = (points.length - 1) * DIVISIONS_PER_KEY
  const table = curve.getLengths(curve.arcLengthDivisions)
  const lengths = points.map((_, i) => table[i * DIVISIONS_PER_KEY] ?? 0)
  return { curve, times, lengths, slopes: monotoneSlopes(times, lengths), total: table.at(-1) ?? 1 }
}

function sampleTrack(track: Track, t: number, out: Vector3): Vector3 {
  const s = hermite(track.times, track.lengths, track.slopes, t)
  return track.curve.getPointAt(clamp(s / Math.max(track.total, 1e-6)), out)
}

function catmullSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  return xs.map((x, i) => {
    const a = Math.max(0, i - 1)
    const b = Math.min(xs.length - 1, i + 1)
    const dx = (xs[b] ?? x) - (xs[a] ?? x)
    return i === 0 || i === xs.length - 1 || dx <= 0 ? 0 : ((ys[b] ?? 0) - (ys[a] ?? 0)) / dx
  })
}

const KEYS = buildKeys()
const TIMES = KEYS.map((key) => key.at)
const POSITION = buildTrack(
  KEYS.map((key) => new Vector3(...key.position)),
  TIMES,
)
const LOOK = buildTrack(
  KEYS.map((key) => new Vector3(...key.look)),
  TIMES,
)
const FOVS = KEYS.map((key) => key.fov)
const FOV_SLOPES = catmullSlopes(TIMES, FOVS)
const ROLLS = KEYS.map((key) => key.roll)
const ROLL_SLOPES = catmullSlopes(TIMES, ROLLS)

/** Premier et dernier instant de la trajectoire (s du second niveau). */
export const PATH_START = TIMES[0] ?? 0
export const PATH_END = TIMES.at(-1) ?? 0

/**
 * Plancher doux du vol (m) : la ressource du piqué ne passe jamais sous FLOOR. Softplus de largeur
 * FLOOR_SOFT : continu et dérivable, sans effet au-dessus de quelques dizaines de mètres.
 */
const FLOOR = 14
const FLOOR_SOFT = 7

export function softFloor(y: number): number {
  const x = (y - FLOOR) / FLOOR_SOFT
  return FLOOR + FLOOR_SOFT * (x > 30 ? x : Math.log1p(Math.exp(x)))
}

/** Pose sur la trajectoire (sans tremblement ni plan fixe). */
export function pathPose(t: number, out: MajesticPose): MajesticPose {
  const time = clamp(t, PATH_START, PATH_END)
  sampleTrack(POSITION, time, out.position)
  out.position.y = softFloor(out.position.y)
  sampleTrack(LOOK, time, out.target)
  out.fov = hermite(TIMES, FOVS, FOV_SLOPES, time)
  out.roll = hermite(TIMES, ROLLS, ROLL_SLOPES, time)
  return out
}

// --- Plans fixes (reduced-motion) ---

/**
 * Instants (s du second niveau) des plans fixes : la plaine, la montagne dressée (fin du recul), le
 * chœur, le spectre, la sortie. Chacun est affiché de son repère (STILL_FROM) au suivant.
 */
function stillTimes(): number[] {
  const d = beatDurations()
  return [
    MT.plain + 0.5 * d.plain,
    MT.choir - 0.02,
    MT.choir + 0.8 * d.choir,
    MT.prism + 0.95 * d.prism,
    MT.exit + 0.4 * d.exit,
  ]
}

/** Début d'affichage de chaque plan fixe (plaine dès l'entrée, montagne dès la sortie du sol…). */
export const STILL_FROM: readonly number[] = [MT.entry, MT.mountain, MT.choir, MT.prism, MT.exit]

const STILLS: readonly MajesticPose[] = stillTimes().map((t) => pathPose(t, createMajesticPose()))

/** Index du plan fixe affiché au temps t (reduced-motion). */
export function stillIndex(t: number): number {
  let index = 0
  STILL_FROM.forEach((from, i) => {
    if (t >= from) index = i
  })
  return index
}

/** Pose de la caméra au temps t du second niveau : trajectoire, ou plan fixe en reduced-motion. */
export function majesticCamera(t: number, out: MajesticPose, reduced: boolean): MajesticPose {
  if (!reduced) return pathPose(t, out)
  const still = STILLS[stillIndex(t)]
  if (still) {
    out.position.copy(still.position)
    out.target.copy(still.target)
    out.fov = still.fov
  }
  out.roll = 0
  return out
}

/** Altitude de la caméra au-dessus de la plaine (m), pour le HUD. */
export function altitudeOf(pose: MajesticPose): number {
  return Math.max(0, pose.position.y)
}

/** Amplitudes du tremblement (rad) : plasma de l'entrée, séisme (rampes de M.quake), montée de la
 *  montagne. Plafonné à SHAKE_MAX : doux, jamais de quoi donner la nausée. Rien en reduced-motion. */
export const SHAKE_MAX = 0.0075

export function majesticShake(m: {
  reduced: boolean
  entry: number
  quake: number
  rise: number
}): number {
  if (m.reduced) return 0
  const rising = Math.sin(Math.PI * clamp(m.rise))
  return Math.min(SHAKE_MAX, 0.0028 * m.entry + 0.0052 * m.quake + 0.0016 * rising * m.quake)
}
