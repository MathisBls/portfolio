// Formes d'ambiance (AmbientShapes.tsx) : placement pur, sans three, testé (src/lib/ambient.test.ts).
// Pas de storyboard dédié : demande de Mathis (« que d'autres formes géométriques continuent de
// descendre, que ça s'anime tout le temps »). Tout est déterministe (graine fixe) : même rendu à
// chaque visite, aucun saut au remontage.
import { lerp } from '../../lib/math'

export type ShapeKind = 'prism' | 'tetra' | 'octa' | 'ico'

export type AmbientShape = {
  kind: ShapeKind
  /** Rayon englobant en unités monde (0.15 à 0.6). */
  size: number
  /** Profondeur monde, derrière les objets des projets (z = 0). */
  z: number
  /** Côté de l'écran : −1 gauche, 1 droite. */
  side: -1 | 1
  /** |x| en fraction de la demi-largeur visible à cette profondeur (0.35 à 1). */
  xFrac: number
  /** Position de départ dans la colonne (0 = bas, 1 = haut). */
  yFrac: number
  /** Facteur de parallaxe : 0.9 au plus proche, 0.3 au plus lointain. */
  parallax: number
  /** Rotation continue (rad/s, signée) sur X et Y, et rotation de départ. */
  spinX: number
  spinY: number
  rotX: number
  rotY: number
  rotZ: number
  /** Dérive sinusoïdale : amplitude (unités monde), pulsation (rad/s), phase. */
  driftAmp: number
  driftFreq: number
  driftPhase: number
  /** Palier d'opacité selon la profondeur : 0 lointain, 2 proche. */
  tier: 0 | 1 | 2
  /** Index dans SPECTRUM si l'arête est teintée, sinon null. */
  tint: number | null
}

export const AMBIENT = {
  count: { desktop: 10, mobile: 5 },
  seed: 0x5eed,
  size: [0.15, 0.6],
  z: [-9, -2],
  xFrac: [0.35, 1],
  parallax: [0.3, 0.9],
  spin: [0.05, 0.25],
  /** Hauteur de la colonne de bouclage, en hauteurs d'écran. */
  columnScreens: 2,
  /** Fondu d'apparition sur le progress 'hero'. */
  fadeIn: [0.85, 1],
  /** Fov vertical de la caméra (Scene.tsx). */
  fov: 35,
} as const

/** Couleurs du spectre (--spectrum, tokens.css), rouge -> violet. */
export const SPECTRUM = [
  '#ff3b3b',
  '#ff9f1a',
  '#ffe14d',
  '#4cff6a',
  '#2aa7ff',
  '#6a4cff',
  '#b44cff',
] as const

/** Teintes des arêtes colorées, dans l'ordre (bleu, violet, orange) : 2 sur mobile, 3 sur desktop. */
const TINTS = [4, 6, 1] as const
/** Formes teintées (index dans la colonne) : réparties en hauteur, des deux côtés (index pair = gauche). */
const TINT_SLOTS = { desktop: [1, 4, 7], mobile: [1, 2] } as const

const KINDS: readonly ShapeKind[] = ['prism', 'tetra', 'octa', 'ico']

/** Type de la forme i : décalé d'un cran toutes les 2 formes pour mélanger les types des deux côtés. */
const kindAt = (i: number): ShapeKind => KINDS[(i + Math.floor(i / 2)) % KINDS.length] ?? 'prism'

/** Générateur pseudo-aléatoire déterministe (mulberry32), valeurs dans [0, 1). */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Plus la forme est proche (z grand), plus elle défile vite. */
export function parallaxFor(z: number): number {
  const [far, near] = AMBIENT.z
  const k = (z - far) / (near - far)
  return lerp(AMBIENT.parallax[0], AMBIENT.parallax[1], Math.min(1, Math.max(0, k)))
}

/** Demi-hauteur visible à `distance` de la caméra pour un fov vertical en degrés. */
export function visibleHalfHeight(distance: number, fovDeg: number = AMBIENT.fov): number {
  return distance * Math.tan((fovDeg * Math.PI) / 360)
}

/** Modulo positif : ramène v dans [0, length). */
export function wrap(v: number, length: number): number {
  return length > 0 ? ((v % length) + length) % length : 0
}

/**
 * Y de la forme relativement au centre de l'écran, dans une colonne de hauteur `column` centrée.
 * `rise` (unités monde, déjà multiplié par la parallaxe) fait monter la forme ; sortie par le haut,
 * elle réapparaît en bas.
 */
export function columnY(yFrac: number, rise: number, column: number): number {
  return wrap(yFrac * column + rise, column) - column / 2
}

/**
 * Répartition : côtés alternés, une strate verticale par forme (pas d'amas), profondeur, taille,
 * rotation et dérive tirées avec la graine. Les formes teintées sont réparties dans la colonne.
 */
export function layoutAmbientShapes(
  count: number,
  seed: number = AMBIENT.seed,
): readonly AmbientShape[] {
  const random = createRandom(seed)
  const between = ([a, b]: readonly [number, number]) => lerp(a, b, random())
  const signed = (range: readonly [number, number]) => between(range) * (random() < 0.5 ? -1 : 1)

  const slots = count >= 8 ? TINT_SLOTS.desktop : TINT_SLOTS.mobile
  const tintSlots = new Map<number, number>()
  slots.forEach((slot, k) => {
    const tint = TINTS[k]
    if (tint !== undefined && slot < count) tintSlots.set(slot, tint)
  })

  const shapes: AmbientShape[] = []
  for (let i = 0; i < count; i++) {
    const z = between(AMBIENT.z)
    const depth = (z - AMBIENT.z[0]) / (AMBIENT.z[1] - AMBIENT.z[0])
    shapes.push({
      kind: kindAt(i),
      size: between(AMBIENT.size),
      z,
      side: i % 2 === 0 ? -1 : 1,
      xFrac: between(AMBIENT.xFrac),
      yFrac: (i + 0.15 + 0.7 * random()) / count,
      parallax: parallaxFor(z),
      spinX: signed(AMBIENT.spin),
      spinY: signed(AMBIENT.spin),
      rotX: random() * Math.PI * 2,
      rotY: random() * Math.PI * 2,
      rotZ: random() * Math.PI * 2,
      driftAmp: between([0.05, 0.15]),
      driftFreq: between([0.35, 0.75]),
      driftPhase: random() * Math.PI * 2,
      tier: depth < 1 / 3 ? 0 : depth < 2 / 3 ? 1 : 2,
      tint: tintSlots.get(i) ?? null,
    })
  }
  return shapes
}
