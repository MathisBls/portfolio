// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Préchargement ») : chargement
// de majestic.glb (Draco, décodeur local /draco/ comme models.ts) et résolution de ses nœuds, avec les
// remplacements de fallbacks.ts pour tout nœud absent (ou tout le fichier, tant qu'il n'est pas livré).
// - preloadMajesticModel : vérifie que le fichier existe (HEAD), puis lance le téléchargement et le
//   décodage (useGLTF.preload). Appelé pendant le parc, une fois ses propres textures arrivées.
// - majesticModel() : promesse partagée (React `use` dans MajesticWorld) ; false si le fichier manque.
// Matériaux : clones (le cache de useGLTF reste intact), émissifs réglés selon le palier (tuneEmissive).
import { useGLTF } from '@react-three/drei'
import { type Material, Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { versioned } from '../../lib/assetVersion'
import { tuneEmissive } from '../arenaRig'
import type { EasterGLTF } from '../models'
import { buildFallbacks } from './fallbacks'

export const MAJESTIC_URL = versioned('/models/easter/majestic.glb')
const DRACO_PATH = '/draco/'

let available: Promise<boolean> | null = null

/** Le GLB existe-t-il ? (HEAD, sans la page de repli HTML du serveur de dev.) Puis préchargement. */
export function majesticModel(): Promise<boolean> {
  available ??= fetch(MAJESTIC_URL, { method: 'HEAD' })
    .then((response) => {
      const html = response.headers.get('content-type')?.includes('text/html') ?? false
      const ok = response.ok && !html
      if (ok) useGLTF.preload(MAJESTIC_URL, DRACO_PATH)
      return ok
    })
    .catch(() => false)
  return available
}

/** Lance le téléchargement et le décodage du GLB (idempotent). */
export function preloadMajesticModel(): void {
  void majesticModel()
}

export function useMajesticGLTF(): EasterGLTF {
  return useGLTF(MAJESTIC_URL, DRACO_PATH)
}

export type MajesticNodes = {
  /** Nœud du GLB, ou son remplacement (jamais null pour un nom du contrat). */
  get: (name: MajesticNode) => Object3D
  /** true si le nœud vient du GLB. */
  fromModel: (name: MajesticNode) => boolean
  dispose: () => void
}

export type MajesticNode =
  'Mountain' | 'Mountain_B' | 'Choir_Statue' | 'Summit_Prism' | 'Summit_Shell_L' | 'Summit_Shell_R'

/** Nœuds du GLB, null tant qu'il n'est pas livré. */
export type EasterGLTFNodes = EasterGLTF['nodes'] | null

export function resolveMajestic(model: EasterGLTFNodes): MajesticNodes {
  const fallbacks = buildFallbacks()
  return {
    get: (name) => {
      const node = model?.[name] ?? fallbacks.nodes[name]
      if (!node) throw new Error(`majestic : nœud inconnu ${name}`)
      return node
    },
    fromModel: (name) => Boolean(model?.[name]),
    dispose: fallbacks.dispose,
  }
}

type Owned = { dispose: () => void }

/**
 * Clone d'un nœud avec ses matériaux clonés (une fois par matériau source), ajoutés à `owned`.
 * `prepare` règle chaque clone (émissifs, verre…). Position, rotation et échelle du nœud gardées.
 */
export function cloneNode(
  node: Object3D,
  owned: Owned[],
  bloom: boolean,
  prepare?: (material: Material) => Material,
): Object3D {
  const copy = node.clone(true)
  const cache = new Map<Material, Material>()
  copy.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const mesh = child as Mesh
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (!source) return
    let material = cache.get(source)
    if (!material) {
      material = prepare ? prepare(source.clone()) : source.clone()
      if (material instanceof MeshStandardMaterial) tuneEmissive(material, bloom)
      cache.set(source, material)
      owned.push(material)
    }
    mesh.material = material
  })
  return copy
}

/** Matériaux standard d'un sous-arbre dont le nom est `name` (MountainB, ChoirGlow…). */
export function materialsNamed(
  root: Object3D,
  test: (name: string) => boolean,
): MeshStandardMaterial[] {
  const found = new Set<MeshStandardMaterial>()
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const list = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of list) {
      if (material instanceof MeshStandardMaterial && test(material.name)) found.add(material)
    }
  })
  return [...found]
}
