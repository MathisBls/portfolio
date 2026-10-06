// Easter egg, arène : regroupement en InstancedMesh des maillages répétés de arena.glb (colonnes,
// rideaux, projecteurs, chandeliers, flammes, jetons, pions). Dans Blender ce sont des doublons liés :
// le GLB n'a qu'un maillage par modèle, référencé par plusieurs nœuds, et GLTFLoader en fait des Mesh
// qui partagent géométrie et matériau. Ici, chaque couple (géométrie, matériau) répété devient un seul
// InstancedMesh (un appel de dessin par matériau au lieu d'un par objet). Teinte par instance (jetons) :
// extras glTF `tint` du nœud, appliquée seulement aux matériaux choisis (instanceColor).
import { Color, InstancedMesh, type Material, Matrix4, Mesh, type Object3D } from 'three'
import { meshesOf } from '../models'

export type InstanceGroup = {
  mesh: InstancedMesh
  /** Nom du premier nœud source (ex. Arena_Flame_00) : identifie le modèle. */
  source: string
}

const tintOf = (object: Object3D): string | null => {
  const own: unknown = object.userData.tint
  if (typeof own === 'string') return own
  const parent: unknown = object.parent?.userData.tint
  return typeof parent === 'string' ? parent : null
}

/** Nom du nœud glTF d'un maillage (le groupe parent pour un maillage multi-matériaux). */
const nodeName = (mesh: Mesh): string =>
  mesh.parent && !(mesh.parent instanceof Mesh) && mesh.parent.name.startsWith('Arena_')
    ? mesh.parent.name
    : mesh.name

/**
 * Remplace, sous `root`, les maillages qui partagent la même géométrie et le même matériau (au moins
 * `min` fois) par un InstancedMesh ajouté à `root`. `tinted(material)` : matériaux qui prennent la
 * teinte `tint` des nœuds. Renvoie les groupes créés.
 */
export function instanceShared(
  root: Object3D,
  tinted: (material: Material) => boolean,
  min = 2,
): InstanceGroup[] {
  root.updateMatrixWorld(true)
  const inverse = root.matrixWorld.clone().invert()
  const groups = new Map<string, Mesh[]>()
  for (const mesh of meshesOf(root)) {
    const material = mesh.material
    if (mesh instanceof InstancedMesh || Array.isArray(material)) continue
    const key = `${mesh.geometry.uuid}|${material.uuid}`
    const list = groups.get(key)
    if (list) list.push(mesh)
    else groups.set(key, [mesh])
  }
  const out: InstanceGroup[] = []
  const matrix = new Matrix4()
  const color = new Color()
  const emptied = new Set<Object3D>()
  for (const meshes of groups.values()) {
    const first = meshes[0]
    if (!first || meshes.length < min || Array.isArray(first.material)) continue
    const material = first.material
    const source = nodeName(first)
    const instanced = new InstancedMesh(first.geometry, material, meshes.length)
    const tint = tinted(material)
    meshes.forEach((mesh, i) => {
      matrix.multiplyMatrices(inverse, mesh.matrixWorld)
      instanced.setMatrixAt(i, matrix)
      if (tint) instanced.setColorAt(i, color.set(tintOf(mesh) ?? '#ffffff'))
      if (mesh.parent) emptied.add(mesh.parent)
      mesh.removeFromParent()
    })
    instanced.name = `${source}_Instances`
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    instanced.computeBoundingSphere()
    root.add(instanced)
    out.push({ mesh: instanced, source })
  }
  // Nœuds multi-matériaux vidés : retirés
  emptied.forEach((node) => {
    if (node !== root && node.children.length === 0) node.removeFromParent()
  })
  return out
}
