// Easter egg v3, beat 8, tableau 1 (consigne : « On franchit la porte (Gate_* de park.glb, ouverte) ») :
// la porte du parc vue de l'intérieur, au sortir de la lumière : anneau (Gate_Ring) et ses feux
// (Gate_Lights), portes ouvertes (Gate_DoorL, Gate_DoorR, pivotées sur leurs charnières), enseigne
// BOULARDTV (Gate_Sign, néon du modèle ; néon en canvas sur l'enseigne de remplacement). Les pièces
// gardent leur placement relatif du GLB (moins la position de l'anneau), à l'échelle du parc. Sans React.
import { Box3, Group, Mesh, type Object3D, PlaneGeometry, Vector3 } from 'three'
import { GATE } from './layout'
import { PARK_DIMS } from './types'
import { type Parts, cloneWithMaterials, fitScale, localBox } from './parts'
import { BRAND, neonMaterial, neonTexture } from './signs'

export type GateRig = { root: Group; dispose: () => void }

const box = new Box3()
const size = new Vector3()

export function buildGate(parts: Parts, bloom: boolean): GateRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  root.position.set(...GATE.position)
  const ringNode = parts.get('Gate_Ring')
  const model = parts.fromModel('Gate_Ring')
  const origin = ringNode.position.clone()
  const scaled = new Group()
  // GLB : ouverture de 30 m = GATE.radius ; remplacement : ramené à la taille de l'anneau
  scaled.scale.setScalar(
    model ? GATE.radius / PARK_DIMS.gateInnerRadius : fitScale(ringNode, GATE.radius * 2.2),
  )
  const place = (name: string, glow: number): Object3D => {
    const node = parts.get(name)
    const copy = cloneWithMaterials(node, bloom, glow, owned)
    copy.position.copy(node.position).sub(origin)
    copy.quaternion.copy(node.quaternion)
    copy.scale.copy(node.scale)
    scaled.add(copy)
    return copy
  }
  place('Gate_Ring', 2)
  if (parts.has('Gate_Lights')) place('Gate_Lights', 2.2)
  // Portes ouvertes : GLB, battants pivotés vers l'intérieur du parc sur leurs charnières ;
  // remplacement, coulissées de leur largeur
  for (const [name, side] of [
    ['Gate_DoorL', -1],
    ['Gate_DoorR', 1],
  ] as const) {
    const door = place(name, 1.5)
    if (model) {
      door.rotation.y = -side * PARK_DIMS.gateDoorMaxAngle * 0.95
      continue
    }
    localBox(door, box).getSize(size)
    door.position.x += side * size.x * door.scale.x * 1.05
  }
  const sign = place('Gate_Sign', 2.4)
  if (!parts.fromModel('Gate_Sign')) addNeon(sign, scaled, bloom, owned)
  root.add(scaled)
  return {
    root,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Néon BOULARDTV posé devant l'enseigne de remplacement (celle du GLB a déjà ses lettres). */
function addNeon(sign: Object3D, parent: Object3D, bloom: boolean, owned: { dispose: () => void }[]) {
  localBox(sign, box).getSize(size)
  const center = box.getCenter(new Vector3())
  const texture = neonTexture(BRAND, '#ffe1f1', '#ff3d9a')
  const material = neonMaterial(texture, bloom ? 2.6 : 1)
  const geometry = new PlaneGeometry(1, 0.25)
  const neon = new Mesh(geometry, material)
  neon.scale.setScalar(size.x * sign.scale.x * 0.95)
  neon.position
    .copy(sign.position)
    .add(center.multiply(sign.scale))
    .add(new Vector3(0, 0, (size.z * sign.scale.z) / 2 + 0.01))
  neon.renderOrder = 5
  parent.add(neon)
  owned.push(texture, material, geometry)
}
