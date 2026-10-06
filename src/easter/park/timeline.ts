// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md, « Le parc » puis « Final ») : partie de la
// timeline GSAP du parc. D1 l'appelle dans buildTimeline : parkTimeline(tl, T.park, début de park.mp3).
// Elle n'écrit que l'état P (state.ts) ; la caméra (camera.ts) et les objets (Park.tsx) le lisent.
// - Complète (≈ 72 s) : on sort de la lumière de la porte, le parc s'allume, gerbes de bienvenue ; au
//   premier temps fort de la musique (PARK_MARKS.drop), les néons montent ; halo du B et feux d'artifice
//   lents à l'approche du final. Passé PARK_DURATION, la caméra dérive face au B (beat 9, sans fin).
// - Reduced-motion : plans fixes (parkStills) enchaînés par des fondus au noir, sans feux d'artifice ni
//   mouvement de caméra ; le dernier plan (le B) reste.
// Aucune variation de lumière plus rapide qu'une rampe d'une demi-seconde (WCAG 2.3.1).
import { E } from '../state'
import { PARK_MARKS } from '../voice'
import { type Still, buildStills } from './camera'
import { BEATS, STILL_TIME } from './layout'
import { P, resetPark } from './state'

/** Durée du vol dans le parc (beat 8) jusqu'à l'arrêt face au B (début du beat 9). */
export const PARK_DURATION = BEATS.stop

/** Plans fixes du reduced-motion : allée des écrans, rail de la géante, grande roue, cartes, le B. */
export const parkStills: readonly Still[] = buildStills()

/** Durée de la partie parc de la timeline (le dernier plan fixe compris en reduced-motion). */
export function parkDuration(reduced: boolean): number {
  return reduced ? STILL_TIME * parkStills.length : PARK_DURATION
}

/** Repères de park.mp3 (voice.ts, agent A) : premier temps fort et période du tempo (s). */
const MARKS: { drop: number; beat?: number } = PARK_MARKS

/** Période du tempo (s) pour les pulsations douces des néons, 0 sans tempo mesuré. */
export const PARK_BEAT = MARKS.beat ?? 0
export const PARK_DROP = MARKS.drop

function full(tl: gsap.core.Timeline, start: number, musicAt: number) {
  tl.to(P, { t: PARK_DURATION, duration: PARK_DURATION, ease: 'none' }, start)
  // On sort de la lumière de la porte : voile rose qui se dissipe, le parc s'allume
  tl.set(P, { glare: 1, lights: 0.25, fireworksGate: 1 }, start)
  tl.to(P, { glare: 0, duration: 1.8, ease: 'power2.out' }, start)
  tl.to(P, { lights: 1, duration: 3, ease: 'power1.inOut' }, start + 0.2)
  tl.to(P, { fireworksGate: 0, duration: 4, ease: 'power1.in' }, start + BEATS.alley + 4)
  // Premier temps fort de la musique : les néons montent en rampe, puis restent un peu plus vifs
  const drop = musicAt + MARKS.drop
  if (drop > start && drop < start + PARK_DURATION - 4) {
    tl.to(P, { accent: 1, duration: 0.6, ease: 'power2.out' }, drop)
    tl.to(P, { accent: 0.35, duration: 3.5, ease: 'power1.inOut' }, drop + 0.6)
  }
  // Final : halo du B, gerbes lentes autour de lui
  tl.to(P, { halo: 1, duration: 6, ease: 'power1.inOut' }, start + BEATS.monument)
  tl.to(P, { fireworksFinale: 1, duration: 4, ease: 'power1.inOut' }, start + BEATS.monument + 3)
}

function stills(tl: gsap.core.Timeline, start: number) {
  const duration = parkDuration(true)
  tl.to(P, { t: duration, duration, ease: 'none' }, start)
  parkStills.forEach((_, i) => {
    const at = start + i * STILL_TIME
    tl.to(P, { fade: 0, duration: 1, ease: 'power1.out' }, at + 0.05)
    if (i < parkStills.length - 1) {
      tl.to(P, { fade: 1, duration: 0.8, ease: 'power1.in' }, at + STILL_TIME - 0.85)
    }
  })
}

/**
 * Ajoute le parc à la timeline de la séquence, à partir de `start` (s). `musicAt` : instant (s, même
 * timeline) où démarre park.mp3, pour caler les accents sur la musique (par défaut : `start`).
 * Remet P à zéro (appelé à la construction de la timeline, après resetEaster).
 */
export function parkTimeline(tl: gsap.core.Timeline, start: number, musicAt = start): void {
  resetPark(E.reduced)
  P.music = start - musicAt
  if (E.reduced) stills(tl, start)
  else full(tl, start, musicAt)
}
