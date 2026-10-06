// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md) : musique du second niveau,
// MajesticBTV (version épique de la musique du parc, faite par Mathis), montée à 2 min 08.
// Lecture : playClip('majestic', offset) de voice.ts, élément débloqué par unlockMajestic (audio.ts).
//
// Analyse de la source (MajesticBTV.mp3, 214.16 s, 48 kHz, mi bémol majeur, ≈ 134 bpm qui dérive à 137) :
// enveloppe RMS et énergie par bandes, onsets graves, tempo par peigne, accords (chroma), matrice
// d'autosimilarité. Le chœur est repéré à ses bandes larges et granuleuses en médium (500–1900 Hz,
// glissandos), là où cuivres et nappes tenues donnent des partiels fins. Repérage au signal, pas à l'oreille.
// - 0 → 6.7 : intro calme ; 6.7 : premier coup grave, le plein orchestre entre ; 16.7 : percussions lourdes.
// - 31 → 116.5 : thème, premier passage du chœur (66–84), développement.
// - 116.6 → 127 : break, coups sourds tous les 8 temps ; 126.9 : le tutti revient (cuivres tenus).
// - 146.8 : coup grave, reprise du thème ; 162.5 : le chœur entre en plein (crash, glissando des voix).
// - 176 → 190.8 : tutti le plus dense ; 190.8 : plus gros coup grave, arrivée sur la tonique, coda.
// - 205.2 : cadence plagale finale (la bémol → mi bémol) ; 209.3 : accord final ; fondu 212.4 → 214.
// La seconde moitié (≈ 142–175) reprend la première (≈ 47–80) avec un décalage de 95.4 s.
//
// Montage (temps source) : une seule coupe, sur le premier temps du break.
// - Gardé : 0.15 → 31.17 (intro, montée, premières percussions). Les 0.15 s de silence de tête sont rognées.
// - Coupé : 31.17 → 116.575 (85.4 s : thème, premier passage du chœur, développement, repris plus loin).
// - Gardé : 116.575 → 214.0 (break et grondements, retour du tutti, chœur, climax, coda, cadence, fin).
// - Raccord : fondu enchaîné à puissance constante de 120 ms, fini juste avant le coup sourd qui ouvre le
//   break (couvre le raccord), temps contre temps. Vérifié sur l'enveloppe (fenêtres de 50 ms) : pas de
//   trou ni de saut (−22 à −17 dBFS, comme autour), intervalle entre temps 0.442 s au raccord.
// - Fin : fondu en demi-cosinus de 212.2 à 214.0 (la source finit sur un clic à 214.1). Entrée : 10 ms.
// - Gain linéaire +1.1 dB : −16.0 LUFS intégrés, crête vraie −5.3 dBTP. MP3 CBR 160 kb/s (débit
//   constant : saut à l'offset exact), 48 kHz stéréo, 2.57 Mo.
// Repères mesurés sur le fichier final décodé (onsets graves par enveloppe de 10 ms, temps du tempo).
import { MAJESTIC_SRC } from '../audio'

/** Clip du Sanctuaire : `duration`, durée décodée exacte (6 165 360 échantillons à 48 kHz, délai LAME retiré). */
export const MAJESTIC = { src: MAJESTIC_SRC, duration: 128.445 } as const

/**
 * Repères (s depuis le début du clip), dans l'ordre du storyboard. Entre parenthèses, le temps source.
 * - `rise` : la montée. L'intro calme enfle et le plein orchestre entre sur un coup grave (6.73).
 * - `quake` : les percussions lourdes s'installent (16.70).
 * - `orchestra` : après les coups sourds du break, gros coup grave et retour du tutti (126.89).
 * - `choir` : le chœur entre en plein, crash et glissando des voix ; moment le plus fort du clip (162.46).
 * - `climax` : le plus gros impact avant l'accord final, coup grave qui pose la tonique (190.79).
 * - `end` : début de la cadence finale (plagale, la bémol → mi bémol, sans batterie) (205.24).
 * - `final` : accord final, puis résonance et fondu jusqu'à la fin du clip (209.30).
 * - `beat` : période du tempo (≈ 135 bpm ; 0.447 s avant la coupe, 0.435 à 0.445 s après).
 */
export const MAJESTIC_MARKS = {
  rise: 6.58,
  quake: 16.58,
  orchestra: 41.33,
  choir: 76.9,
  climax: 105.24,
  end: 119.68,
  final: 123.74,
  beat: 0.443,
} as const

/**
 * Coups sourds du break (s depuis le début du clip), tous les 8 temps, entre `quake` et `orchestra` : les
 * rampes du séisme. Le premier est celui du raccord.
 */
export const MAJESTIC_QUAKE_HITS: readonly number[] = [31.01, 34.32, 37.83]
