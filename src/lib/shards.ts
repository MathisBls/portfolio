// Mouvement du champ d'éclats (scene/objects/ShardField.tsx), fonctions pures testées (shards.test.ts).
// docs/storyboards/story-v2.md :
// - « Chargement (≈ 1.5 s) : des éclats de verre convergent et s'assemblent en prisme » : INTRO,
//   introFlight, prismRevealAt, fieldFadeAt.
// - « Work : les éclats défilent en parallaxe » : columnY (bouclage vertical autour de la caméra).
// - « Bandeau : les éclats accélèrent légèrement », « Services : les éclats ralentissent », « About :
//   calme » : fieldPace, SCROLL.
// - « Contact (arrivée) : les éclats se rassemblent autour [du prisme] » : CROWN, crownT.
// - Brief motion-3d : éviter le centre de l'écran pendant le hero (prisme, nom) : clearCenter.
import { clamp, easeInOut, range } from './math'

/** Fov vertical de la caméra (Scene.tsx). */
export const SHARD_FOV = 35

/** Demi-hauteur visible à `distance` de la caméra. */
export function visibleHalfHeight(distance: number, fovDeg: number = SHARD_FOV): number {
  return distance * Math.tan((fovDeg * Math.PI) / 360)
}

/** Modulo positif : ramène v dans [0, length). */
export function wrap(v: number, length: number): number {
  return length > 0 ? ((v % length) + length) % length : 0
}

/**
 * Y relatif au centre de la colonne (hauteur `column`). `offset` (unités monde) fait monter l'éclat ;
 * sorti par le haut, il revient par le bas.
 */
export function columnY(yFrac: number, offset: number, column: number): number {
  return wrap(yFrac * column + offset, column) - column / 2
}

/** Zone dégagée, en coordonnées écran normalisées (−1..1) : centre et demi-axes de l'ellipse. */
export type ClearZone = { cx: number; cy: number; rx: number; ry: number }

/**
 * Écarte un point (u, v) du centre de la zone : son rayon elliptique r devient √(r² + strength).
 * strength 1 : le centre part sur le bord, les points lointains bougent à peine (pas d'anneau tassé).
 * `side` (signe) donne la direction d'un point pile au centre. Écrit dans `out`.
 */
export function clearCenter(
  u: number,
  v: number,
  zone: Readonly<ClearZone>,
  strength: number,
  side: number,
  out: { u: number; v: number },
): void {
  if (strength <= 0) {
    out.u = u
    out.v = v
    return
  }
  let du = (u - zone.cx) / zone.rx
  let dv = (v - zone.cy) / zone.ry
  let r = Math.hypot(du, dv)
  if (r < 1e-6) {
    du = side < 0 ? -1e-6 : 1e-6
    dv = 0
    r = 1e-6
  }
  const k = Math.sqrt(r * r + strength) / r
  out.u = zone.cx + du * k * zone.rx
  out.v = zone.cy + dv * k * zone.ry
}

/** Intro d'assemblage, en secondes depuis la première frame rendue. */
export const INTRO = {
  duration: 1.5,
  /** Vol d'un éclat, de sa position dispersée au volume du prisme. */
  travel: 0.9,
  /** Part du vol pendant laquelle l'éclat apparaît. */
  fadeIn: 0.08,
  /** Effacement : commence à 75 % du vol, finit 0.25 s après l'arrivée. */
  fadeOutStart: 0.75,
  fadeOutTail: 0.25,
  /** Le prisme se révèle pendant que les éclats arrivent et s'effacent. */
  reveal: [0.6, 1.5],
  /** Le champ du fond apparaît en même temps. */
  field: [0.2, 1.3],
  /** Au-delà de ce point de la timeline (page rechargée plus bas), pas d'intro. */
  skipAfter: 0.5,
} as const

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** Vol de l'éclat d'intro : avancée k (0 dispersé, 1 dans le prisme) et opacité. Écrit dans `out`. */
export function introFlight(
  elapsed: number,
  delay: number,
  out: { k: number; alpha: number },
): void {
  const local = (elapsed - delay) / INTRO.travel
  out.k = easeInOutCubic(clamp(local))
  const end = delay + INTRO.travel
  out.alpha =
    range(local, 0, INTRO.fadeIn) *
    (1 - range(elapsed, delay + INTRO.travel * INTRO.fadeOutStart, end + INTRO.fadeOutTail))
}

/** Apparition du prisme (0 invisible, 1 entier) pendant l'intro. */
export const prismRevealAt = (elapsed: number) => easeInOut(range(elapsed, ...INTRO.reveal))

/** Apparition du champ du fond pendant l'intro. */
export const fieldFadeAt = (elapsed: number) => easeInOut(range(elapsed, ...INTRO.field))

/** Rassemblement au Contact, sur le progress 'contact'. */
export const CROWN = {
  /** Début du rassemblement, durée pour un éclat, étalement des départs (× delay de l'éclat). */
  from: 0.3,
  span: 0.35,
  stagger: 0.25,
  /** Inclinaison de l'anneau vers la caméra (rad) : 0 serait vu par la tranche. */
  tilt: 0.55,
  /** Rotation lente de la couronne (rad par seconde de « temps du champ »). */
  speed: 0.12,
  /** Les autres éclats s'atténuent pour laisser lire la couronne. */
  dim: 0.5,
} as const

/** Présence de l'éclat dans la couronne (0 dans le champ, 1 sur l'anneau). `delay` dans [0, 1]. */
export function crownT(contact: number, delay: number): number {
  const start = CROWN.from + delay * CROWN.stagger
  return easeInOut(range(contact, start, start + CROWN.span))
}

/** Avancement global du rassemblement (pour atténuer les autres éclats). */
export const crownPresence = (contact: number) => crownT(contact, 0.5)

/**
 * Allure du champ (multiplie le temps de rotation et de flottement) selon la timeline caméra
 * (hero [0, 1], projects [1, 2], services [2, 3], about [3, 4], contact [4, 5]) : 1 jusqu'aux
 * projets, ralentit sur Services, plus calme sur About, couronne lente au Contact.
 */
export function fieldPace(timeline: number): number {
  return (
    1 -
    0.4 * range(timeline, 2.1, 2.5) -
    0.15 * range(timeline, 3.1, 3.5) +
    0.1 * range(timeline, 4, 4.4)
  )
}

/** Défilement : px scrollés -> unités monde (× gain), accélération selon la vitesse du scroll. */
export const SCROLL = {
  gain: 0.45,
  /** Vitesse (px/s) qui donne l'accélération maximale, et cette accélération (× l'allure). */
  speedRef: 2500,
  boost: 1.5,
  /** Lissage de la vitesse (1/s). */
  damping: 4,
} as const

/** Accélération (0..SCROLL.boost) pour une vitesse de scroll lissée en px/s. */
export const scrollBoost = (speed: number) =>
  SCROLL.boost * clamp(Math.abs(speed) / SCROLL.speedRef)
