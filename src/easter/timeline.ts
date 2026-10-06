// Easter egg v3 (docs/storyboards/easter-park.md, beats 1 à 7, puis le parc de D2) : timeline GSAP basée
// sur le temps (pas le scroll). Elle n'écrit que l'état mutable E (state.ts) et appelle des hooks (son,
// message, clips, sous-titres) ; les composants lisent E dans useFrame. Repères : times.ts. Deux versions :
// - complète : 1. zoom de 3 s sur le prisme intact, demi-seconde de silence, éclatement à 3 s et fondu
//   calé dessus (comme avant 788666d) ; 2. l'arène, les trois cartes, la légendaire, la plongée vers le B ;
//   3. la route de 19 s, montée lente, projets et arches, les trois lignes du message ; 4. sortie du warp :
//   traînées étirées puis résorbées en étoiles, route effacée, cockpit qui s'allume ; 5. le temps se pose :
//   Houston, la forme lointaine qui grossit puis s'arrête, silence ; 6. « BoulardTV. » : la porte s'allume
//   en rampe, le vaisseau bondit ; 7. la speakeuse : portes ouvertes, lumière qui inonde, cri, musique et
//   bascule sur le parc (beat 8, parkTimeline de D2), puis le final (stage 'finale').
// - reduced-motion : fondus enchaînés entre plans fixes (prisme, arène, cartes, route immobile et message
//   d'un bloc, ciel fixe et sous-titres, porte allumée, parc).
// Aucun clignotement : les variations de lumière sont des rampes, l'éclair et les impacts sont uniques.
import { gsap } from '../lib/gsap'
import type { TensionCue } from './audio'
import { parkDuration, parkTimeline } from './park/timeline'
import { ROAD_LENGTH, ROAD_TIME, distanceEase, speedEase } from './roadPath'
import type { SpaceCue } from './sfx'
import { E, SHOT } from './state'
import { R, T, lineCues, subtitleCues } from './times'
import type { ClipId } from './voice'

export type Hooks = {
  cue: (name: TensionCue) => void
  /** Sons ponctuels des beats 6 et 7 (souffle, bond, portes). */
  sfx: (name: SpaceCue) => void
  /** Silence d'une demi-seconde (avant l'éclatement). */
  hush: () => void
  /** Sortie du warp : tout retombe, un grave sourd. */
  climax: () => void
  /** Ligne du message affichée (site.easter.lines), −1 pour l'effacer. */
  line: (index: number) => void
  /** Clip enregistré (voice.ts) démarré maintenant. */
  clip: (id: ClipId) => void
  /** Sous-titre affiché (site.easter.subtitles), −1 pour l'effacer. */
  subtitle: (index: number) => void
  finale: () => void
}

/** Fin de la séquence (départ du final, beat 9) : fin du vol dans le parc. */
export function sequenceEnd(reduced: boolean): number {
  return (reduced ? R.park : T.park) + parkDuration(reduced)
}

function prelude(tl: gsap.core.Timeline, hooks: Hooks) {
  // 1. Zoom de 3 s, lumière qui se resserre, verre qui vibre de plus en plus ; silence ; éclatement
  const zoom = T.shatter - T.zoom
  tl.to(E, { zoom: 1, duration: zoom, ease: 'power1.in' }, T.zoom)
  tl.to(E, { focus: 1, duration: zoom, ease: 'power1.inOut' }, T.zoom)
  tl.to(E, { tremble: 1, duration: T.hush - T.zoom - 0.3, ease: 'power3.in' }, T.zoom + 0.3)
  tl.call(hooks.hush, [], T.hush)
  tl.to(E, { tremble: 0, duration: 0.12, ease: 'power2.out' }, T.hush)
  tl.call(hooks.cue, ['shatter'], T.shatter)
  tl.set(E, { focus: 0 }, T.shatter)
  tl.to(E, { shatter: 1, duration: 1.6, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 1, duration: 0.06, ease: 'none' }, T.shatter)
  tl.to(E, { flash: 0, duration: 0.7, ease: 'power2.out' }, T.shatter + 0.06)
  tl.to(E, { kick: 1, duration: 0.04, ease: 'none' }, T.shatter)
  tl.to(E, { kick: 0, duration: 0.7, ease: 'power3.out' }, T.shatter + 0.04)
  // Fondu au noir 0.3 s après l'éclat, arène 0.8 s après (relation d'avant 788666d)
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
  // La légendaire se lève et se retourne, la caméra s'approche du B puis plonge ; fondu rose
  tl.to(E, { lift: 1, duration: 1.2, ease: 'power2.inOut' }, T.lift)
  tl.to(E, { turn: 1, duration: 1, ease: 'power2.inOut' }, T.turn)
  tl.to(E, { approach: 1, duration: 1.3, ease: 'power2.inOut' }, T.approach)
  tl.to(E, { dive: 1, duration: T.road - T.dive, ease: 'power3.in' }, T.dive)
  tl.set(E, { fadeTint: 1 }, T.road - 0.35)
  tl.to(E, { fade: 1, duration: 0.3, ease: 'power1.in' }, T.road - 0.35)
}

function road(tl: gsap.core.Timeline, hooks: Hooks) {
  // 3. La route : distance et vitesse suivent roadPath.ts (montée lente puis vitesse de la lumière),
  // projets et arches en bord de route, message ; le rouge monte surtout dans la seconde moitié
  tl.set(E, { shot: SHOT.road }, T.road)
  tl.call(hooks.cue, ['swap'], T.road)
  tl.to(E, { fade: 0, duration: 0.8, ease: 'power1.out' }, T.road + 0.05)
  tl.set(E, { fadeTint: 0 }, T.road + 0.9)
  tl.to(E, { road: ROAD_LENGTH, duration: ROAD_TIME, ease: distanceEase }, T.road)
  tl.to(E, { speed: 1, duration: ROAD_TIME, ease: speedEase }, T.road)
  tl.to(E, { red: 1, duration: ROAD_TIME - 2, ease: 'power2.in' }, T.road + 2)
  lineCues(false).forEach(({ at, index }) => {
    tl.call(hooks.line, [index], at)
  })
}

function warpExit(tl: gsap.core.Timeline, hooks: Hooks) {
  // 4. Sortie du warp : les traînées s'étirent encore puis se résorbent en étoiles, la route s'efface et
  // le rouge retombe ; bascule vers l'espace une fois la route noire ; le ciel réaliste et le cockpit
  tl.call(hooks.climax, [], T.warp)
  tl.to(E, { stretch: 1, duration: 0.45, ease: 'power2.out' }, T.warp)
  tl.to(E, { stretch: 0, duration: 1.3, ease: 'power2.inOut' }, T.warp + 0.45)
  tl.to(E, { speed: 0, duration: 2.4, ease: 'power3.out' }, T.warp + 0.3)
  tl.to(E, { roadDim: 1, duration: T.space - T.warp - 0.2, ease: 'power1.in' }, T.warp + 0.2)
  tl.to(E, { red: 0, duration: 1.2, ease: 'power1.inOut' }, T.warp + 0.2)
  tl.set(E, { shot: SHOT.space }, T.space)
  tl.to(E, { sky: 1, duration: 2.6, ease: 'power1.inOut' }, T.space - 0.4)
  tl.to(E, { cockpit: 1, duration: 1.8, ease: 'power1.inOut' }, T.space + 0.3)
}

function space(tl: gsap.core.Timeline, hooks: Hooks) {
  // 5. Le temps se pose : Houston ; la forme grossit très lentement pendant toute la voix et s'arrête,
  // encore dans l'ombre ; silence de suspense
  tl.call(hooks.clip, ['houston'], T.houston)
  tl.to(E, { shape: 1, duration: T.hold - T.calm, ease: 'power1.out' }, T.calm)
  // 6. « BoulardTV. » : la porte s'allume en rampe (1.4 s), le vaisseau bondit, impact doux à l'arrivée
  tl.call(hooks.clip, ['houstonName'], T.name)
  tl.call(hooks.sfx, ['reveal'], T.name + 0.1)
  tl.to(E, { gate: 1, duration: 1.4, ease: 'power1.inOut' }, T.name + 0.15)
  tl.call(hooks.sfx, ['leap'], T.name + 0.55)
  tl.to(E, { leap: 1, duration: 1.1, ease: 'power3.inOut' }, T.name + 0.55)
  tl.to(E, { kick: 0.6, duration: 0.05, ease: 'none' }, T.name + 1.6)
  tl.to(E, { kick: 0, duration: 0.9, ease: 'power3.out' }, T.name + 1.65)
  // 7. La speakeuse : sur « MAINTENANT » les portes s'ouvrent et la lumière passe ; sur « Bienvenue »
  // on avance et la lumière inonde (blanc rosé), elle masque la coupe ; sur le cri, la musique démarre et
  // on entre dans le parc (ses feux d'artifice de bienvenue partent de l'autre côté de la porte, D2)
  tl.call(hooks.clip, ['speaker'], T.speaker)
  tl.call(hooks.sfx, ['doors'], T.doors)
  tl.to(E, { doors: 1, duration: 1.8, ease: 'power2.inOut' }, T.doors)
  tl.to(E, { glare: 1, duration: 1.2, ease: 'power2.out' }, T.doors + 0.15)
  tl.to(E, { enter: 1, duration: T.park - T.welcome, ease: 'power2.in' }, T.welcome)
  tl.set(E, { fadeTint: 2 }, T.welcome)
  tl.to(E, { fade: 1, duration: T.park - T.welcome, ease: 'power3.in' }, T.welcome)
  tl.set(E, { shot: SHOT.park }, T.park)
  tl.call(hooks.clip, ['park'], T.park)
  // Le voile du parc (P.glare, D2) prend le relais et se dissipe plus lentement
  tl.to(E, { fade: 0, duration: 0.6, ease: 'power1.out' }, T.park + 0.05)
}

function subtitles(tl: gsap.core.Timeline, hooks: Hooks, reduced: boolean) {
  subtitleCues(reduced).forEach(({ at, index }) => {
    tl.call(hooks.subtitle, [index], at)
  })
}

function full(tl: gsap.core.Timeline, hooks: Hooks) {
  prelude(tl, hooks)
  cards(tl, hooks)
  road(tl, hooks)
  warpExit(tl, hooks)
  space(tl, hooks)
  subtitles(tl, hooks, false)
  parkTimeline(tl, T.park)
  // Son : la tension monte pendant le zoom, retombe dans l'arène, repart de plus bas sur la route et
  // monte jusqu'au bout. Après le warp, l'intensité règle la nappe spatiale : basse sous les voix,
  // presque rien pendant le silence, gonflée à la révélation, coupée à l'arrivée de la musique.
  tl.to(E, { intensity: 0.55, duration: T.shatter, ease: 'power1.in' }, T.zoom)
  tl.to(E, { intensity: 0.25, duration: 1.5, ease: 'power1.out' }, T.arena)
  tl.to(E, { intensity: 0.5, duration: 6, ease: 'none' }, T.deal)
  tl.to(E, { intensity: 0.3, duration: 1.2, ease: 'power1.out' }, T.road)
  tl.to(E, { intensity: 1, duration: ROAD_TIME - 1.2, ease: 'power2.in' }, T.road + 1.2)
  tl.set(E, { intensity: 0 }, T.warp)
  tl.to(E, { intensity: 0.7, duration: 2.5, ease: 'power1.inOut' }, T.space)
  tl.to(E, { intensity: 0.3, duration: 1.5, ease: 'power1.inOut' }, T.houston - 0.8)
  tl.to(E, { intensity: 0.12, duration: 1.2, ease: 'power1.inOut' }, T.hold)
  tl.to(E, { intensity: 0.6, duration: 1.2, ease: 'power1.inOut' }, T.name)
  tl.to(E, { intensity: 0.3, duration: 0.8, ease: 'power1.inOut' }, T.speaker)
  tl.to(E, { intensity: 0, duration: 0.3, ease: 'power1.out' }, T.park)
  const end = sequenceEnd(false)
  tl.call(hooks.finale, [], end)
  tl.to(E, { t: end, duration: end, ease: 'none' }, 0)
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
  lineCues(true).forEach(({ at, index }) => {
    tl.call(hooks.line, [index], at)
  })
  tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.in' }, R.away)
  // Ciel fixe, cockpit allumé, la forme au loin ; Houston et ses sous-titres
  tl.set(E, { shot: SHOT.space, red: 0, sky: 1, cockpit: 1, shape: 0.5 }, R.space)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, R.space + 0.1)
  tl.call(hooks.clip, ['houston'], R.houston)
  // La porte allumée, de près, en fondu enchaîné
  tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.in' }, R.name - 0.8)
  tl.set(E, { shape: 1, gate: 1, leap: 1 }, R.name)
  tl.call(hooks.clip, ['houstonName'], R.name)
  tl.to(E, { fade: 0, duration: 1.2, ease: 'power1.out' }, R.name + 0.05)
  tl.call(hooks.clip, ['speaker'], R.speaker)
  // Portes ouvertes sous un fondu blanc rosé, puis le parc
  tl.set(E, { fadeTint: 2 }, R.doors)
  tl.to(E, { fade: 1, duration: R.park - R.doors, ease: 'power1.inOut' }, R.doors)
  tl.set(E, { doors: 1, glare: 1 }, R.park - 0.05)
  tl.set(E, { shot: SHOT.park }, R.park)
  tl.call(hooks.clip, ['park'], R.park)
  tl.to(E, { fade: 0, duration: 1.4, ease: 'power1.out' }, R.park + 0.05)
  subtitles(tl, hooks, true)
  parkTimeline(tl, R.park)
  tl.to(E, { intensity: 0.4, duration: R.away, ease: 'none' }, 0)
  tl.call(hooks.climax, [], R.warp)
  tl.set(E, { intensity: 0.3 }, R.warp)
  tl.set(E, { intensity: 0 }, R.park)
  const end = sequenceEnd(true)
  tl.call(hooks.finale, [], end)
  tl.to(E, { t: end, duration: end, ease: 'none' }, 0)
}

/** Timeline en pause : EasterScene la lance une fois les shaders compilés. */
export function buildTimeline(hooks: Hooks): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  if (E.reduced) reduced(tl, hooks)
  else full(tl, hooks)
  return tl
}
