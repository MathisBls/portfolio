// Easter egg v3, beat 8 (consigne : « instancing partout où c'est répété ») : un nœud (vaisseau, wagon,
// cabine, carte, cadre d'écran) devient une InstancedMesh par maillage, géométrie ramenée dans le repère
// du nœud ; une instance = une matrice. Le nombre de draw calls ne dépend plus du nombre d'exemplaires.
import {
  Box3,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
  Vector3,
} from 'three'

export type Instanced = {
  meshes: InstancedMesh[]
  /** Boîte englobante du nœud dans son propre repère (unités du modèle). */
  size: Vector3
  center: Vector3
  dispose: () => void
}

const inverse = new Matrix4()
const relative = new Matrix4()

/**
 * Instancie `node` en `count` exemplaires. `prepare` reçoit chaque matériau source (une fois) et renvoie
 * celui à utiliser (clone réglé) ; les matériaux renvoyés sont libérés par dispose s'ils sont nouveaux.
 */
export function instanceNode(
  node: Object3D,
  count: number,
  prepare: (material: Material) => Material = (m) => m,
): Instanced {
  node.updateWorldMatrix(true, true)
  inverse.copy(node.matrixWorld).invert()
  const owned: { dispose: () => void }[] = []
  const materials = new Map<Material, Material>()
  const box = new Box3()
  const meshes: InstancedMesh[] = []
  node.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const source = child as Mesh
    const first = Array.isArray(source.material) ? source.material[0] : source.material
    if (!first) return
    relative.multiplyMatrices(inverse, source.matrixWorld)
    const geometry = source.geometry.clone().applyMatrix4(relative)
    geometry.computeBoundingBox()
    if (geometry.boundingBox) box.union(geometry.boundingBox)
    owned.push(geometry)
    let material = materials.get(first)
    if (!material) {
      material = prepare(first)
      materials.set(first, material)
      if (material !== first) owned.push(material)
    }
    const instanced = new InstancedMesh(geometry, material, count)
    instanced.name = source.name
    instanced.frustumCulled = false
    meshes.push(instanced)
  })
  return {
    meshes,
    size: box.getSize(new Vector3()),
    center: box.getCenter(new Vector3()),
    dispose: () => {
      meshes.forEach((m) => {
        m.dispose()
      })
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Écrit la matrice de l'exemplaire `index` dans toutes les pièces. */
export function setInstance(target: Instanced, index: number, matrix: Matrix4): void {
  for (const mesh of target.meshes) mesh.setMatrixAt(index, matrix)
}

/** Nombre d'exemplaires dessinés et envoi des matrices au GPU. */
export function commitInstances(target: Instanced, count: number): void {
  for (const mesh of target.meshes) {
    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
  }
}

/** Visibilité de toutes les pièces. */
export function showInstances(target: Instanced, visible: boolean): void {
  for (const mesh of target.meshes) mesh.visible = visible
}
