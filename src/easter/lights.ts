// Easter egg : intensités et couleurs des lumières par frame (EasterLights.tsx), sans allocation.
// Les variations restent lentes (bougies : petites oscillations ; aucun clignotement).
import {
  type Camera,
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
  follow: PointLight | null
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
const WHITE = new Color('#e9ecff')
const RED_GROUND = new Color('#2a0205')

const sway = (x: number) => Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1) * 0.4

export function updateLights(rig: LightRig, camera: Camera, time: number): void {
  const { hemi, key, follow, front } = rig
  const arena = E.shot === SHOT.arena
  const flight = E.shot === SHOT.flight
  const finale = E.shot === SHOT.finale
  const red = E.red
  if (hemi) {
    hemi.color.copy(SKY.sky).lerp(RED, flight || finale ? red * 0.8 : 0)
    hemi.groundColor.copy(SKY.ground).lerp(RED_GROUND, flight || finale ? red : 0)
    hemi.intensity = arena ? 0.35 + 0.35 * E.arena : flight ? 0.6 : finale ? 0.5 : 0.5
  }
  if (key) {
    key.intensity = arena ? 900 * E.arena : 0
    key.target.position.set(0, 0.4, 0.6)
    key.target.updateMatrixWorld()
  }
  if (follow) {
    // Pas de lumière sur la caméra au départ (reflet en plein centre sur le B brillant)
    follow.intensity = flight ? 30 * E.speed * E.speed : 0
    follow.color.copy(WHITE).lerp(RED, red)
    follow.position.copy(camera.position)
  }
  if (front) front.intensity = finale ? (E.bloom ? 2.2 : 1.1) : 0
  for (let i = 0; i < rig.ambience.length; i++) {
    const light = rig.ambience[i]
    const at = AMBIENCE_AT[i]
    if (!light || !at) continue
    light.position.set(at[0], at[1], at[2])
    const wave = i < 2 ? 0.88 + 0.12 * sway(time * 3 + i * 2) : 0.75 + 0.25 * Math.sin(time + i)
    light.intensity = arena ? (i < 2 ? 70 : 45) * E.arena * (E.reduced ? 1 : wave) : 0
  }
}
