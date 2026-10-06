// Easter egg v3, beat 8 : pièces du parc, sans React. Chaque nœud du contrat (types.ts, agent B) vient de
// park.glb s'il existe, sinon de son remplacement construit en code (fallbacks.ts). Matériaux : clones
// (le cache de useGLTF reste intact), sans brouillard de scène (le parc a sa propre brume), émissifs
// selon le palier (tuneEmissive, comme l'arène), reflets de l'environnement du parc (env.ts).
import {
  Box3,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Texture,
  Vector3,
} from 'three'
import { tuneEmissive } from '../arenaRig'
import { buildFallbacks } from './fallbacks'

export type NodeSource = Partial<Record<string, Object3D>>

export type Parts = {
  /** Nœud du GLB, ou son remplacement (jamais null pour un nom du contrat). */
  get: (name: string) => Object3D
  /** true si le nœud vient de park.glb (UV glTF : textures sans flipY). */
  fromModel: (name: string) => boolean
  /** true si le nœud existe (GLB ou remplacement). */
  has: (name: string) => boolean
  dispose: () => void
}

export function resolveParts(model: NodeSource | null): Parts {
  const fallbacks = buildFallbacks()
  return {
    get: (name) => {
      const node = model?.[name] ?? fallbacks.nodes[name]
      if (!node) throw new Error(`park: nœud inconnu ${name}`)
      return node
    },
    fromModel: (name) => Boolean(model?.[name]),
    has: (name) => Boolean(model?.[name] ?? fallbacks.nodes[name]),
    dispose: fallbacks.dispose,
  }
}

/** Préparation d'un matériau pour le parc (clone). `glow` multiplie l'émissif sous bloom. */
export function parkMaterial(source: Material, bloom: boolean, glow = 1): Material {
  const material = source.clone()
  if ('fog' in material) material.fog = false
  if (material instanceof MeshStandardMaterial) {
    if (bloom) material.emissiveIntensity *= glow
    tuneEmissive(material, bloom)
  }
  return material
}

type Owned = { dispose: () => void }

/**
 * Clone d'un nœud, ramené à l'origine (sans sa position dans la scène Blender), avec des matériaux du
 * parc (parkMaterial) ajoutés à `owned` pour être libérés.
 */
export function cloneWithMaterials(
  node: Object3D,
  bloom: boolean,
  glow: number,
  owned: Owned[],
): Object3D {
  const copy = node.clone(true)
  copy.position.set(0, 0, 0)
  copy.quaternion.identity()
  copy.scale.set(1, 1, 1)
  const cache = new Map<Material, Material>()
  copy.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const mesh = child as Mesh
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (!source) return
    let material = cache.get(source)
    if (!material) {
      material = parkMaterial(source, bloom, glow)
      cache.set(source, material)
      owned.push(material)
    }
    mesh.material = material
  })
  return copy
}

/** Applique la carte d'environnement du parc aux matériaux PBR d'un sous-arbre. */
export function applyEnvironment(root: Object3D, env: Texture | null, intensity = 1): void {
  root.traverse((child) => {
    const material = (child as Object3D & { material?: Material | Material[] }).material
    const list = Array.isArray(material) ? material : material ? [material] : []
    for (const m of list) {
      if (m instanceof MeshStandardMaterial) {
        m.envMap = env
        m.envMapIntensity = intensity
      }
    }
  })
}

const inverse = new Matrix4()
const relative = new Matrix4()
const part = new Box3()

/** Boîte englobante d'un nœud dans son propre repère (sans sa position ni celle de ses parents). */
export function localBox(node: Object3D, out = new Box3()): Box3 {
  out.makeEmpty()
  node.updateWorldMatrix(true, true)
  inverse.copy(node.matrixWorld).invert()
  node.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const geometry = (child as Mesh).geometry
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    if (!geometry.boundingBox) return
    relative.multiplyMatrices(inverse, child.matrixWorld)
    out.union(part.copy(geometry.boundingBox).applyMatrix4(relative))
  })
  return out
}

const size = new Vector3()

/** Facteur d'échelle qui donne au nœud la plus grande dimension `target` (unités du parc). */
export function fitScale(node: Object3D, target: number): number {
  localBox(node, part.clone()).getSize(size)
  const largest = Math.max(size.x, size.y, size.z)
  return largest > 0 ? target / largest : 1
}
