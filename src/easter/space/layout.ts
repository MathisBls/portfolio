// Easter egg v3, beats 4 à 7 (docs/storyboards/easter-park.md) : mise en place de l'espace, en calcul pur
// (testé, layout.test.ts). La caméra reste près de l'origine et regarde vers −Z ; c'est la porte qui
// approche (sa distance dit où l'on en est) : rien d'autre n'est assez proche pour trahir le mouvement.
// - Beat 5 : la forme grossit très lentement. Sa taille apparente (inverse de la distance) suit E.shape
//   linéairement, de minuscule à « encore impossible à identifier », puis s'arrête.
// - Beat 6 : le bond l'amène devant nous (E.leap) ; beat 7 : on la traverse (E.enter).
// - Ciel : sphère et étoiles centrées sur la caméra, planète dans le coin haut gauche, soleil derrière elle.
import { Quaternion, Vector3 } from 'three'
import { lerp } from '../../lib/math'

/** Diamètre visé de l'anneau de la porte (unités), quelle que soit l'échelle du modèle. */
export const GATE_SIZE = 44

/** Distances de la porte : au loin, arrêtée (fin de la voix), devant nous après le bond, traversée. */
export const GATE_DISTANCE = { far: 820, hold: 330, near: 72, through: -14 } as const

/** Direction de la porte (légèrement au-dessus et à droite de l'axe, sur la Voie lactée). */
export const GATE_DIRECTION = new Vector3(0.05, 0.035, -1).normalize()

/** Orientation de la porte (face +Z du modèle tournée vers la caméra), fixe même une fois traversée. */
export const GATE_FACING = new Quaternion().setFromUnitVectors(
  new Vector3(0, 0, 1),
  GATE_DIRECTION.clone().negate(),
)

type GateProgress = { shape: number; leap: number; enter: number }

/** Distance caméra -> porte selon l'avancement des beats 5 à 7. */
export function gateDistance({ shape, leap, enter }: GateProgress): number {
  const { far, hold, near, through } = GATE_DISTANCE
  const size = lerp(1 / far, 1 / hold, shape)
  const drifting = 1 / size
  return lerp(lerp(drifting, near, leap), through, enter)
}

/** Distance affichée sur le HUD (km) pour une distance en unités : échelle fictive, grands nombres. */
export const HUD_KM_PER_UNIT = 1840

/** Rayon des sphères du ciel (dans le plan lointain de la caméra, 900). */
export const SKY_RADIUS = 700
export const STAR_RADIUS = 640

/** Planète dans le coin haut gauche (le bas est au cockpit) : centre, rayon, atmosphère (facteur). */
export const PLANET = { center: new Vector3(-480, 330, -440), radius: 255, atmosphere: 1.045 }

/** Direction du soleil vu de la planète : derrière elle, décalé vers le centre de l'écran (croissant). */
export const SUN = new Vector3()
  .copy(PLANET.center)
  .normalize()
  .add(new Vector3(0.82, -0.57, 0).multiplyScalar(0.42))
  .normalize()

/** Orientation de la Voie lactée (radians) : bande en diagonale, bulbe derrière la porte. */
export const SKY_ROTATION = [0.6, -Math.PI / 2 + 0.1, 0.55] as const
