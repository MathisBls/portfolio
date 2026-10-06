// Cibles des objets ancrés aux emplacements des projets (docs/storyboards/projects.md §7) : position
// monde du centre de l'emplacement (mesure live du DOM, déprojetée sur le plan z = 0), taille de
// l'emplacement en monde, boîte de l'objet dessiné. Lues par l'objet (useAnchoredObject) et par le
// prisme pour viser l'objet actif (rayPath, prismFocus). Aucune allocation par frame.
import type { RootState } from '@react-three/fiber'
import type { Box3} from 'three';
import { type Camera, Vector3 } from 'three'
import { slotCenter } from '../../lib/projects'
import { getAnchorMetrics, getProgress } from '../store'

/**
 * Cible des rayons du prisme, une par objet monté : centre de l'emplacement sur le plan z = 0 (monde),
 * boîte monde de l'objet tel qu'il est dessiné (géométries transformées, animation comprise ; vide hors
 * écran : le rayon s'arrête sur son bord), taille de l'emplacement (monde).
 */
export type AnchoredTarget = {
  position: Vector3
  bounds: Box3
  visible: boolean
  slotWidth: number
  slotHeight: number
}

export const targets = new Map<string, AnchoredTarget>()

// Vecteurs de travail partagés (les useFrame s'exécutent l'un après l'autre)
const origin = new Vector3()
const edgeA = new Vector3()
const edgeB = new Vector3()

/** Point écran (px CSS) → intersection du rayon caméra avec le plan z = 0. */
function toPlane(camera: Camera, size: RootState['size'], x: number, y: number, out: Vector3) {
  out.set((x / size.width) * 2 - 1, 1 - (y / size.height) * 2, 0.5).unproject(camera)
  out.sub(origin)
  const t = Math.abs(out.z) < 1e-6 ? 0 : -origin.z / out.z
  return out.multiplyScalar(t).add(origin)
}

/**
 * Recalcule la cible d'un objet pour la frame courante (caméra posée par CameraRig, progress et mesures
 * du DOM) et la renvoie. Appelé par l'objet et par le prisme : aucun des deux ne dépend de l'ordre des
 * useFrame. undefined si l'objet n'est pas monté.
 */
export function measureTarget(
  slug: string,
  state: RootState,
): Readonly<AnchoredTarget> | undefined {
  return measure(slug, state)
}

/** measureTarget, cible modifiable : l'objet y écrit sa boîte (bounds). */
export function measure(slug: string, state: RootState): AnchoredTarget | undefined {
  const target = targets.get(slug)
  if (!target) return undefined
  const id = `project:${slug}` as const
  const p = getProgress(id)
  const m = getAnchorMetrics(id)
  target.visible = m !== undefined && m.width > 0 && p > 0 && p < 1
  if (!m || !target.visible) return target

  const { camera, size } = state
  camera.updateMatrixWorld()
  origin.setFromMatrixPosition(camera.matrixWorld)
  const cx = m.left + m.width / 2
  const cy = slotCenter(m)
  target.slotWidth = toPlane(camera, size, m.left, cy, edgeA).distanceTo(
    toPlane(camera, size, m.left + m.width, cy, edgeB),
  )
  target.slotHeight = toPlane(camera, size, cx, cy - m.height / 2, edgeA).distanceTo(
    toPlane(camera, size, cx, cy + m.height / 2, edgeB),
  )
  toPlane(camera, size, cx, cy, target.position)
  return target
}
