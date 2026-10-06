// Easter egg v3, beats 4 à 7 (docs/storyboards/easter-park.md, « Noms de nœuds de park.glb ») : cockpit et
// porte de remplacement, construits en code, utilisés pour chaque nœud absent de park.glb (agent B).
// Mêmes noms et mêmes conventions que le contrat : cockpit modélisé autour d'une caméra à l'origine qui
// regarde vers −Z (montants de verrière, tableau de bord, trois écrans aux UV 0 -> 1) ; porte dans le
// plan XY, face +Z, diamètre 2 (Cockpit.tsx et Gate.tsx ramènent la porte à l'échelle de l'espace).
import {
  BoxGeometry,
  CircleGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  TorusGeometry,
} from 'three'

type Owned = { dispose: () => void }

export type SpaceParts = { nodes: Record<string, Object3D>; dispose: () => void }

function box(name: string, size: [number, number, number], material: Material, owned: Owned[]) {
  const geometry = new BoxGeometry(...size)
  owned.push(geometry)
  const mesh = new Mesh(geometry, material)
  mesh.name = name
  return mesh
}

/** Montant de verrière entre deux points (boîte fine orientée). */
function strut(
  from: [number, number, number],
  to: [number, number, number],
  material: Material,
  owned: Owned[],
) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  const length = Math.hypot(dx, dy, dz)
  const mesh = box('Cockpit_Strut', [0.05, length, 0.07], material, owned)
  mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2)
  mesh.lookAt(to[0], to[1], to[2])
  mesh.rotateX(Math.PI / 2)
  return mesh
}

function cockpit(owned: Owned[]) {
  const hull = new MeshStandardMaterial({ color: '#16181f', metalness: 0.75, roughness: 0.42 })
  const trim = new MeshStandardMaterial({
    color: '#0b0c10',
    emissive: '#5fdcff',
    emissiveIntensity: 0.6,
    metalness: 0.4,
    roughness: 0.5,
  })
  owned.push(hull, trim)
  const frame = new Group()
  frame.name = 'Cockpit_Frame'
  frame.add(strut([-1.05, -0.44, -0.95], [-0.62, 0.62, -1.32], hull, owned))
  frame.add(strut([1.05, -0.44, -0.95], [0.62, 0.62, -1.32], hull, owned))
  const top = box('Cockpit_Top', [1.4, 0.06, 0.09], hull, owned)
  top.position.set(0, 0.64, -1.33)
  frame.add(top)
  const dash = new Group()
  dash.name = 'Cockpit_Dash'
  const deck = box('Cockpit_Deck', [2.4, 0.08, 0.7], hull, owned)
  deck.position.set(0, -0.5, -1.05)
  deck.rotation.x = 0.32
  dash.add(deck)
  const lip = box('Cockpit_Lip', [2.4, 0.012, 0.012], trim, owned)
  lip.position.set(0, -0.435, -1.38)
  dash.add(lip)
  const screens: Mesh[] = []
  ;[-1, 0, 1].forEach((side) => {
    const geometry = new PlaneGeometry(0.32, 0.17)
    owned.push(geometry)
    const material = new MeshStandardMaterial({ color: '#000000' })
    owned.push(material)
    const screen = new Mesh(geometry, material)
    screen.name = side < 0 ? 'Cockpit_ScreenL' : side > 0 ? 'Cockpit_ScreenR' : 'Cockpit_ScreenC'
    screen.position.set(side * 0.5, -0.43 + Math.abs(side) * 0.012, -0.97 + Math.abs(side) * 0.06)
    screen.rotation.set(-0.72, -side * 0.42, 0)
    screens.push(screen)
  })
  return { frame, dash, screens }
}

function gate(owned: Owned[]) {
  const hull = new MeshStandardMaterial({ color: '#2a2630', metalness: 0.9, roughness: 0.32 })
  const neon = new MeshStandardMaterial({
    color: '#000000',
    emissive: '#ff4fa8',
    emissiveIntensity: 5,
  })
  const door = new MeshStandardMaterial({ color: '#1a161f', metalness: 0.8, roughness: 0.45 })
  owned.push(hull, neon, door)
  const ring = new Group()
  ring.name = 'Gate_Ring'
  const torusGeometry = new TorusGeometry(1, 0.09, 24, 128)
  const neonGeometry = new TorusGeometry(0.9, 0.012, 8, 160)
  owned.push(torusGeometry, neonGeometry)
  ring.add(new Mesh(torusGeometry, hull))
  const lights = new Mesh(neonGeometry, neon)
  lights.name = 'Gate_Ring_Neon'
  ring.add(lights)
  // Portes : origine du nœud à la charnière (bord extérieur), comme dans park.glb
  const doorGeometry = (start: number) => new CircleGeometry(0.9, 64, start, Math.PI)
  const left = new Group()
  left.name = 'Gate_DoorL'
  left.position.x = -0.9
  const leftLeaf = new Mesh(doorGeometry(Math.PI / 2), door)
  leftLeaf.position.x = 0.9
  left.add(leftLeaf)
  const right = new Group()
  right.name = 'Gate_DoorR'
  right.position.x = 0.9
  const rightLeaf = new Mesh(doorGeometry(-Math.PI / 2), door)
  rightLeaf.position.x = -0.9
  right.add(rightLeaf)
  owned.push(leftLeaf.geometry, rightLeaf.geometry)
  const sign = box('Gate_Sign', [1.2, 0.22, 0.05], neon, owned)
  sign.position.y = 1.3
  return { ring, left, right, sign }
}

/** Toutes les pièces de remplacement de l'espace, indexées par nom de nœud du contrat. */
export function buildSpaceFallbacks(): SpaceParts {
  const owned: Owned[] = []
  const { frame, dash, screens } = cockpit(owned)
  const doors = gate(owned)
  const nodes: Record<string, Object3D> = {
    Cockpit_Frame: frame,
    Cockpit_Dash: dash,
    Gate_Ring: doors.ring,
    Gate_DoorL: doors.left,
    Gate_DoorR: doors.right,
    Gate_Sign: doors.sign,
  }
  screens.forEach((screen) => {
    nodes[screen.name] = screen
  })
  return {
    nodes,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}
