// Position du prisme sur la timeline, source unique pour Prism, PrismLook et ShardField.
// docs/storyboards/story-v2.md :
// - Beat Work : « La caméra descend en suivant les rayons ; le prisme sort par le haut ; le rayon du
//   projet actif vise son objet ». Une fois levé (projects 0 → 0.15, lib/journey.ts), le prisme suit la
//   descente de la caméra juste au-dessus du cadre (ABOVE) : le rayon actif entre toujours par le haut,
//   avec la même géométrie à l'écran qu'avant la descente.
// - Beat « Contact (arrivée) : le prisme redescend dans le cadre, vide » : il descend (contact 0 → 0.5)
//   jusqu'à CONTACT_Y, au fond de la descente de la caméra.
import { JOURNEY, liftT } from '../lib/journey'
import { type Vec3, lerp, range, sampleKeyframes } from '../lib/math'
import { CAMERA_PATH, CONTACT_Y, OVERVIEW_Y } from './cameraPath'
import { getProgress, getTimeline } from './store'

/** Prisme levé : hauteur au-dessus du point visé par la caméra (3.4 au-dessus de la vue d'ensemble). */
const ABOVE = JOURNEY.riseY - OVERVIEW_Y
/** Le point de retour passe du hero au Contact pendant que le prisme est hors cadre (Projets). */
const HOME_SWITCH: readonly [number, number] = [1.2, 1.8]

const pose = { position: [0, 0, 0] as Vec3, lookAt: [0, 0, 0] as Vec3 }

/** Hauteur visée par la caméra (keyframes seules, sans la parallaxe du pointeur). */
export function cameraPathY(timeline: number = getTimeline()): number {
  sampleKeyframes(CAMERA_PATH, timeline, pose)
  return pose.lookAt[1]
}

/** 0 : prisme dans le cadre (hero, Contact) ; 1 : levé hors cadre en haut (Work → About). */
export const prismLift = () => liftT(getProgress('projects'), getProgress('contact'))

/** Présence du prisme au centre de l'image (1 − prismLift). */
export const prismPresence = () => 1 - prismLift()

/** Y monde du centre du prisme pour la frame. */
export function prismY(): number {
  const timeline = getTimeline()
  const home = CONTACT_Y * range(timeline, ...HOME_SWITCH)
  return lerp(home, cameraPathY(timeline) + ABOVE, prismLift())
}
