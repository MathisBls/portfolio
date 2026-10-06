// Keyframes caméra sur la timeline getTimeline() (somme des progress de section) : hero [0, 1],
// projects [1, 2], services [2, 3], about [3, 4], contact [4, 5].
// - Hero (docs/storyboards/hero.md, colonne Caméra) : de (0, 0, 8) à (0, −1.5, 12).
// - docs/storyboards/story-v2.md, beat Work : « La caméra descend en suivant les rayons (plus de caméra
//   fixe) », jusqu'à About (« Calme ») : une seule descente adoucie de y −1.5 à CONTACT_VIEW_Y
//   (−6.5 unités), face à la scène. Un seul segment : sampleKeyframes adoucit chaque segment, plusieurs clés feraient
//   des arrêts à chaque section. Les objets ancrés se déprojettent avec la caméra courante : ils suivent.
// - Beat « Contact (arrivée) : le prisme redescend dans le cadre » : la caméra reste au fond de la
//   descente et se rapproche, (1.2, CONTACT_VIEW_Y, 8) qui regarde droit devant, atteint à contact
//   0.5 ; le prisme descend la rejoindre (prismPath.ts) et se pose PRISM_BELOW plus bas, dans le bas
//   du cadre : en fin de page, le faisceau de la rafale passe sous les coordonnées, pas à travers.
import type { CameraKey, Vec3 } from '../lib/math'

/** Hauteur de la vue d'ensemble à la fin du hero. */
export const OVERVIEW_Y = -1.5
/** Hauteur du prisme au Contact, et de la caméra (fond de la descente, fin d'About) un peu au-dessus. */
export const CONTACT_Y = -9
const PRISM_BELOW = 1
const CONTACT_VIEW_Y = CONTACT_Y + PRISM_BELOW

const overview = (y: number): Pick<CameraKey, 'position' | 'lookAt'> => ({
  position: [0, y, 12],
  lookAt: [0, y, 0],
})
const CONTACT: { position: Vec3; lookAt: Vec3 } = {
  position: [1.2, CONTACT_VIEW_Y, 8],
  lookAt: [1.2, CONTACT_VIEW_Y, 0],
}

export const CAMERA_PATH: readonly CameraKey[] = [
  { at: 0, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 0.55, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 1, ...overview(OVERVIEW_Y) },
  { at: 4, ...overview(CONTACT_VIEW_Y) },
  { at: 4.5, ...CONTACT },
  { at: 5, ...CONTACT },
]
