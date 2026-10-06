// docs/storyboards/story-v2.md, beat « Contact (envoi réussi) : le faisceau blanc entre dans le prisme
// et le spectre jaillit (≈ 2 s), puis se pose : la boucle est bouclée ». Reduced-motion : « Contact
// sans rafale (état "spectre posé" directement après l'envoi) » : elapsed = Infinity.
// Fonctions pures du temps écoulé depuis l'envoi (s), testées (burst.test.ts). Avant l'envoi : −1.
import { RAY_COUNT } from './hero'
import { easeInOut, lerp, range } from './math'

export const BURST = {
  duration: 2,
  /** Le faisceau entre depuis la gauche ; la lumière interne s'allume quand il touche le verre. */
  beam: [0, 0.4],
  inner: [0.32, 0.46],
  /** Les rayons jaillissent l'un après l'autre, très vite (rouge -> violet). */
  rays: { start: 0.4, step: 0.035, grow: 0.3 },
  /** De l'éventail large au calme. Ouverture : × l'angle du GLB (±18°) ; longueur : × celle du GLB. */
  settle: [0.8, 2],
  wide: { opening: 3, length: 2.4 },
  calm: { opening: 1.6, length: 1.6 },
  /** Surcroît d'intensité au jaillissement (× le pic), éteint quand l'éventail se pose. */
  flash: 1.2,
  /** Faisceau posé : intensité gardée (× le pic), pour ne pas éblouir le texte qu'il longe. */
  beamRest: 0.5,
} as const

export type Fan = { opening: number; length: number; flash: number }

/** Faisceau blanc (0 éteint, 1 entré). */
export const burstBeam = (elapsed: number) => easeInOut(range(elapsed, ...BURST.beam))

/** Intensité du faisceau (× son pic) : pleine pendant le jaillissement, posée ensuite. */
export const burstBeamLevel = (elapsed: number) =>
  lerp(1, BURST.beamRest, easeInOut(range(elapsed, ...BURST.settle)))

/** Lumière interne du prisme, du faisceau à la face de sortie. */
export const burstInner = (elapsed: number) => range(elapsed, ...BURST.inner)

/** Croissance du rayon i (0..RAY_COUNT − 1). */
export function burstRay(elapsed: number, i: number): number {
  const start = BURST.rays.start + i * BURST.rays.step
  return range(elapsed, start, start + BURST.rays.grow)
}

/** Fin du jaillissement du dernier rayon. */
export const BURST_RAYS_END = BURST.rays.start + (RAY_COUNT - 1) * BURST.rays.step + BURST.rays.grow

/** Éventail à l'instant `elapsed`, écrit dans `out` (aucune allocation). */
export function burstFan(elapsed: number, out: Fan): Fan {
  const settle = easeInOut(range(elapsed, ...BURST.settle))
  out.opening = lerp(BURST.wide.opening, BURST.calm.opening, settle)
  out.length = lerp(BURST.wide.length, BURST.calm.length, settle)
  out.flash = elapsed >= BURST.rays.start ? BURST.flash * (1 - settle) : 0
  return out
}
