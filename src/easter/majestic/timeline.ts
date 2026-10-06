// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, tableau « Séquence », beats 0 à
// 7) : timeline GSAP du second niveau, séparée de celle de la séquence (qui reste au final du parc). Elle
// écrit l'état M (state.ts), bascule E.shot et le fondu, et appelle des hooks (musique, précompilation,
// message de fin, retour à la page). Repères : times.ts, tous dérivés de MAJESTIC_MARKS. Deux versions :
// - complète : 0. ACCESS GRANTED tapé, précompilation sous le texte, le B du parc se contracte en un
//   point, la musique du parc s'éteint ; 1. piqué et plasma ; 2. la plaine, les cailloux sautillent ;
//   3. le séisme par rampes, fissures et poussière ; 4. la montagne sort, glissements de terrain ; 5. le
//   chœur se lève, visages et mains s'allument, faisceaux ; 6. le sommet s'ouvre, spectre, B sculpté
//   allumé, aurore ; 7. montée finale, noir, THANKS FOR PLAYING, retour à la page.
// - reduced-motion : fondus entre plans fixes (plaine, montagne levée, chœur, spectre, sortie), aucun
//   tremblement ni particule rapide, valeurs posées d'un bloc à chaque plan.
// Aucune variation de lumière plus rapide qu'une rampe d'une demi-seconde (WCAG 2.3.1) ; les rampes du
// séisme sont des montées et descentes de plus d'une seconde.
import { gsap } from '../../lib/gsap'
import { P } from '../park/state'
import { E, SHOT } from '../state'
import { STILL_FROM } from './camera'
import { M, type MajesticState } from './state'
import { ACCESS_TYPING, BLACKOUT, MT, PARK_FADE, QUAKE_HITS, beatDurations } from './times'

export type MajesticHooks = {
  /** Fondu de la musique du parc (s). */
  fadePark: (fade: number) => void
  /** Départ de MajesticBTV. */
  music: () => void
  /** Précompilation du monde du second niveau (la timeline se met en pause pendant ce temps). */
  warm: () => void
  /** THANKS FOR PLAYING affiché ou retiré. */
  thanks: (shown: boolean) => void
  /** Retour à la page. */
  back: () => void
}

type Values = Partial<Omit<MajesticState, 'reduced' | 'mobile' | 'bloom'>>

/** Valeurs de M de chaque plan fixe du reduced-motion (STILL_FROM, camera.ts). */
export const STILL_VALUES: readonly Values[] = [
  { plain: 1 },
  { plain: 1, rise: 1, cracks: 1, dust: 0.35 },
  { plain: 1, rise: 1, cracks: 1, dust: 0.3, choir: 1, beams: 1 },
  {
    plain: 1,
    rise: 1,
    cracks: 1,
    dust: 0.25,
    choir: 1,
    beams: 1,
    prism: 1,
    spectrum: 1,
    sculpt: 1,
    aurora: 0.35,
  },
  {
    plain: 1,
    rise: 1,
    cracks: 1,
    dust: 0.2,
    choir: 1,
    beams: 0.6,
    prism: 1,
    spectrum: 0.4,
    sculpt: 1,
    aurora: 1,
    outro: 1,
  },
]

/** Beat 0, commun aux deux versions : HUD, précompilation, contraction du B, musique du parc. */
function access(tl: gsap.core.Timeline, hooks: MajesticHooks, reduced: boolean) {
  tl.call(hooks.fadePark, [PARK_FADE], 0)
  if (reduced) tl.set(M, { access: 1 }, 0)
  else tl.to(M, { access: 1, duration: ACCESS_TYPING, ease: 'none' }, 0)
  tl.call(hooks.warm, [], MT.warm)
  // Les gerbes du final s'éteignent, le halo du B se resserre avec lui
  tl.to(P, { fireworksFinale: 0, duration: 1.2, ease: 'power1.inOut' }, 0)
  // La lumière nous avale : voile blanc rosé (teinte 2, celle des portes du parc), pas de noir entre
  // les deux mondes ; la teinte repasse au noir une fois le voile levé (fondus de la fin)
  tl.set(E, { fadeTint: 2 }, 0)
  if (reduced) {
    tl.to(E, { fade: 1, duration: 0.8, ease: 'power1.inOut' }, MT.collapse)
  } else {
    const shrink = MT.music - 0.6 - MT.collapse
    tl.to(M, { collapse: 1, duration: shrink, ease: 'power1.in' }, MT.collapse)
    // Le point de lumière gonfle doucement jusqu'à remplir l'écran (une seule rampe, pas de flash)
    tl.to(E, { fade: 1, duration: 0.6, ease: 'power1.inOut' }, MT.music - 0.62)
  }
  tl.set(E, { shot: SHOT.majestic }, MT.entry)
  tl.set(E, { fadeTint: 0 }, MT.entry + 1.6)
  tl.call(hooks.music, [], MT.music)
}

function full(tl: gsap.core.Timeline) {
  const d = beatDurations()
  // 1. Entrée atmosphérique : le voile s'ouvre sur le plasma, qui retombe en sortant des nuages
  tl.to(E, { fade: 0, duration: 1.3, ease: 'power1.out' }, MT.entry + 0.02)
  tl.to(M, { entry: 1, duration: 0.9, ease: 'power1.out' }, MT.entry)
  tl.to(M, { entry: 0, duration: 0.38 * d.entry, ease: 'power1.inOut' }, MT.entry + 0.46 * d.entry)
  tl.to(M, { plain: 1, duration: 0.5 * d.entry, ease: 'power1.inOut' }, MT.entry + 0.4 * d.entry)
  // 2. La plaine : calme, puis les cailloux commencent à sautiller
  tl.to(M, { quake: 0.12, duration: 0.4 * d.plain, ease: 'power1.in' }, MT.plain + 0.6 * d.plain)
  // 3. Le séisme : il s'installe avec les percussions, puis une rampe plus forte sur chaque coup sourd
  // du break (QUAKE_HITS), fissures et poussière
  tl.to(M, { quake: 0.32, duration: 3, ease: 'power1.inOut' }, MT.quake)
  QUAKE_HITS.forEach((at, i) => {
    const peak = 0.55 + (0.4 * (i + 1)) / QUAKE_HITS.length
    const next = QUAKE_HITS[i + 1] ?? MT.mountain
    tl.to(M, { quake: peak, duration: 0.6, ease: 'power2.out' }, at)
    tl.to(
      M,
      { quake: peak * 0.6, duration: Math.max(0.8, 0.7 * (next - at - 0.6)), ease: 'power1.inOut' },
      at + 0.6,
    )
  })
  tl.to(M, { cracks: 1, duration: d.quake + 0.2 * d.mountain, ease: 'power1.in' }, MT.quake)
  tl.to(M, { dust: 0.6, duration: d.quake, ease: 'power1.in' }, MT.quake)
  // 4. La montagne : elle sort du sol, glissements de terrain ; le séisme culmine puis s'apaise
  tl.to(M, { quake: 1, duration: 1.6, ease: 'power2.out' }, MT.mountain)
  tl.to(M, { rise: 1, duration: 0.82 * d.mountain, ease: 'power1.inOut' }, MT.mountain)
  // Poussière levée, sans cacher la montagne qui sort (glissements et cascades de sable : env/)
  tl.to(M, { dust: 0.72, duration: 0.3 * d.mountain, ease: 'power1.inOut' }, MT.mountain)
  tl.to(
    M,
    { slide: 1, duration: 0.45 * d.mountain, ease: 'power1.in' },
    MT.mountain + 0.1 * d.mountain,
  )
  tl.to(
    M,
    { slide: 0.25, duration: 0.3 * d.mountain, ease: 'power1.out' },
    MT.mountain + 0.7 * d.mountain,
  )
  tl.to(
    M,
    { quake: 0.12, duration: 0.25 * d.mountain, ease: 'power1.inOut' },
    MT.mountain + 0.72 * d.mountain,
  )
  tl.to(
    M,
    { dust: 0.4, duration: 0.3 * d.mountain, ease: 'power1.inOut' },
    MT.mountain + 0.6 * d.mountain,
  )
  // 5. Le chœur se lève (le sol tremble encore un peu), puis visages, mains et faisceaux s'allument
  tl.to(M, { choir: 1, duration: 0.4 * d.choir, ease: 'power1.inOut' }, MT.choir)
  tl.to(M, { quake: 0.4, duration: 1.2, ease: 'power2.out' }, MT.choir)
  tl.to(M, { quake: 0, duration: 0.45 * d.choir, ease: 'power1.inOut' }, MT.choir + 1.2)
  tl.to(M, { beams: 1, duration: 0.3 * d.choir, ease: 'power1.inOut' }, MT.choir + 0.36 * d.choir)
  // 6. Le prisme : le sommet s'ouvre, le spectre jaillit dans le ciel, le B s'allume, l'aurore monte
  tl.to(M, { prism: 1, duration: 0.3 * d.prism, ease: 'power2.inOut' }, MT.prism)
  tl.to(
    M,
    { spectrum: 1, duration: 0.3 * d.prism, ease: 'power1.inOut' },
    MT.prism + 0.22 * d.prism,
  )
  tl.to(
    M,
    { sculpt: 1, duration: Math.max(2, 0.2 * d.prism), ease: 'power1.inOut' },
    MT.prism + 0.3 * d.prism,
  )
  tl.to(
    M,
    { aurora: 1, duration: 0.45 * d.prism + 0.3 * d.exit, ease: 'power1.inOut' },
    MT.prism + 0.55 * d.prism,
  )
  tl.to(M, { spectrum: 0.4, duration: 0.5 * d.exit, ease: 'power1.inOut' }, MT.exit)
  // 7. Sortie : montée au-dessus des nuages, les faisceaux s'éteignent, noir sur la dernière note
  tl.to(M, { outro: 1, duration: d.exit, ease: 'power1.inOut' }, MT.exit)
  tl.to(M, { beams: 0.5, duration: 0.6 * d.exit, ease: 'power1.inOut' }, MT.exit)
  tl.to(M, { fade: 1, duration: BLACKOUT, ease: 'power1.in' }, MT.final)
}

function stills(tl: gsap.core.Timeline) {
  STILL_FROM.forEach((from, i) => {
    const values = STILL_VALUES[i] ?? {}
    if (i > 0) tl.to(M, { fade: 1, duration: 0.8, ease: 'power1.in' }, from - 0.85)
    tl.set(M, values, from - 0.02)
    if (i === 0) tl.to(E, { fade: 0, duration: 1.2, ease: 'power1.out' }, from + 0.05)
    else tl.to(M, { fade: 0, duration: 1, ease: 'power1.out' }, from + 0.05)
  })
  tl.to(M, { fade: 1, duration: BLACKOUT, ease: 'power1.in' }, MT.final)
}

/** Timeline du second niveau, en pause : useMajestic la lance (ou la positionne pour le debug). */
export function buildMajesticTimeline(hooks: MajesticHooks): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true })
  const reduced = M.reduced
  tl.to(M, { t: MT.back, duration: MT.back, ease: 'none' }, 0)
  access(tl, hooks, reduced)
  if (reduced) stills(tl)
  else full(tl)
  tl.call(hooks.thanks, [true], MT.thanks)
  tl.call(hooks.back, [], MT.back)
  return tl
}
