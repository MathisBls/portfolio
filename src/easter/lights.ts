// Easter egg : intensités et couleurs des lumières par frame (EasterLights.tsx), sans allocation.
// Les variations restent lentes (bougies : petites oscillations ; aucun clignotement).
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
  /** Route : clé venue de derrière la caméra, éclaire les projets qui arrivent. */
  road: DirectionalLight | null
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
const RED = new Color('#ff1a24')
const WHITE = new Color('#f2efff')
const RED_GROUND = new Color('#2a0205')

const sway = (x: number) => Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1) * 0.4

/** Hémisphère : la lumière se resserre pendant le zoom, vire au rouge sur la route et au final. */
function updateHemi(hemi: HemisphereLight) {
  const shot = E.shot
  const tinted = shot === SHOT.road || shot === SHOT.finale
  hemi.color.copy(SKY.sky).lerp(RED, tinted ? E.red * 0.8 : 0)
  hemi.groundColor.copy(SKY.ground).lerp(RED_GROUND, tinted ? E.red : 0)
  if (shot === SHOT.sky) hemi.intensity = 0.5 * (1 - 0.75 * E.focus)
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
  if (road) {
    road.intensity = E.shot === SHOT.road ? (E.bloom ? 2.4 : 1.6) : 0
    road.color.copy(WHITE).lerp(RED, 0.6 * E.red)
  }
  if (front) front.intensity = E.shot === SHOT.finale ? (E.bloom ? 2.2 : 1.1) : 0
  for (let i = 0; i < rig.ambience.length; i++) {
    const light = rig.ambience[i]
    const at = AMBIENCE_AT[i]
    if (!light || !at) continue
    light.position.set(at[0], at[1], at[2])
    const wave = i < 2 ? 0.88 + 0.12 * sway(time * 3 + i * 2) : 0.75 + 0.25 * Math.sin(time + i)
    light.intensity = arena ? (i < 2 ? 70 : 45) * E.arena * (E.reduced ? 1 : wave) : 0
  }
}
