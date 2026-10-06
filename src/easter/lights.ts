// Easter egg : intensités et couleurs des lumières par frame (EasterLights.tsx), sans allocation.
// Les variations restent lentes (bougies : petites oscillations ; aucun clignotement). Espace (beats 4 à
// 7, docs/storyboards/easter-park.md) : soleil derrière la porte (contre-jour : liserés sur l'anneau et
// les montants du cockpit), lueur froide du ciel sur le cockpit, puis lumière rose de la porte allumée.
import {
  Color,
  type DirectionalLight,
  type HemisphereLight,
  type PointLight,
  type SpotLight,
} from 'three'
import { E, SHOT } from './state'

export type LightRig = {
  hemi: HemisphereLight | null
  key: SpotLight | null
  /** Route : clé venue de derrière la caméra, éclaire les projets qui arrivent ; espace : rose de la porte. */
  road: DirectionalLight | null
  /** Espace : le soleil, derrière la porte. */
  front: DirectionalLight | null
  /** Bougies gauche et droite, cristaux rose et bleu (desktop). */
  ambience: PointLight[]
}

const AMBIENCE_AT: readonly (readonly [number, number, number])[] = [
  [-9.2, 2.6, 0],
  [10.6, 2.6, 1],
  [-10.8, 3.4, -6],
  [-10.8, 3.4, 6],
]

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
  else if (shot === SHOT.arena) hemi.intensity = 0.35 + 0.35 * E.arena
  else hemi.intensity = shot === SHOT.road ? 0.6 : 0.5
}

export function updateLights(rig: LightRig, time: number): void {
  const { hemi, key, road, front } = rig
  const arena = E.shot === SHOT.arena
  if (hemi) updateHemi(hemi)
  if (key) {
    key.intensity = arena ? 900 * E.arena : 0
    key.target.position.set(0, 0.4, 0.6)
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
    const wave = i < 2 ? 0.88 + 0.12 * sway(time * 3 + i * 2) : 0.75 + 0.25 * Math.sin(time + i)
    light.intensity = arena ? (i < 2 ? 70 : 45) * E.arena * (E.reduced ? 1 : wave) : 0
  }
}
