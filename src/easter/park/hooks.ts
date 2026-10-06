// Easter egg v3, beat 8 : état partagé des composants du parc.
// - parkOn : le parc est le plan courant (E.shot === SHOT.park), ou forcé par le prop `active`.
// - shouldLoad : moment de créer les vidéos des écrans (paresseuses) : dès l'espace (beats 4 à 7).
import { E, SHOT } from '../state'
import { inPark } from './state'

/** Le parc est affiché : plan courant, ou forcé (`active`, page de test). */
export function parkOn(active: boolean | undefined): boolean {
  return active ?? inPark()
}

/** Les vidéos des écrans se préparent dès l'espace (beats 4 à 7), longs et calmes. */
export function shouldLoad(active: boolean | undefined): boolean {
  return active === true || E.shot === SHOT.space || E.shot === SHOT.park
}
