// Easter egg, arène : allumage progressif de la salle, piloté par E.arena (0 -> 1 en 4 s, timeline.ts,
// beat 2 ; 1 d'emblée en reduced-motion). Dans l'ordre : le filet rose sous la table et le néon du
// médaillon, puis les projecteurs des colonnes deux par deux depuis le fond de la salle, les bougies des
// chandeliers une à une, et enfin le plafonnier sur la table (faisceau, poussière). Rampes douces, une
// seule fois chacune : aucun clignotement.
import { easeInOut, range } from '../../lib/math'
import { COLUMNS, columnAngle } from './materials'

export type ArenaLight = {
  /** Filet lumineux sous la table, néon du médaillon. */
  led: number
  /** Gemmes des écussons et des pions. */
  crystals: number
  /** Plafonnier : projecteur, faisceau, poussière. */
  key: number
  /** Liserés des emplacements, au repos. */
  slots: number
}

const out: ArenaLight = { led: 0, crystals: 0, key: 0, slots: 0 }

const ramp = (light: number, from: number, to: number) => easeInOut(range(light, from, to))

/** Rampes de l'allumage pour E.arena = light (objet réutilisé, aucune allocation). */
export function arenaLight(light: number): ArenaLight {
  out.led = ramp(light, 0, 0.22)
  out.crystals = ramp(light, 0.2, 0.6)
  out.key = ramp(light, 0.5, 1)
  out.slots = ramp(light, 0.7, 1)
  return out
}

/** Rang d'allumage de la colonne k : 0 au fond de la salle (côté adverse, -z), 5 côté joueur. */
const ORDER = Array.from({ length: COLUMNS }, (_, k) => {
  const deg = (columnAngle(k) * 180) / Math.PI
  const fromBack = Math.abs(((deg - 270 + 540) % 360) - 180)
  return Math.floor(fromBack / 30)
})

/** Projecteur de la colonne k. */
export function columnOn(light: number, k: number): number {
  const o = ORDER[k] ?? 0
  return ramp(light, 0.12 + 0.07 * o, 0.32 + 0.07 * o)
}

/** Bougie j (sur `count`), allumées une à une. */
export function flameOn(light: number, j: number, count: number): number {
  const step = 0.46 / Math.max(1, count)
  return ramp(light, 0.3 + step * j, 0.38 + step * j)
}
