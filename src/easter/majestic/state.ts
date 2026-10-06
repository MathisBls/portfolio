// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Contrats ») : valeurs animées
// du second niveau, mutables et hors React, comme E (../state.ts) et P (../park/state.ts). La timeline
// (majestic/timeline.ts, D3) les écrit ; la caméra, la montagne, le chœur et le prisme (D3) ainsi que
// l'environnement (env/, D4) les lisent dans useFrame (jamais de setState par frame). Valeurs 0 -> 1
// sauf mention contraire. resetMajestic() repart de l'état initial (au déclenchement et à la sortie).
import { E, SHOT } from '../state'

export type MajesticState = {
  /** Secondes depuis le déclenchement (saisie de « boulardtv ») : beat 0 au départ. */
  t: number
  /** Paliers, fixés au déclenchement. */
  reduced: boolean
  mobile: boolean
  bloom: boolean
  /** Beat 0 : « ACCESS GRANTED » tapé dans le HUD (part des lettres affichées). */
  access: number
  /** Beat 0 : le B du parc se contracte en un point de lumière. */
  collapse: number
  /** Beat 1 : plasma de l'entrée atmosphérique autour de la verrière. */
  entry: number
  /** Beat 2 : la plaine est visible (sortie des nuages). */
  plain: number
  /** Beat 3 : intensité du séisme (rampes, jamais de saut brusque). */
  quake: number
  /** Avancée des fissures sur le sol. */
  cracks: number
  /** Nuages de poussière levés. */
  dust: number
  /** Beat 4 : montée de la montagne (0 enfouie, 1 dressée). */
  rise: number
  /** Glissements de terrain sur ses flancs (cascades de sable, roches qui tombent). */
  slide: number
  /** Beat 5 : levée du chœur (0 sous terre, 1 debout). */
  choir: number
  /** Visages et mains du chœur allumés, faisceaux vers le sommet. */
  beams: number
  /** Beat 6 : ouverture des coques du sommet sur le prisme. */
  prism: number
  /** Spectre arc-en-ciel renvoyé par le prisme dans le ciel. */
  spectrum: number
  /** Le spectre se change en aurore. */
  aurora: number
  /** Le B sculpté sur la face de la montagne s'allume (climax). */
  sculpt: number
  /** Beat 7 : montée finale au-dessus des nuages. */
  outro: number
  /** Fondu au noir plein écran (fin, et transitions du reduced-motion). */
  fade: number
  /** Altitude de la caméra au-dessus de la plaine (m), écrite par EasterCamera (HUD). */
  altitude: number
  /** Amplitude courante du tremblement de caméra (rad), écrite par EasterCamera. */
  shake: number
}

function initial(reduced: boolean, mobile: boolean, bloom: boolean): MajesticState {
  return {
    t: 0,
    reduced,
    mobile,
    bloom,
    access: 0,
    collapse: 0,
    entry: 0,
    plain: 0,
    quake: 0,
    cracks: 0,
    dust: 0,
    rise: 0,
    slide: 0,
    choir: 0,
    beams: 0,
    prism: 0,
    spectrum: 0,
    aurora: 0,
    sculpt: 0,
    outro: 0,
    fade: 0,
    altitude: 0,
    shake: 0,
  }
}

export const M: MajesticState = initial(false, false, true)

export function resetMajestic(reduced: boolean, mobile: boolean, bloom: boolean): void {
  Object.assign(M, initial(reduced, mobile, bloom))
}

/** Le monde du second niveau est le plan courant (la timeline bascule E.shot sur SHOT.majestic). */
export function majesticOn(): boolean {
  return E.shot === SHOT.majestic
}
