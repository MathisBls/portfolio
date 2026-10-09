// Easter egg v3 (docs/storyboards/easter-park.md, tableau « Séquence complète ») : repères de temps de la
// séquence (secondes), partagés par la timeline, la caméra, la route et le saut de debug. Source de vérité.
// - Beat 1 (correctif 1 de Mathis) : zoom de 3 s, l'éclatement tombe à 3 s, et l'arène 0.8 s plus tard
//   comme avant 788666d (fondu au noir 0.3 s après l'éclat, en 0.5 s).
// - Beats 2 et 3 : arène et cartes inchangées (décalées), puis la route de 19 s (correctif 2).
// - Beats 4 à 7 : tous dérivés des clips (voice.ts : CLIPS, SPEAKER_MARKS), jamais recopiés.
// Les lignes du message tiennent ≥ LINE_HOLD une fois tapées (correctif 3, times.test.ts), dans les deux
// langues : les repères sont fixes, le test vérifie chaque dictionnaire.
import { typingDuration } from './typing'
import { CLIPS, type ClipId, SPEAKER_MARKS, SUBTITLES } from './voice'

/** Éclatement du prisme : au bout du zoom de 3 s. */
const SHATTER = 3
/** Arène : 0.8 s après l'éclatement (relation d'avant 788666d : éclat 0.7, fondu 1.0, arène 1.5). */
const ARENA = SHATTER + 0.8
/** Route (beat 3) : durée totale, montée lente puis vitesse de la lumière (roadPath.ts). */
export const ROAD_TIME = 19
const ROAD = ARENA + 14.8
/** Sortie du warp (beat 4) : fin de la route. */
const WARP = ROAD + ROAD_TIME
/** Le temps se pose (beat 5) 3 s après, Houston parle après une seconde de calme. */
const CALM = WARP + 3
const HOUSTON = CALM + 1
/** Silence de suspense avant « BoulardTV. » (storyboard : 2 à 2.5 s). */
export const SUSPENSE = 2.3
const NAME = HOUSTON + CLIPS.houston.duration + SUSPENSE
/** Révélation (beat 6) : le mot, les lumières en rampe, le bond ; la speakeuse juste après. */
const REVEAL_GAP = 0.7
const SPEAKER = NAME + CLIPS.houstonName.duration + REVEAL_GAP

/** Tenue minimale d'une ligne du message une fois entièrement tapée (s). */
export const LINE_HOLD = 1.5

/** Séquence complète. */
export const T = {
  /** Zoom lent sur le prisme intact (tension), demi-seconde de silence, puis l'éclatement. */
  zoom: 0,
  hush: SHATTER - 0.5,
  shatter: SHATTER,
  arena: ARENA,
  deal: ARENA + 5.5,
  flips: [ARENA + 7.8, ARENA + 9] as const,
  charge: ARENA + 10.1,
  legendary: ARENA + 10.8,
  lift: ARENA + 12.4,
  approach: ARENA + 12.8,
  turn: ARENA + 13,
  dive: ARENA + 13.9,
  /** Bascule du dos de la carte vers la route (fondu rose). */
  road: ROAD,
  /** Les trois lignes du message (dictionnaire, easter.lines), chacune remplace la précédente. */
  lines: [ROAD + 1.2, ROAD + 8, ROAD + 14.4] as const,
  /** Sortie du warp : la dernière ligne s'efface, les traînées se résorbent, le cockpit s'allume. */
  warp: WARP,
  /** Bascule route -> espace, une fois la route effacée. */
  space: WARP + 1.4,
  calm: CALM,
  /** Houston (clip houston), puis la forme s'arrête, silence, « BoulardTV. » (clip houstonName). */
  houston: HOUSTON,
  hold: HOUSTON + CLIPS.houston.duration,
  name: NAME,
  /** La speakeuse (clip speaker) : portes ouvertes, « Bienvenue », cri, musique et parc (beat 8). */
  speaker: SPEAKER,
  doors: SPEAKER + SPEAKER_MARKS.doors,
  welcome: SPEAKER + SPEAKER_MARKS.welcome,
  park: SPEAKER + SPEAKER_MARKS.shout,
} as const

const R_SPACE = 20.3
const R_HOUSTON = R_SPACE + 1.5
const R_NAME = R_HOUSTON + CLIPS.houston.duration + SUSPENSE
const R_SPEAKER = R_NAME + CLIPS.houstonName.duration + REVEAL_GAP

/** Reduced-motion : fondus seulement, route immobile, message affiché d'un bloc, plans fixes. */
export const R = {
  sky: 1.4,
  arena: 2,
  cards: 3.8,
  out: 9.2,
  road: 10.1,
  lines: [11, 13.8, 16.6] as const,
  away: 19.4,
  /** Fin du message (fondu au noir terminé). */
  warp: 20.2,
  space: R_SPACE,
  houston: R_HOUSTON,
  name: R_NAME,
  speaker: R_SPEAKER,
  doors: R_SPEAKER + SPEAKER_MARKS.doors,
  park: R_SPEAKER + SPEAKER_MARKS.shout,
} as const

/** Début d'un clip dans la séquence (complète ou reduced-motion). */
export function clipStart(clip: ClipId, reduced: boolean): number {
  const times = reduced ? R : T
  if (clip === 'houston') return times.houston
  if (clip === 'houstonName') return times.name
  if (clip === 'speaker') return times.speaker
  return times.park
}

/** Changement d'affichage planifié : ligne du message ou sous-titre (index, −1 pour effacer). */
export type Cue = { at: number; index: number }

/** Lignes du message : affichage de chacune, puis effacement à la sortie du warp. */
export function lineCues(reduced: boolean): Cue[] {
  const times = reduced ? R : T
  const cues = times.lines.map((at, index) => ({ at, index }))
  cues.push({ at: times.warp, index: -1 })
  return cues
}

/**
 * Sous-titres (SUBTITLES) : affichage au début du clip + at, effacement à + end, sauf si le suivant
 * commence déjà (pas d'effacement qui écraserait le sous-titre suivant au même instant). Triés.
 */
export function subtitleCues(reduced: boolean): Cue[] {
  const shown = SUBTITLES.map((sub, index) => {
    const start = clipStart(sub.clip, reduced)
    return { index, at: start + sub.at, end: start + sub.end }
  }).sort((a, b) => a.at - b.at)
  const cues: Cue[] = []
  shown.forEach((sub, i) => {
    cues.push({ at: sub.at, index: sub.index })
    const next = shown[i + 1]
    if (!next || next.at > sub.end + 0.05) cues.push({ at: sub.end, index: -1 })
  })
  return cues
}

/** Dernier changement planifié avant `t` (saut de debug) : index affiché, −1 si aucun. */
export function cueAt(cues: readonly Cue[], t: number): number {
  let index = -1
  for (const cue of cues) {
    if (cue.at > t) break
    index = cue.index
  }
  return index
}

/** Fin de frappe de la ligne i de `lines` (repère + durée de frappe), pour les tests. */
export function lineTypedAt(lines: readonly string[], i: number, reduced: boolean): number {
  const times = reduced ? R : T
  const text = lines[i] ?? ''
  return (times.lines[i] ?? 0) + (reduced ? 0 : typingDuration(text))
}
