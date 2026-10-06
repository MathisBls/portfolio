// Easter egg, beat 3 : préparation de cards.glb (clones, matériaux), sans React.
// Correctif du GLB, ici et pas dans le fichier (règle : corriger dans le composant) : dans COMMON et
// LEGENDARY, les pièces de la face avant ont reçu une seconde fois la transformation de la carte
// (Y ±10° et z +0.22) ; la face avant ne tombait plus sur le dos. La matrice locale de *_frame vaut
// exactement ce décalage (celle de rare_frame est l'identité) : on la retire des pièces avant tournées
// (les textes et pièces retombent alors sur la mise en page de RARE), et sa seule translation des
// pièces avant non tournées (cornes). Le dos (*_back_*) est déjà juste.
// Matériaux clonés par carte : fondu (reduced-motion), émissifs selon le palier, illustration. La
// fenêtre d'illustration n'a pas d'UV dans le GLB : projection plane (XY local) sur une copie.
import {
  BufferAttribute,
  type BufferGeometry,
  type Material,
  Matrix4,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three'
import { tuneEmissive } from './arenaRig'
import { type Rarity, createCardArt } from './cardArt'
import { type EasterGLTF, meshesOf } from './models'

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'legendary']

export type Ornament = { object: Object3D; rest: Vector3; delay: number }

export type CardRig = {
  cards: Object3D[]
  materials: MeshStandardMaterial[][]
  ornaments: Ornament[]
  /** Matrice locale du B au dos de la légendaire (repère de la plongée, layout.ts). */
  logoLocal: Matrix4
  dispose: () => void
}

const inverse = new Matrix4()
const offset = new Vector3()

function unskew(card: Object3D, rarity: Rarity) {
  const frame = card.getObjectByName(`${rarity}_frame`)
  if (!frame) return
  frame.updateMatrix()
  if (frame.matrix.equals(new Matrix4())) return
  inverse.copy(frame.matrix).invert()
  offset.setFromMatrixPosition(frame.matrix)
  card.children.forEach((child) => {
    if (child.name.includes('_back_')) return
    if (child.quaternion.w > 0.9999) {
      child.position.sub(offset)
      return
    }
    child.updateMatrix()
    child.matrix.premultiply(inverse)
    child.matrix.decompose(child.position, child.quaternion, child.scale)
  })
}

/** Copie de la géométrie avec des UV plans (x, y locaux ramenés à [0, 1]). */
function withPlanarUv(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone()
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const position = geometry.getAttribute('position')
  if (!box) return geometry
  const w = Math.max(1e-6, box.max.x - box.min.x)
  const h = Math.max(1e-6, box.max.y - box.min.y)
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - box.min.x) / w
    uv[i * 2 + 1] = (position.getY(i) - box.min.y) / h
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  return geometry
}

const ORNAMENT = /^legendary_(crown_band|crown_\d|horn_|side_-?1$|top_gem)/

function ornamentDelay(name: string): number {
  if (name.includes('crown_band')) return 0
  const crown = /crown_(\d)/.exec(name)
  if (crown) return 0.08 + Number(crown[1]) * 0.05
  if (name.includes('horn')) return 0.3
  if (name.includes('top_gem')) return 0.5
  return 0.4
}

export function buildCards(gltf: EasterGLTF, bloom: boolean, fading: boolean): CardRig {
  const owned: { dispose: () => void }[] = []
  const rig: CardRig = {
    cards: [],
    materials: [],
    ornaments: [],
    logoLocal: new Matrix4(),
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
  RARITIES.forEach((rarity) => {
    const source = gltf.nodes[`CARD_${rarity}`]
    if (!source) return
    const card = source.clone(true)
    card.position.set(0, 0, 0)
    card.quaternion.identity()
    unskew(card, rarity)
    const art = createCardArt(rarity)
    owned.push(art)
    const clones = new Map<Material, MeshStandardMaterial>()
    meshesOf(card).forEach((mesh: Mesh) => {
      const original = mesh.material as Material
      if (original.name.startsWith('BTV_ArtPhoto') && !mesh.geometry.hasAttribute('uv')) {
        mesh.geometry = withPlanarUv(mesh.geometry)
        owned.push(mesh.geometry)
      }
      let material = clones.get(original)
      if (!material) {
        material =
          original instanceof MeshStandardMaterial
            ? original.clone()
            : new MeshStandardMaterial({ color: '#888888' })
        if (original.name.startsWith('BTV_ArtPhoto')) {
          material.color.set('#ffffff')
          material.map = art
          material.emissiveMap = art
          material.emissive.set('#ffffff')
          material.emissiveIntensity = 0.85
        } else {
          tuneEmissive(material, bloom)
        }
        material.transparent = fading
        clones.set(original, material)
        owned.push(material)
      }
      mesh.material = material
    })
    rig.cards.push(card)
    rig.materials.push([...clones.values()])
    if (rarity === 'legendary') {
      card.children.forEach((child) => {
        if (ORNAMENT.test(child.name)) {
          rig.ornaments.push({
            object: child,
            rest: child.scale.clone(),
            delay: ornamentDelay(child.name),
          })
        }
      })
      const logo = card.getObjectByName('legendary_back_logo')
      if (logo) {
        logo.updateMatrix()
        rig.logoLocal.copy(logo.matrix)
      }
    }
  })
  return rig
}
