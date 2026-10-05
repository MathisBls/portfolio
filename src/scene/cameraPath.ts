// Keyframes caméra sur la timeline getTimeline() (somme des progress de section) : hero [0, 1],
// projects [1, 2], services [2, 3], about [3, 4], contact [4, 5].
// - Hero (docs/storyboards/hero.md, colonne Caméra) : de (0, 0, 8) à (0, −1.5, 12).
// - Projets (docs/storyboards/projects.md §2) : « caméra fixe » ; Services (services-contact.md §2,
//   2.0–2.7) et À propos (about-legal.md §2) : fixe aussi. Clés identiques de 1 à 4.
// - Contact (services-contact.md §2, 3.5 décalé de +1 par About) : (1.2, 0, 8) qui regarde (1.2, 0, 0),
//   atteint à contact 0.5, en même temps que le prisme redescend au centre.
import type { CameraKey, Vec3 } from '../lib/math'

const OVERVIEW: Pick<CameraKey, 'position' | 'lookAt'> = {
  position: [0, -1.5, 12],
  lookAt: [0, -1.5, 0],
}
const CONTACT: { position: Vec3; lookAt: Vec3 } = { position: [1.2, 0, 8], lookAt: [1.2, 0, 0] }

export const CAMERA_PATH: readonly CameraKey[] = [
  { at: 0, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 0.55, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 1, ...OVERVIEW },
  { at: 2, ...OVERVIEW },
  { at: 3, ...OVERVIEW },
  { at: 4, ...OVERVIEW },
  { at: 4.5, ...CONTACT },
  { at: 5, ...CONTACT },
]
