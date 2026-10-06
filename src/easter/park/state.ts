// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md, « Le parc » et « Final ») : valeurs
// animées du parc, mutables et hors React, comme E (../state.ts). parkTimeline (timeline.ts) les écrit,
// Park.tsx et parkCamera les lisent dans useFrame (jamais de setState par frame). resetPark() repart de
// l'état initial ; parkTimeline l'appelle en construisant sa partie de la timeline.
import { E, SHOT } from '../state'

export type ParkState = {
  /** Secondes depuis le début du beat 8, écrites par la timeline (0 -> PARK_DURATION, linéaire). */
  t: number
  /** Beat 9 : secondes écoulées après la fin de la timeline (dérive libre), avancées par Park. */
  linger: number
  reduced: boolean
  /** Décalage (s) entre le début du parc et celui de la musique (P.t + music = temps de park.mp3). */
  music: number
  /** Fondu noir propre au parc (plans fixes en reduced-motion), 0 transparent. */
  fade: number
  /** Voile de lumière rose à la sortie de la porte (« la lumière inonde »), 1 -> 0 en rampe. */
  glare: number
  /** Allumage du parc (néons, écrans, cabines, rail), 0 -> 1. */
  lights: number
  /** Accent musical (drop) : les néons montent un peu, en rampe douce (jamais de flash). */
  accent: number
  /** Feux d'artifice : gerbes de la porte (bienvenue) et du final, intensité 0 -> 1. */
  fireworksGate: number
  fireworksFinale: number
  /** Halo du B monumental (beat 9), 0 -> 1. */
  halo: number
}

function initial(reduced: boolean): ParkState {
  return {
    t: 0,
    linger: 0,
    reduced,
    music: 0,
    fade: reduced ? 1 : 0,
    glare: 0,
    lights: reduced ? 1 : 0,
    accent: 0,
    fireworksGate: 0,
    fireworksFinale: 0,
    halo: reduced ? 1 : 0,
  }
}

export const P: ParkState = initial(false)

export function resetPark(reduced: boolean): void {
  Object.assign(P, initial(reduced))
}

/** Temps du parc pour la caméra et les objets : timeline, puis dérive libre du beat 9. */
export function parkTime(): number {
  return P.t + P.linger
}

/** Le parc est le plan courant de la séquence (D1 bascule E.shot sur SHOT.park au début du beat 8). */
export function inPark(): boolean {
  return E.shot === SHOT.park
}
