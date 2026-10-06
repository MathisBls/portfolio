// Easter egg, beat 6 : matériaux du B géant du final (sans React). Clones des matériaux du GLB (rose et
// blanc) ; sans postprocessing (mobile, reduced-motion), l'émissif est adouci, sinon le B sature en
// blanc. Le B est épaissi pour que la rotation lente montre ses flancs ; sa face lisible (−Z) reste en
// place.
import { type Material, MeshStandardMaterial, type Object3D } from 'three'
import { meshesOf } from './models'

export type GiantRig = { root: Object3D; dispose: () => void }

/** Face lisible du B (b_logo.glb, 0.05 d'épaisseur centrée) et épaisseur du final (facteur sur z). */
const FACE_Z = -0.025
export const THICKNESS = 3

/** Décalage z qui garde la face lisible en place quand le B est épaissi de `k`. */
export const thicknessOffset = (k: number) => FACE_Z * (1 - k)

export function buildGiant(logo: Object3D, bloom: boolean): GiantRig {
  const root = logo.clone(true)
  root.position.set(0, 0, 0)
  root.quaternion.identity()
  const clones = new Map<Material, MeshStandardMaterial>()
  meshesOf(root).forEach((mesh) => {
    const source = mesh.material as Material
    let material = clones.get(source)
    if (!material) {
      material =
        source instanceof MeshStandardMaterial ? source.clone() : new MeshStandardMaterial()
      if (!bloom) material.emissiveIntensity *= 0.55
      clones.set(source, material)
    }
    mesh.material = material
  })
  return {
    root,
    dispose: () => {
      clones.forEach((material) => {
        material.dispose()
      })
    },
  }
}
