// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Contrats », majestic.glb et
// textures de B2) : habillage des matériaux de la montagne, du sommet et du chœur avec les textures du
// Sanctuaire (textures.ts : GLB sans image, cartes chargées en code), selon le mode d'emploi de B2 :
// - MountainRock (montagne et coques) : couleur et normales cuites, normales EN ESPACE OBJET, atlas
//   unique (ClampToEdge), couleur du matériau neutre (la carte porte déjà la teinte) ;
// - MountainB, ChoirStone, SummitInner : pierre sculptée répétée (couleur en niveaux de gris teintée par
//   material.color, normales OpenGL avec le Y inversé pour les UV glTF, ARM : occlusion, rugosité, métal).
// Les textures viennent du cache décodé hors du fil principal pendant le parc (park/loader.ts) ; elles ne
// sont PAS envoyées au GPU ici : la précompilation du beat 0 (warmUpSubtree) le fait, image figée. Posées
// avant cette précompilation (effets des enfants avant celui de MajesticWorld), elles font partie des
// programmes compilés (USE_MAP…) : rien ne se recompile ensuite.
import {
  ClampToEdgeWrapping,
  Color,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  ObjectSpaceNormalMap,
  RepeatWrapping,
  type Texture,
} from 'three'
import { requestTexture } from '../park/loader'
import {
  MAJESTIC_TEXTURES,
  type MajesticTextureKey,
  majesticTextureOptions,
  majesticTextureUrl,
} from './textures'

type Slot = 'map' | 'normalMap' | 'aoMap' | 'roughnessMap' | 'metalnessMap'

type Dress = {
  layers: readonly (readonly [MajesticTextureKey, readonly Slot[]])[]
  /** Normales en espace objet (cartes cuites de la montagne). */
  objectSpace?: boolean
  /** Couleur du matériau remplacée (la carte porte la teinte). */
  color?: string
}

const STONE: Dress = {
  layers: [
    ['stoneColor', ['map']],
    ['stoneNormal', ['normalMap']],
    ['stoneArm', ['aoMap', 'roughnessMap', 'metalnessMap']],
  ],
}

/** Habillage par nom de matériau (ceux de majestic.glb). */
const DRESS: Partial<Record<string, Dress>> = {
  MountainRock: {
    layers: [
      ['mountainColor', ['map']],
      ['mountainNormal', ['normalMap']],
    ],
    objectSpace: true,
    color: '#ffffff',
  },
  MountainB: STONE,
  ChoirStone: STONE,
  SummitInner: STONE,
}

/** Matériaux standard d'un ensemble de sous-arbres, par nom. */
function collect(roots: readonly Object3D[]): Map<string, Set<MeshStandardMaterial>> {
  const out = new Map<string, Set<MeshStandardMaterial>>()
  for (const root of roots) {
    root.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const list: unknown[] = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of list) {
        if (!(material instanceof MeshStandardMaterial)) continue
        const set = out.get(material.name) ?? new Set<MeshStandardMaterial>()
        set.add(material)
        out.set(material.name, set)
      }
    })
  }
  return out
}

function prepare(texture: Texture, key: MajesticTextureKey): Texture {
  const wrap = MAJESTIC_TEXTURES[key].tiled ? RepeatWrapping : ClampToEdgeWrapping
  texture.wrapS = wrap
  texture.wrapT = wrap
  texture.anisotropy = 8
  return texture
}

function apply(
  material: MeshStandardMaterial,
  slots: readonly Slot[],
  texture: Texture,
  dress: Dress,
) {
  for (const slot of slots) material[slot] = texture
  if (slots.includes('normalMap')) {
    if (dress.objectSpace) material.normalMapType = ObjectSpaceNormalMap
    // Normales OpenGL avec les UV glTF (sans retournement) : Y inversé, comme l'arène
    else material.normalScale.set(1, -1)
  }
  if (slots.includes('roughnessMap')) material.roughness = 1
  if (slots.includes('metalnessMap')) material.metalness = 1
  if (dress.color && slots.includes('map')) material.color = new Color(dress.color)
  material.needsUpdate = true
}

/**
 * Pose les textures sur les matériaux des sous-arbres (dès qu'elles sont décodées, sans les envoyer au
 * GPU). Renvoie l'annulation (démontage avant la fin du décodage).
 */
export function dressMaterials(roots: readonly Object3D[], mobile: boolean): () => void {
  let alive = true
  for (const [name, materials] of collect(roots)) {
    const dress = DRESS[name]
    if (!dress) continue
    for (const [key, slots] of dress.layers) {
      requestTexture(majesticTextureUrl(key, mobile), majesticTextureOptions(key)).then(
        (texture) => {
          if (!alive) return
          prepare(texture, key)
          materials.forEach((material) => {
            apply(material, slots, texture, dress)
          })
        },
        () => undefined,
      )
    }
  }
  return () => {
    alive = false
  }
}
