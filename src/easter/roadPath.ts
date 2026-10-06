// Easter egg, beat 3 (docs/storyboards/easter-park.md, correctif 2 de Mathis : « route beaucoup plus
// longue, montée plus lente, plus de choses dépassées ») : profil de vitesse et placement des repères, en
// calcul pur (testé, roadPath.test.ts). La caméra reste fixe ; c'est la route qui défile (distance
// parcourue `travelled`).
// - Vitesse v(p) = start + cruise·p² + warp·p^12, p = avancement 0 -> 1 sur les 19 s de la route : on
//   roule lentement en lisant les projets, la vitesse monte tout du long, puis s'emballe sur la fin.
// - Intensité perçue (traînées, FOV, tremblement) : logarithme de la vitesse, pour qu'elle monte dès
//   le début au lieu de rester nulle jusqu'aux deux dernières secondes.
// - Un repère croise la caméra quand la distance parcourue atteint la sienne. Les projets et les arches
//   sont placés par leur instant de passage ; les arches passent toujours à moins de 3 par seconde.
import { ROAD_TIME } from './times'

export { ROAD_TIME }
const V = { start: 12, cruise: 90, warp: 600 }

/** Vitesse (unités/s) à l'avancement p. */
export function roadSpeed(p: number): number {
  return V.start + V.cruise * p * p + V.warp * Math.pow(p, 12)
}

/** Distance parcourue (unités) à l'avancement p : intégrale de roadSpeed sur la durée. */
export function roadDistance(p: number): number {
  return ROAD_TIME * (V.start * p + (V.cruise * p * p * p) / 3 + (V.warp * Math.pow(p, 13)) / 13)
}

export const ROAD_LENGTH = roadDistance(1)

/** Ease GSAP de la distance (0 -> 1). */
export const distanceEase = (p: number): number => roadDistance(p) / ROAD_LENGTH

const LOG_RANGE = Math.log(roadSpeed(1) / V.start)

/** Ease GSAP de l'intensité de vitesse (traînées, FOV, tremblement) : 0 au départ, 1 au bout. */
export const speedEase = (p: number): number => Math.log(roadSpeed(p) / V.start) / LOG_RANGE

/** Distance d'un objet qui croise la caméra `seconds` après le début de la route. */
export const passDistance = (seconds: number): number => roadDistance(seconds / ROAD_TIME)

/** z de la caméra sur la route (elle regarde vers −z). */
export const CAMERA_Z = 6

export type LandmarkId = 'wegir' | 'zephyr' | 'fitness' | 'gamefactory' | 'pizza'

export type Landmark = {
  id: LandmarkId
  /** −1 à gauche, 1 à droite. */
  side: -1 | 1
  /** Passage à hauteur de la caméra, en secondes après le début de la route. */
  pass: number
  /** Distance au bord de l'axe, hauteur, échelle, lacet vers la route, bascule vers la caméra. */
  x: number
  y: number
  scale: number
  yaw: number
  tilt: number
}

/** Projets en bord de route, alternés gauche et droite, le convoi Wegir en premier, un toutes les 2.2 s. */
export const LANDMARKS: readonly Landmark[] = [
  { id: 'wegir', side: -1, pass: 3.2, x: 16, y: 4, scale: 5.6, yaw: 0.5, tilt: 1.05 },
  { id: 'zephyr', side: 1, pass: 5.4, x: 15.5, y: 6.5, scale: 5.4, yaw: -0.5, tilt: 0 },
  { id: 'fitness', side: -1, pass: 7.6, x: 14.5, y: 6.2, scale: 5.6, yaw: 0.45, tilt: 0 },
  { id: 'gamefactory', side: 1, pass: 9.8, x: 17, y: 0, scale: 5, yaw: -0.45, tilt: 0 },
  { id: 'pizza', side: -1, pass: 12, x: 15.5, y: 4, scale: 6.5, yaw: 0.55, tilt: 1 },
]

/** Arches lumineuses au-dessus de la route : passage de la première, intervalle, dernière. */
const ARCH = { first: 1.6, every: 0.95, last: 18.4 }

/** Instants de passage des arches (s depuis le début de la route), hors des passages de projets. */
export const ARCH_PASSES: readonly number[] = (() => {
  const passes: number[] = []
  for (let t = ARCH.first; t <= ARCH.last + 1e-6; t += ARCH.every) {
    const clear = LANDMARKS.every((mark) => Math.abs(mark.pass - t) > 0.3)
    if (clear) passes.push(Math.round(t * 100) / 100)
  }
  return passes
})()

/** Reduced-motion : route immobile, repères rapprochés pour être tous visibles d'un seul plan. */
const STILL = { first: 34, spacing: 26 }

/** Distance du repère i sur la route. */
export function landmarkDistance(i: number, reduced: boolean): number {
  const mark = LANDMARKS[i]
  if (!mark) return 0
  return reduced ? STILL.first + STILL.spacing * i : passDistance(mark.pass)
}

/** z monde d'un repère : égal à CAMERA_Z quand la distance parcourue atteint la sienne. */
export function landmarkZ(distance: number, travelled: number): number {
  return CAMERA_Z - (distance - travelled)
}
