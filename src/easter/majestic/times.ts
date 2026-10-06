// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, tableau « Séquence ») : repères
// de temps du second niveau (s depuis le déclenchement), partagés par la timeline, la caméra, le HUD et le
// saut de debug. Source de vérité. Tous les beats en musique dérivent des repères mesurés de
// MajesticBTV (MAJESTIC_MARKS, music.ts, agent A2) : des expressions, jamais des nombres recopiés.
// - Beat 0 (Accès, 3 s) : ACCESS GRANTED tapé dans le HUD, précompilation masquée par le texte, le B du
//   parc se contracte en un point, la musique du parc s'éteint en fondu puis silence.
// - Beats 1 à 7 : de MAJESTIC_MARKS. La montagne (beat 4, « plein orchestre ») part au repère
//   `orchestra` (retour du tutti), ou à défaut aux 2/5 de l'intervalle séisme -> chœur. Les rampes du
//   séisme (beat 3) tombent sur les coups sourds du break (MAJESTIC_QUAKE_HITS). La sortie (beat 7)
//   couvre la cadence finale (`end`) ; le noir se fait sur la résonance de l'accord final (`final`).
// - Fin : noir, THANKS FOR PLAYING, retour à la page après la dernière note.
import { MAJESTIC, MAJESTIC_MARKS, MAJESTIC_QUAKE_HITS } from './music'

/** Repères de MajesticBTV (s depuis le début du clip), lus avec leurs champs optionnels. */
type Marks = {
  rise: number
  quake: number
  choir: number
  climax: number
  end: number
  beat?: number
  orchestra?: number
  final?: number
}
const MARKS: Marks = MAJESTIC_MARKS

/** Beat 0 : du déclenchement au départ de la musique (s). */
export const ACCESS_TIME = 3
/** Frappe de ACCESS GRANTED dans le HUD (s), puis précompilation sous le texte affiché. */
export const ACCESS_TYPING = 0.95
/** Fondu de la musique du parc (s), suivi d'un silence jusqu'au départ de MajesticBTV. */
export const PARK_FADE = 1.6
/** Part de l'intervalle séisme -> chœur où la montagne sort, sans repère `orchestra` mesuré. */
const MOUNTAIN_SHARE = 0.4
/** Fondu au noir sur l'accord final (s), puis tenue de THANKS FOR PLAYING (s). */
export const BLACKOUT = 2.4
export const THANKS_HOLD = 4.6

const MUSIC = ACCESS_TIME
const mountain = MARKS.orchestra ?? MARKS.quake + MOUNTAIN_SHARE * (MARKS.choir - MARKS.quake)
/** Accord final (ou, sans repère, 4 s après le début de la cadence) : le noir commence là. */
const final = MARKS.final ?? Math.min(MARKS.end + 4, MAJESTIC.duration - BLACKOUT)
const END = MUSIC + final + BLACKOUT

/** Repères du second niveau (s depuis le déclenchement). */
export const MT = {
  /** Beat 0 : frappe du HUD, précompilation, contraction du B du parc, fondu de sa musique. */
  access: 0,
  warm: ACCESS_TYPING + 0.1,
  collapse: ACCESS_TYPING + 0.25,
  music: MUSIC,
  /** Beat 1 : entrée atmosphérique (intro calme). */
  entry: MUSIC,
  /** Beat 2 : la plaine (montée). */
  plain: MUSIC + MARKS.rise,
  /** Beat 3 : le séisme (percussions). */
  quake: MUSIC + MARKS.quake,
  /** Beat 4 : la montagne (plein orchestre). */
  mountain: MUSIC + mountain,
  /** Beat 5 : le chœur (entrée des chœurs). */
  choir: MUSIC + MARKS.choir,
  /** Beat 6 : le prisme (climax). */
  prism: MUSIC + MARKS.climax,
  /** Beat 7 : sortie au-dessus des nuages (cadence finale). */
  exit: MUSIC + MARKS.end,
  /** Accord final : le fondu au noir commence. */
  final: MUSIC + final,
  /** Noir complet sur la résonance de l'accord, puis le message et le retour à la page. */
  end: END,
  thanks: END + 0.3,
  back: Math.max(END + THANKS_HOLD, MUSIC + MAJESTIC.duration + 0.4),
} as const

/** Période du tempo (s) si mesurée, 0 sinon (pulsations lentes des lueurs). */
export const MAJESTIC_BEAT = MARKS.beat ?? 0

/** Rampes du séisme (s du second niveau) : les coups sourds du break, entre `quake` et `orchestra`. */
export const QUAKE_HITS: readonly number[] = MAJESTIC_QUAKE_HITS.filter(
  (hit) => hit > MARKS.quake && hit < mountain,
).map((hit) => MUSIC + hit)

/** Durées des beats, dans l'ordre du storyboard (tests et réglages). */
export function beatDurations(): Record<
  'entry' | 'plain' | 'quake' | 'mountain' | 'choir' | 'prism' | 'exit',
  number
> {
  return {
    entry: MT.plain - MT.entry,
    plain: MT.quake - MT.plain,
    quake: MT.mountain - MT.quake,
    mountain: MT.choir - MT.mountain,
    choir: MT.prism - MT.choir,
    prism: MT.exit - MT.prism,
    exit: MT.end - MT.exit,
  }
}

/** Temps de MajesticBTV (s) à l'instant t du second niveau, négatif avant son départ. */
export function musicTime(t: number): number {
  return t - MT.music
}
