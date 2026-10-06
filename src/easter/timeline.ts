// Easter egg : timeline GSAP basée sur le temps (pas le scroll), ≈ 29 s. Elle n'écrit que l'état mutable
// E (state.ts) ; les composants le lisent dans useFrame. Deux versions :
// - complète : 1. le prisme éclate (0–1.5 s) ; 2. l'arène se révèle, la caméra descend du ciel (1.5–7) ;
//   3. trois cartes distribuées puis retournées, COMMON, RARE, LEGENDARY (7–14) ; 4. la légendaire se lève
//   et montre son dos, plongée vers le B (14–16.3) ; 5. vol le long du B géant, de plus en plus vite,
//   virage au rouge (16.3–26) ; 6. silence, impact, le B entier (26–29) ; 7. final.
// - reduced-motion : fondus seulement (arène, cartes qui apparaissent sans vol, puis le B), ≈ 11 s.
// Aucun clignotement : les variations de lumière sont des rampes, l'éclair et l'impact sont uniques.
import { gsap } from '../lib/gsap'
import type { TensionCue } from './audio'
import { E, SHOT } from './state'

export const T = {
  shatter: 0.7,
  arena: 1.5,
  deal: 7,
  flips: [9.3, 10.5] as const,
  charge: 11.6,
  legendary: 12.3,
  lift: 13.9,
  approach: 14.3,
  turn: 14.5,
  dive: 15.4,
  flight: 16.3,
  climax: 26,
  impact: 26.5,
  finale: 29,
} as const

export const REDUCED_FINALE = 11

type Hooks = { cue: (name: TensionCue) => void; climax: () => void; finale: () => void }

/** Accélération du vol : départ lent (on lit l'échelle du B), puis vitesse de la lumière. */
const accelerate = (p: number) => 0.22 * p + 0.78 * p * p * p

function full(tl: gsap.core.Timeline, hooks: Hooks) {
  const [common, rare, legendary] = E.cards
  // 1. Le prisme tremble, éclate vers la caméra, fondu au noir
  tl.to(E, { tremble: 1, duration: T.shatter - 0.1, ease: 'power2.in' }, 0.1)
  tl.call(hooks.cue, ['shatter'], T.shatter)
  tl.to(E, { shatter: 1, duration: 1.6, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 1, duration: 0.06, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 0, duration: 0.7, ease: 'power2.out' }, T.shatter + 0.06)
  tl.to(E, { fade: 1, duration: 0.5, ease: 'power1.in' }, T.arena - 0.5)
  // 2. Arène : la caméra descend du ciel (camera.ts, sur E.t), bougies et cristaux s'allument
  tl.set(E, { shot: SHOT.arena }, T.arena)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, T.arena + 0.1)
  tl.to(E, { arena: 1, duration: 4, ease: 'power1.inOut' }, T.arena + 0.3)
  // 3. Distribution depuis le deck, puis retournements un par un
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
  // 4. La légendaire se lève et se retourne, la caméra s'approche du B puis plonge
  tl.to(E, { lift: 1, duration: 1.2, ease: 'power2.inOut' }, T.lift)
  tl.to(E, { turn: 1, duration: 1, ease: 'power2.inOut' }, T.turn)
  tl.to(E, { approach: 1, duration: 1.3, ease: 'power2.inOut' }, T.approach)
  tl.to(E, { dive: 1, duration: T.flight - T.dive, ease: 'power3.in' }, T.dive)
  // 5. Le B géant : vol, accélération, épaisseur, virage au rouge
  tl.set(E, { shot: SHOT.flight }, T.flight)
  tl.call(hooks.cue, ['swap'], T.flight)
  tl.to(E, { flight: 1, duration: T.climax - T.flight, ease: accelerate }, T.flight)
  tl.to(E, { speed: 1, duration: T.climax - T.flight, ease: 'power2.in' }, T.flight)
  tl.to(E, { extrude: 1, duration: 1.6, ease: 'power2.out' }, T.flight + 0.2)
  tl.to(E, { red: 1, duration: 7.5, ease: 'power1.in' }, T.flight + 1.5)
  // 6. Climax : noir et silence (0.5 s), impact, le B entier dans son halo
  tl.call(hooks.climax, [], T.climax)
  tl.to(E, { fade: 1, duration: 0.15, ease: 'power1.in' }, T.climax)
  tl.set(E, { shot: SHOT.finale, speed: 0 }, T.impact)
  tl.to(E, { fade: 0, duration: 1, ease: 'power2.out' }, T.impact)
  tl.to(E, { halo: 1, duration: 1.8, ease: 'expo.out' }, T.impact)
  tl.to(E, { impact: 1, duration: 0.04, ease: 'none' }, T.impact)
  tl.to(E, { impact: 0, duration: 1.4, ease: 'power3.out' }, T.impact + 0.04)
  // Son : la tension monte par paliers, puis jusqu'au bout pendant le vol
  tl.to(E, { intensity: 0.3, duration: 5, ease: 'none' }, T.arena)
  tl.to(E, { intensity: 0.5, duration: 6, ease: 'none' }, T.deal)
  tl.to(E, { intensity: 1, duration: T.climax - T.flight, ease: 'power1.in' }, T.flight)
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
  tl.to(E, { fade: 0, duration: 1.2, ease: 'power1.out' }, 1)
  E.cards.forEach((card, i) => {
    const at = 3 + i * 1.4
    tl.to(card, { alpha: 1, duration: 1.1, ease: 'power1.inOut' }, at)
    tl.to(card, { glow: i === 2 ? 1 : 0.5, duration: 1.1, ease: 'power1.inOut' }, at)
  })
  tl.to(E, { burst: 0.35, duration: 1.4, ease: 'power1.inOut' }, 5.8)
  tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.in' }, 8.6)
  tl.set(E, { shot: SHOT.finale, red: 1 }, 9.5)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, 9.6)
  tl.to(E, { halo: 1, duration: 1.4, ease: 'power1.out' }, 9.6)
  tl.to(E, { intensity: 0.4, duration: 9, ease: 'none' }, 0)
  tl.call(hooks.finale, [], REDUCED_FINALE)
  tl.to(E, { t: REDUCED_FINALE, duration: REDUCED_FINALE, ease: 'none' }, 0)
}

/** Timeline en pause : EasterScene la lance une fois les shaders compilés. */
export function buildTimeline(hooks: Hooks): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  if (E.reduced) reduced(tl, hooks)
  else full(tl, hooks)
  return tl
}
