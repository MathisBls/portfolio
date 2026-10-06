// Easter egg v3, beat 8 (consigne de Mathis : « rayons crépusculaires et léger lens flare quand le soleil
// passe derrière une planète ») : occultation du soleil par les planètes, en calcul pur et analytique
// (sphères connues : pas de lecture de pixels ni de requête GPU). Sans allocation.
import { Vector3 } from 'three'
import { clamp } from '../../lib/math'
import { CARD_PLANET, GIANT, MONUMENT, MOON, PARK_ORIGIN, type V3 } from './layout'

type Sphere = { center: Vector3; radius: number }

const world = (p: V3) => new Vector3(...p).add(new Vector3(...PARK_ORIGIN))

/** Planètes (et le B, approché par une sphère) qui peuvent cacher le soleil. */
const OCCLUDERS: readonly Sphere[] = [
  { center: world(GIANT.center), radius: GIANT.radius },
  { center: world(MOON.center), radius: MOON.radius },
  { center: world(CARD_PLANET.center), radius: CARD_PLANET.radius },
  { center: world(MONUMENT.center), radius: MONUMENT.scale * 0.6 },
]

export type SunState = {
  /** Part visible du disque solaire (0 caché, 1 entier). */
  visible: number
  /** Soleil caché juste derrière un limbe (0 -> 1) : rayons crépusculaires. */
  limb: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const toCenter = new Vector3()

/** Visibilité du soleil (direction `sun`, unitaire) depuis `eye` (monde). */
export function sunVisibility(eye: Vector3, sun: Vector3, out: SunState): SunState {
  out.visible = 1
  out.limb = 0
  for (const sphere of OCCLUDERS) {
    toCenter.subVectors(sphere.center, eye)
    const d = toCenter.length()
    if (d <= sphere.radius) continue
    const angular = Math.asin(sphere.radius / d)
    const separation = Math.acos(clamp(toCenter.dot(sun) / d, -1, 1))
    const shown = smooth(angular - 0.004, angular + 0.012, separation)
    out.visible *= shown
    const near = 1 - smooth(0, 0.22, angular - separation)
    out.limb = Math.max(out.limb, (1 - shown) * near)
  }
  return out
}
