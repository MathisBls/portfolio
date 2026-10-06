// Easter egg : intensités et couleurs des lumières par frame (EasterLights.tsx), sans allocation.
// Les variations restent lentes (bougies : petites oscillations ; aucun clignotement). Espace (beats 4 à
// 7, docs/storyboards/easter-park.md) : soleil derrière la porte (contre-jour : liserés sur l'anneau et
// les montants du cockpit), lueur froide du ciel sur le cockpit, puis lumière rose de la porte allumée.
// Second niveau (docs/storyboards/easter-majestic.md) : les mêmes lumières, réglées par majestic/lights.ts.
import {
  Color,
  type DirectionalLight,
  type HemisphereLight,
  type PointLight,
  type SpotLight,
} from 'three'
import { range } from '../lib/math'
import { arenaLight } from './arena/ramps'
import { updateMajesticLights } from './majestic/lights'
import { E, SHOT } from './state'

export type LightRig = {
  hemi: HemisphereLight | null
  key: SpotLight | null
  /** Route : clé venue de derrière la caméra, éclaire les projets qui arrivent ; espace : rose de la porte. */
  road: DirectionalLight | null
  /** Espace : le soleil, derrière la porte. */
  front: DirectionalLight | null
  /** Arène (desktop) : lueur chaude des chandeliers côté joueur, contre-jour rose au fond. */
  ambience: PointLight[]
}

/** Positions (salon de jeu, arena.glb) et intensités de pointe des lumières d'ambiance. */
const AMBIENCE_AT: readonly (readonly [number, number, number])[] = [
  [0, 5, 11],
  [0, 5, -15],
]
const AMBIENCE_PEAK = [110, 190] as const

const SKY = { sky: new Color('#4b3a78'), ground: new Color('#120a10') }
const SPACE = { sky: new Color('#24304f'), ground: new Color('#050407') }
const SUN = new Color('#fff4e6')
const PINK = new Color('#ff8fc8')
const RED = new Color('#ff1a24')
const WHITE = new Color('#f2efff')
const RED_GROUND = new Color('#2a0205')

const sway = (x: number) => Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1) * 0.4

/** Hémisphère : la lumière se resserre pendant le zoom, vire au rouge sur la route et au final. */
function updateHemi(hemi: HemisphereLight) {
  const shot = E.shot
  const tinted = shot === SHOT.road
  const space = shot === SHOT.space || shot === SHOT.park
  hemi.color.copy(space ? SPACE.sky : SKY.sky).lerp(RED, tinted ? E.red * 0.8 : 0)
  hemi.groundColor.copy(space ? SPACE.ground : SKY.ground).lerp(RED_GROUND, tinted ? E.red : 0)
  if (space) hemi.intensity = shot === SHOT.space ? 0.05 + 0.45 * E.gate : 0.5
  else if (shot === SHOT.sky) hemi.intensity = 0.5 * (1 - 0.75 * E.focus)
  else if (shot === SHOT.arena) hemi.intensity = 0.1 + 0.18 * E.arena
  else hemi.intensity = shot === SHOT.road ? 0.6 : 0.5
}

export function updateLights(rig: LightRig, time: number): void {
  const { hemi, key, road, front } = rig
  if (E.shot === SHOT.majestic) {
    // Second niveau : soleil couchant et ciel (majestic/lights.ts), le reste éteint
    if (key) key.intensity = 0
    rig.ambience.forEach((light) => {
      light.intensity = 0
    })
    updateMajesticLights(hemi, front, road)
    return
  }
  const arena = E.shot === SHOT.arena
  if (hemi) updateHemi(hemi)
  if (key) {
    // Plafonnier : s'allume en dernier, au-dessus de la table (arena/ramps.ts)
    key.intensity = arena ? 1500 * arenaLight(E.arena).key : 0
    key.target.position.set(0, 0.42, 1.2)
    key.target.updateMatrixWorld()
  }
  const space = E.shot === SHOT.space
  if (road) {
    // Route : clé de derrière la caméra ; espace : la lumière rose de la porte allumée, de face
    if (space) {
      road.intensity = 0.9 * E.gate
      road.color.copy(PINK)
      road.position.set(0, 6, 30)
    } else {
      road.intensity = E.shot === SHOT.road ? (E.bloom ? 2.4 : 1.6) * (1 - E.roadDim) : 0
      road.color.copy(WHITE).lerp(RED, 0.6 * E.red)
      road.position.set(10, 16, 40)
    }
  }
  if (front) {
    // Espace : le soleil, loin derrière la porte (contre-jour) ; éteinte ailleurs
    front.intensity = space ? 1.8 : 0
    front.color.copy(SUN)
    front.position.set(280, 190, -900)
  }
  for (let i = 0; i < rig.ambience.length; i++) {
    const light = rig.ambience[i]
    const at = AMBIENCE_AT[i]
    if (!light || !at) continue
    light.position.set(at[0], at[1], at[2])
    // Bougies : vacillement lent (< 1 Hz) ; contre-jour : constant
    const wave = i === 0 ? 0.92 + 0.08 * sway(time * 2.2) : 1
    const on = i === 0 ? range(E.arena, 0.3, 0.8) : range(E.arena, 0.12, 0.55)
    light.intensity = arena ? (AMBIENCE_PEAK[i] ?? 0) * on * (E.reduced ? 1 : wave) : 0
  }
}
