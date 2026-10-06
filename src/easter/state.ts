// Easter egg v3 (docs/storyboards/easter-park.md) : valeurs animées de la séquence, mutables et hors React.
// La timeline GSAP (timeline.ts) les écrit, les composants de EasterScene les lisent dans useFrame (jamais
// de setState par frame). Un seul jeu de valeurs : une partie à la fois. resetEaster() repart de l'état
// initial. Le parc (beat 8, D2) a son propre état P (park/state.ts).

/**
 * Plans : 0 prisme dans le ciel, 1 arène et cartes, 2 route (projets, message), 3 espace (sortie du warp,
 * Houston, la porte), 4 parc (beats 8 et 9, D2 ; le B géant y est, au bout), 5 le Sanctuaire (second
 * niveau, docs/storyboards/easter-majestic.md : plaine, montagne, chœur, prisme ; majestic/).
 */
export const SHOT = { sky: 0, arena: 1, road: 2, space: 3, park: 4, majestic: 5 } as const

/** Une carte : distribution (vol depuis le deck), retournement, fondu (reduced-motion), halo. */
export type CardState = { deal: number; flip: number; alpha: number; glow: number }

export type EasterState = {
  /** Secondes depuis le début de la séquence. */
  t: number
  shot: number
  reduced: boolean
  /** Postprocessing actif (desktop hors reduced-motion) : sans lui, émissifs et lumières adoucis. */
  bloom: boolean
  /** Fondu plein écran (0 transparent, 1 couvrant) et sa teinte (0 noir, 1 rose du B, 2 blanc rosé). */
  fade: number
  fadeTint: number
  /** Prisme : zoom lent (0 -> 1), tension (lumière qui se resserre, vignette), tremblement du verre,
   *  éclatement (0 -> 1), éclair, secousse (éclatement, puis arrivée du bond devant la porte). */
  zoom: number
  focus: number
  tremble: number
  shatter: number
  flash: number
  kick: number
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
  /** Route : distance parcourue (unités, roadPath.ts), intensité de vitesse 0 -> 1, virage au rouge. */
  road: number
  speed: number
  red: number
  /** Sortie du warp (beat 4) : traînées étirées (0 -> 1 -> 0), route effacée, ciel réaliste, cockpit
   *  allumé (instruments, HUD). */
  stretch: number
  roadDim: number
  sky: number
  cockpit: number
  /** Beat 5 : approche de la forme lointaine (0 très loin -> 1 arrêtée, encore dans l'ombre). */
  shape: number
  /** Beat 6 : lumières de la porte (rampe), bond du vaisseau vers elle. */
  gate: number
  leap: number
  /** Beat 7 : ouverture des portes, lumière derrière elles, avancée à travers la porte (les feux
   *  d'artifice de la bienvenue partent dans le parc, D2). */
  doors: number
  glare: number
  enter: number
  /** Intensité du son de tension (tension.ts) : nappe de la route, puis nappe calme de l'espace. */
  intensity: number
}

const card = (): CardState => ({ deal: 0, flip: 0, alpha: 1, glow: 0 })

function initial(reduced: boolean, bloom: boolean): EasterState {
  return {
    t: 0,
    shot: SHOT.sky,
    reduced,
    bloom,
    fade: 0,
    fadeTint: 0,
    zoom: 0,
    focus: 0,
    tremble: 0,
    shatter: 0,
    flash: 0,
    kick: 0,
    arena: reduced ? 1 : 0,
    cards: [card(), card(), card()],
    charge: 0,
    crown: 0,
    burst: 0,
    lift: 0,
    turn: 0,
    approach: 0,
    dive: 0,
    road: 0,
    speed: 0,
    red: 0,
    stretch: 0,
    roadDim: 0,
    sky: 0,
    cockpit: 0,
    shape: 0,
    gate: 0,
    leap: 0,
    doors: 0,
    glare: 0,
    enter: 0,
    intensity: 0,
  }
}

export const E: EasterState = initial(false, true)

export function resetEaster(reduced: boolean, bloom: boolean): void {
  Object.assign(E, initial(reduced, bloom))
}
