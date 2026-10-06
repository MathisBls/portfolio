// Easter egg : valeurs animées de la séquence, mutables et hors React. La timeline GSAP (timeline.ts)
// les écrit, les composants de EasterScene les lisent dans useFrame (jamais de setState par frame).
// Un seul jeu de valeurs : une partie à la fois. resetEaster() repart de l'état initial.

/** Plans : 0 prisme dans le ciel, 1 arène et cartes, 2 vol le long du B géant, 3 B entier (final). */
export const SHOT = { sky: 0, arena: 1, flight: 2, finale: 3 } as const

/** Une carte : distribution (vol depuis le deck), retournement, fondu (reduced-motion), halo. */
export type CardState = { deal: number; flip: number; alpha: number; glow: number }

export type EasterState = {
  /** Secondes depuis le début de la séquence. */
  t: number
  shot: number
  reduced: boolean
  /** Postprocessing actif (desktop hors reduced-motion) : sans lui, émissifs et lumières adoucis. */
  bloom: boolean
  /** Noir plein écran (0 transparent, 1 noir). */
  fade: number
  /** Prisme : tremblement avant l'éclatement, éclatement (0 -> 1), éclair. */
  tremble: number
  shatter: number
  flash: number
  /** Arène : allumage progressif des bougies et des cristaux. */
  arena: number
  cards: [CardState, CardState, CardState]
  /** Légendaire : charge avant le retournement, ornements (couronne, cornes), éclat d'or. */
  charge: number
  crown: number
  burst: number
  /** Légendaire levée, retournée (dos et B face caméra). */
  lift: number
  turn: number
  /** Caméra : rapprochement du dos de la carte, plongée vers le B. */
  approach: number
  dive: number
  /** Vol le long du B géant (abscisse curviligne 0 -> 1), vitesse, épaisseur du B, virage au rouge. */
  flight: number
  speed: number
  extrude: number
  red: number
  /** Final : halo rouge, impact (secousse unique), temps de la rotation lente (avancé par frame). */
  halo: number
  impact: number
  spin: number
  /** Intensité du son de tension (tension.ts). */
  intensity: number
}

const card = (): CardState => ({ deal: 0, flip: 0, alpha: 1, glow: 0 })

function initial(reduced: boolean, bloom: boolean): EasterState {
  return {
    t: 0,
    shot: reduced ? SHOT.arena : SHOT.sky,
    reduced,
    bloom,
    fade: reduced ? 1 : 0,
    tremble: 0,
    shatter: 0,
    flash: 0,
    arena: reduced ? 1 : 0,
    cards: [card(), card(), card()],
    charge: 0,
    crown: 0,
    burst: 0,
    lift: 0,
    turn: 0,
    approach: 0,
    dive: 0,
    flight: 0,
    speed: 0,
    extrude: 0,
    red: 0,
    halo: 0,
    impact: 0,
    spin: 0,
    intensity: 0,
  }
}

export const E: EasterState = initial(false, true)

export function resetEaster(reduced: boolean, bloom: boolean): void {
  Object.assign(E, initial(reduced, bloom))
}
