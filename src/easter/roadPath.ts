// Easter egg, beat 5 (retour de Mathis : « on file tout droit sur une route à la vitesse de la lumière »,
// les projets en bord de route) : profil de vitesse et placement des repères, en calcul pur (testé,
// roadPath.test.ts). La caméra reste fixe ; c'est la route qui défile (distance parcourue `travelled`).
// - Vitesse v(p) = start + cruise·p + warp·p^10, p = avancement 0 -> 1 sur la durée de la route :
//   on lit les projets à vitesse de croisière, puis tout s'emballe dans les deux dernières secondes.
// - Un repère croise la caméra quand la distance parcourue atteint la sienne.
import { T } from './times'

export const ROAD_TIME = T.climax - T.road
const V = { start: 16, cruise: 60, warp: 440 }

/** Vitesse (unités/s) à l'avancement p. */
export function roadSpeed(p: number): number {
  return V.start + V.cruise * p + V.warp * Math.pow(p, 10)
}

/** Distance parcourue (unités) à l'avancement p : intégrale de roadSpeed sur la durée. */
export function roadDistance(p: number): number {
  return ROAD_TIME * (V.start * p + (V.cruise * p * p) / 2 + (V.warp * Math.pow(p, 11)) / 11)
}

export const ROAD_LENGTH = roadDistance(1)

/** Ease GSAP de la distance (0 -> 1). */
export const distanceEase = (p: number): number => roadDistance(p) / ROAD_LENGTH

/** Ease GSAP de l'intensité de vitesse (traînées, FOV, tremblement) : 0 au départ, 1 au bout. */
export const speedEase = (p: number): number => (roadSpeed(p) - V.start) / (roadSpeed(1) - V.start)

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

/** Projets en bord de route, alternés gauche et droite, la convoi Wegir en premier. */
export const LANDMARKS: readonly Landmark[] = [
  { id: 'wegir', side: -1, pass: 2.7, x: 16, y: 4, scale: 5.6, yaw: 0.5, tilt: 1.05 },
  { id: 'zephyr', side: 1, pass: 4, x: 15.5, y: 6.5, scale: 5.4, yaw: -0.5, tilt: 0 },
  { id: 'fitness', side: -1, pass: 5.2, x: 14.5, y: 6.2, scale: 5.6, yaw: 0.45, tilt: 0 },
  { id: 'gamefactory', side: 1, pass: 6.3, x: 17, y: 0, scale: 5, yaw: -0.45, tilt: 0 },
  { id: 'pizza', side: -1, pass: 7.3, x: 15.5, y: 4, scale: 6.5, yaw: 0.55, tilt: 1 },
]

/** Reduced-motion : route immobile, repères rapprochés pour être tous visibles d'un seul plan. */
const STILL = { first: 34, spacing: 26 }

/** Distance du repère i sur la route. */
export function landmarkDistance(i: number, reduced: boolean): number {
  const mark = LANDMARKS[i]
  if (!mark) return 0
  return reduced ? STILL.first + STILL.spacing * i : roadDistance(mark.pass / ROAD_TIME)
}

/** z monde d'un repère : égal à CAMERA_Z quand la distance parcourue atteint la sienne. */
export function landmarkZ(distance: number, travelled: number): number {
  return CAMERA_Z - (distance - travelled)
}
