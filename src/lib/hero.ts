// Storyboard du hero (docs/storyboards/hero.md) : fenêtres du progress 'hero' (0 -> 1, pin 200 %).
// Source de vérité unique : la timeline GSAP du DOM et les objets 3D lisent ces mêmes fenêtres.
import { range } from './math'

export const HERO = {
  /** Longueur du pin (ScrollTrigger end) */
  pinEnd: '+=200%',
  /** Pitch, CTA et indice de scroll s'effacent */
  intro: [0, 0.12],
  /** Le faisceau blanc entre depuis la gauche */
  beam: [0.1, 0.28],
  /** Les 7 rayons s'allument un par un (Spec0 rouge -> Spec6 violet) */
  rays: [0.25, 0.55],
  /** Durée d'allumage d'un rayon */
  rayDuration: 0.1,
  /** Rôle et badge s'effacent */
  role: [0.4, 0.5],
  /** Les mots du titre se dissolvent, un par un */
  words: [0.45, 0.75],
  /** Quart de tour du groupe sur Z, tilt ramené à 0 */
  turn: [0.55, 0.85],
  /** Les rayons s'allongent et l'éventail s'ouvre vers le bas */
  spread: [0.8, 1],
} as const

export const RAY_COUNT = 7

/** Rayons à l'état final : longueur ×1.8, éventail ±40° (au lieu de ±18°). */
export const SPREAD = { length: 1.8, angle: 40 / 18 } as const

type Window = readonly [number, number]
const inWindow = (p: number, [a, b]: Window) => range(p, a, b)

export const introT = (p: number) => inWindow(p, HERO.intro)
export const beamT = (p: number) => inWindow(p, HERO.beam)
export const roleT = (p: number) => inWindow(p, HERO.role)
export const turnT = (p: number) => inWindow(p, HERO.turn)
export const spreadT = (p: number) => inWindow(p, HERO.spread)

/** Fenêtre d'allumage du rayon i (0..6), étalées sur HERO.rays. */
export function rayWindow(i: number): [number, number] {
  const [a, b] = HERO.rays
  const step = (b - a - HERO.rayDuration) / (RAY_COUNT - 1)
  const start = a + i * step
  return [start, start + HERO.rayDuration]
}

export const rayT = (p: number, i: number) => inWindow(p, rayWindow(i))

/** Fenêtre de dissolution du mot i sur n : chevauchement léger entre deux mots. */
export function wordWindow(i: number, n: number): [number, number] {
  const [a, b] = HERO.words
  const slot = (b - a) / n
  const start = a + i * slot * 0.8
  return [start, Math.min(b, start + slot * 1.2)]
}

export const wordT = (p: number, i: number, n: number) => inWindow(p, wordWindow(i, n))

/**
 * Captions du hero (docs/storyboards/story-v2.md) : une phrase par étape (faisceau, rayons, quart de
 * tour). Chaque caption monte sur CAPTION_FADE au début de sa fenêtre et s'efface sur CAPTION_FADE à la
 * fin. La dernière reste jusqu'à la fin du pin pour passer le relais aux projets.
 */
export const CAPTIONS: readonly (readonly [number, number])[] = [
  [0.1, 0.3],
  [0.3, 0.55],
  [0.55, 0.98],
]

export const CAPTION_FADE = 0.04

/** Opacité (0..1) de la caption i au progress p. */
export function captionOpacity(p: number, i: number): number {
  const w = CAPTIONS[i]
  if (!w) return 0
  const [a, b] = w
  return Math.min(range(p, a, a + CAPTION_FADE), 1 - range(p, b - CAPTION_FADE, b))
}
