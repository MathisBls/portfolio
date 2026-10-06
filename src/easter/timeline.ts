// Easter egg : timeline GSAP basée sur le temps (pas le scroll), ≈ 34 s. Elle n'écrit que l'état mutable
// E (state.ts) ; les composants le lisent dans useFrame. Repères : times.ts. Deux versions :
// - complète : 1. zoom lent sur le prisme intact, la tension monte (0–5 s), une demi-seconde suspendue,
//   puis il éclate d'un coup vers la caméra (5.5 s) ; 2. l'arène se révèle, la caméra descend du ciel ;
//   3. trois cartes distribuées puis retournées, COMMON, RARE, LEGENDARY ; 4. la légendaire se lève et
//   montre son dos, plongée vers le B, fondu rose ; 5. la route : on file tout droit, les projets
//   défilent en bord de route, le message s'écrit (overlay), vitesse de la lumière, virage au rouge ;
//   6. silence, impact, le B entier ; 7. final.
// - reduced-motion : fondus seulement (prisme fixe, arène, cartes, route immobile et message affiché
//   d'un bloc, puis le B).
// Aucun clignotement : les variations de lumière sont des rampes, l'éclair et l'impact sont uniques.
import { gsap } from '../lib/gsap'
import type { TensionCue } from './audio'
import { ROAD_LENGTH, ROAD_TIME, distanceEase, speedEase } from './roadPath'
import { E, SHOT } from './state'
import { R, T } from './times'

export type Hooks = {
  cue: (name: TensionCue) => void
  /** Silence d'une demi-seconde (avant l'éclatement). */
  hush: () => void
  climax: () => void
  /** Ligne du message affichée (site.easter.lines), −1 pour l'effacer. */
  line: (index: number) => void
  finale: () => void
}

function prelude(tl: gsap.core.Timeline, hooks: Hooks) {
  // 1. Zoom lent, lumière qui se resserre, verre qui vibre de plus en plus ; suspension ; éclatement
  tl.to(E, { zoom: 1, duration: T.hush, ease: 'power1.in' }, T.zoom)
  tl.to(E, { focus: 1, duration: T.hush, ease: 'power1.inOut' }, T.zoom)
  tl.to(E, { tremble: 1, duration: T.hush - 0.4, ease: 'power3.in' }, T.zoom + 0.4)
  tl.call(hooks.hush, [], T.hush)
  tl.to(E, { tremble: 0, duration: 0.12, ease: 'power2.out' }, T.hush)
  tl.call(hooks.cue, ['shatter'], T.shatter)
  tl.set(E, { focus: 0 }, T.shatter)
  tl.to(E, { shatter: 1, duration: 1.6, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 1, duration: 0.05, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 0, duration: 0.8, ease: 'power2.out' }, T.shatter + 0.05)
  tl.to(E, { kick: 1, duration: 0.04, ease: 'none' }, T.shatter)
  tl.to(E, { kick: 0, duration: 0.9, ease: 'power3.out' }, T.shatter + 0.04)
  tl.to(E, { fade: 1, duration: 0.5, ease: 'power1.in' }, T.arena - 0.5)
  // 2. Arène : la caméra descend du ciel (camera.ts, sur E.t), bougies et cristaux s'allument
  tl.set(E, { shot: SHOT.arena }, T.arena)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, T.arena + 0.1)
  tl.to(E, { arena: 1, duration: 4, ease: 'power1.inOut' }, T.arena + 0.3)
}

function cards(tl: gsap.core.Timeline, hooks: Hooks) {
  const [common, rare, legendary] = E.cards
  E.cards.forEach((card, i) => {
    const at = T.deal + i * 0.45
    tl.call(hooks.cue, ['deal'], at)
    tl.to(card, { deal: 1, duration: 0.95, ease: 'power2.out' }, at)
  })
  ;[common, rare].forEach((card, i) => {
    const at = T.flips[i] ?? 0
    tl.call(hooks.cue, ['flip'], at)
    tl.to(card, { flip: 1, duration: 0.8, ease: 'power2.inOut' }, at)
    tl.to(card, { glow: 1, duration: 0.35, ease: 'power2.out' }, at + 0.55)
    tl.to(card, { glow: 0.3, duration: 1.2, ease: 'power1.inOut' }, at + 0.9)
  })
  tl.to(E, { charge: 1, duration: 0.7, ease: 'power2.in' }, T.charge)
  tl.to(legendary, { flip: 1, duration: 1.1, ease: 'power3.inOut' }, T.legendary)
  tl.call(hooks.cue, ['legendary'], T.legendary + 0.75)
  tl.to(E, { charge: 0, duration: 0.4, ease: 'power1.out' }, T.legendary + 0.7)
  tl.to(E, { burst: 1, duration: 0.25, ease: 'power2.out' }, T.legendary + 0.75)
  tl.to(E, { burst: 0.35, duration: 1.4, ease: 'power2.inOut' }, T.legendary + 1)
  tl.to(legendary, { glow: 1, duration: 0.4, ease: 'power2.out' }, T.legendary + 0.75)
  tl.to(E, { crown: 1, duration: 1, ease: 'none' }, T.legendary + 0.8)
  // 4. La légendaire se lève et se retourne, la caméra s'approche du B puis plonge ; fondu rose
  tl.to(E, { lift: 1, duration: 1.2, ease: 'power2.inOut' }, T.lift)
  tl.to(E, { turn: 1, duration: 1, ease: 'power2.inOut' }, T.turn)
  tl.to(E, { approach: 1, duration: 1.3, ease: 'power2.inOut' }, T.approach)
  tl.to(E, { dive: 1, duration: T.road - T.dive, ease: 'power3.in' }, T.dive)
  tl.set(E, { fadeTint: 1 }, T.road - 0.35)
  tl.to(E, { fade: 1, duration: 0.3, ease: 'power1.in' }, T.road - 0.35)
}

function road(tl: gsap.core.Timeline, hooks: Hooks) {
  // 5. La route : distance et vitesse suivent roadPath.ts ; projets en bord de route ; message
  tl.set(E, { shot: SHOT.road }, T.road)
  tl.call(hooks.cue, ['swap'], T.road)
  tl.to(E, { fade: 0, duration: 0.8, ease: 'power1.out' }, T.road + 0.05)
  tl.set(E, { fadeTint: 0 }, T.road + 0.9)
  tl.to(E, { road: ROAD_LENGTH, duration: ROAD_TIME, ease: distanceEase }, T.road)
  tl.to(E, { speed: 1, duration: ROAD_TIME, ease: speedEase }, T.road)
  tl.to(E, { red: 1, duration: 8, ease: 'power1.in' }, T.road + 1.2)
  T.lines.forEach((at, i) => {
    tl.call(hooks.line, [i], at)
  })
  // 6. Climax : le message s'efface, noir et silence (0.5 s), impact, le B entier dans son halo
  tl.call(hooks.line, [-1], T.climax)
  tl.call(hooks.climax, [], T.climax)
  tl.to(E, { fade: 1, duration: 0.15, ease: 'power1.in' }, T.climax)
  tl.set(E, { shot: SHOT.finale, speed: 0 }, T.impact)
  tl.to(E, { fade: 0, duration: 1, ease: 'power2.out' }, T.impact)
  tl.to(E, { halo: 1, duration: 1.8, ease: 'expo.out' }, T.impact)
  tl.to(E, { impact: 1, duration: 0.04, ease: 'none' }, T.impact)
  tl.to(E, { impact: 0, duration: 1.4, ease: 'power3.out' }, T.impact + 0.04)
}

function full(tl: gsap.core.Timeline, hooks: Hooks) {
  prelude(tl, hooks)
  cards(tl, hooks)
  road(tl, hooks)
  // Son : la tension monte pendant le zoom, retombe un peu dans l'arène, puis jusqu'au bout
  tl.to(E, { intensity: 0.55, duration: T.hush, ease: 'power1.in' }, T.zoom)
  tl.to(E, { intensity: 0.25, duration: 1.5, ease: 'power1.out' }, T.arena)
  tl.to(E, { intensity: 0.5, duration: 6, ease: 'none' }, T.deal)
  tl.to(E, { intensity: 1, duration: ROAD_TIME, ease: 'power1.in' }, T.road)
  tl.call(hooks.finale, [], T.finale)
  tl.to(E, { t: T.finale, duration: T.finale, ease: 'none' }, 0)
}

function reduced(tl: gsap.core.Timeline, hooks: Hooks) {
  // Cartes déjà posées, face visible, mais transparentes : elles apparaissent en fondu
  E.cards.forEach((card) => {
    card.deal = 1
    card.flip = 1
    card.alpha = 0
  })
  E.crown = 1
  // Prisme fixe, fondu enchaîné court vers l'arène
  tl.to(E, { fade: 1, duration: R.arena - R.sky, ease: 'power1.inOut' }, R.sky)
  tl.set(E, { shot: SHOT.arena, arena: 1 }, R.arena)
  tl.to(E, { fade: 0, duration: 1, ease: 'power1.out' }, R.arena + 0.1)
  E.cards.forEach((card, i) => {
    const at = R.cards + i * 1.4
    tl.to(card, { alpha: 1, duration: 1.1, ease: 'power1.inOut' }, at)
    tl.to(card, { glow: i === 2 ? 1 : 0.5, duration: 1.1, ease: 'power1.inOut' }, at)
  })
  tl.to(E, { burst: 0.35, duration: 1.4, ease: 'power1.inOut' }, R.cards + 2.8)
  tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.in' }, R.out)
  // Route immobile, message affiché ligne par ligne, d'un bloc
  tl.set(E, { shot: SHOT.road, red: 0.5 }, R.road)
  tl.to(E, { fade: 0, duration: 1, ease: 'power1.out' }, R.road + 0.1)
  R.lines.forEach((at, i) => {
    tl.call(hooks.line, [i], at)
  })
  tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.in' }, R.away)
  tl.call(hooks.line, [-1], R.away + 0.8)
  tl.set(E, { shot: SHOT.finale, red: 1 }, R.finale)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, R.finale + 0.1)
  tl.to(E, { halo: 1, duration: 1.4, ease: 'power1.out' }, R.finale + 0.1)
  tl.to(E, { intensity: 0.4, duration: R.away, ease: 'none' }, 0)
  tl.call(hooks.finale, [], R.end)
  tl.to(E, { t: R.end, duration: R.end, ease: 'none' }, 0)
}

/** Timeline en pause : EasterScene la lance une fois les shaders compilés. */
export function buildTimeline(hooks: Hooks): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  if (E.reduced) reduced(tl, hooks)
  else full(tl, hooks)
  return tl
}
