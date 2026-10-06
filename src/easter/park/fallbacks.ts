// Easter egg v3, beat 8 : modèles de remplacement du parc, construits en code, utilisés tant que
// park.glb (agent B) n'est pas livré ou s'il lui manque un nœud. Même noms et mêmes conventions que le
// contrat (docs/storyboards/easter-park.md, « Noms de nœuds de park.glb ») : vaisseaux et wagons vers −Z,
// haut +Y ; écran, porte et roue dans le plan XY, face +Z ; *_Engine émissifs. Tailles unitaires
// (parts.ts les ramène à l'échelle du parc d'après leur boîte englobante, comme les vrais nœuds).
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'

type Owned = { dispose: () => void }

const metal = (color: string, roughness = 0.35, metalness = 0.85) =>
  new MeshStandardMaterial({ color, roughness, metalness })
const glow = (color: string, intensity: number) =>
  new MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity })

function mesh(
  name: string,
  geometry: ConstructorParameters<typeof Mesh>[0],
  material: Material,
  owned: Owned[],
) {
  const m = new Mesh(geometry, material)
  m.name = name
  if (geometry) owned.push(geometry)
  owned.push(material)
  return m
}

/** Fuselage le long de Z : corps cylindrique effilé et nez conique (CylinderGeometry, déjà dans le bundle). */
function fuselage(radius: number, length: number, owned: Owned[], material: Material): Group {
  const group = new Group()
  const body = new CylinderGeometry(radius * 0.75, radius, length * 0.7, 20)
  body.rotateX(-Math.PI / 2)
  body.translate(0, 0, length * 0.15)
  const nose = new CylinderGeometry(0, radius * 0.75, length * 0.3, 20)
  nose.rotateX(-Math.PI / 2)
  nose.translate(0, 0, -length * 0.35)
  owned.push(body, nose)
  group.add(new Mesh(body, material), new Mesh(nose, material))
  return group
}

function ship(kind: 'A' | 'B' | 'C', owned: Owned[]): Group {
  const root = new Group()
  root.name = `Ship_${kind}`
  const hull = metal(kind === 'B' ? '#cfd3dc' : kind === 'A' ? '#e9e4ee' : '#2c2a35', 0.3)
  const accent = metal('#ff4f9e', 0.4, 0.5)
  const engineColor = kind === 'C' ? '#59e1ff' : '#ff5fb0'
  const size = { A: [1, 9.2], B: [2, 13.2], C: [1.3, 6.1] } as const
  const [radius, length] = size[kind]
  const body = fuselage(radius, length, owned, hull)
  body.name = `Ship_${kind}_Hull`
  owned.push(hull)
  root.add(body)
  const span = kind === 'B' ? 9 : kind === 'A' ? 7 : 4
  const wing = mesh(
    `Ship_${kind}_Wing`,
    new BoxGeometry(span, 0.18, kind === 'B' ? 4.2 : 2.6),
    accent,
    owned,
  )
  wing.position.set(0, -0.1, kind === 'B' ? 1.6 : 1.2)
  root.add(wing)
  const canopy = mesh(
    `Ship_${kind}_Canopy`,
    new SphereGeometry(0.6, 16, 12),
    new MeshStandardMaterial({ color: '#0c0b14', roughness: 0.05, metalness: 0.9 }),
    owned,
  )
  canopy.scale.set(1, 0.7, 1.8)
  canopy.position.set(0, kind === 'B' ? 1.5 : 0.75, kind === 'B' ? -3.4 : -1.6)
  root.add(canopy)
  const engines = kind === 'B' ? [-2.6, 2.6] : kind === 'A' ? [-1.4, 1.4] : [0]
  const engine = glow(engineColor, 6)
  owned.push(engine)
  engines.forEach((x, i) => {
    const nozzle = new Mesh(new CylinderGeometry(0.55, 0.7, 1.4, 16), engine)
    owned.push(nozzle.geometry)
    nozzle.name = i === 0 ? `Ship_${kind}_Engine` : `Ship_${kind}_Engine_${String(i)}`
    nozzle.rotation.x = Math.PI / 2
    nozzle.position.set(x, -0.1, kind === 'B' ? 6.4 : kind === 'A' ? 4.4 : 3.2)
    root.add(nozzle)
  })
  return root
}

function coasterCar(owned: Owned[]): Group {
  const root = new Group()
  root.name = 'Coaster_Car'
  const body = mesh('Coaster_Car_Body', new BoxGeometry(1.4, 0.9, 3.4), metal('#f2f0f5', 0.3, 0.6), owned)
  body.position.y = 0.75
  root.add(body)
  const nose = mesh('Coaster_Car_Nose', new BoxGeometry(1.4, 0.45, 0.9), metal('#ff3d8b', 0.35, 0.5), owned)
  nose.position.set(0, 1.2, -1.5)
  root.add(nose)
  const seat = mesh('Coaster_Car_Seat', new BoxGeometry(1.2, 0.5, 1), metal('#1a1522', 0.8, 0.1), owned)
  seat.position.set(0, 1.4, 0.6)
  root.add(seat)
  const strip = mesh('Coaster_Car_Light', new BoxGeometry(1.5, 0.12, 3.5), glow('#ff4fa8', 4), owned)
  strip.position.y = 0.32
  root.add(strip)
  return root
}

function wheel(owned: Owned[]): { rim: Group; hub: Group; cabin: Group } {
  const rim = new Group()
  rim.name = 'Wheel_Rim'
  const steel = metal('#d9dbe6', 0.35, 0.9)
  owned.push(steel)
  for (const z of [-0.035, 0.035]) {
    const ring = new Mesh(new TorusGeometry(1, 0.012, 8, 160), steel)
    owned.push(ring.geometry)
    ring.position.z = z
    rim.add(ring)
  }
  const lights = mesh('Wheel_Rim_Lights', new TorusGeometry(1.01, 0.005, 6, 200), glow('#7fe8ff', 5), owned)
  rim.add(lights)
  const spoke = new CylinderGeometry(0.004, 0.004, 2, 6)
  owned.push(spoke)
  for (let i = 0; i < 12; i++) {
    const s = new Mesh(spoke, steel)
    s.rotation.z = (i / 12) * Math.PI
    s.position.z = i % 2 === 0 ? 0.035 : -0.035
    rim.add(s)
  }
  const hub = new Group()
  hub.name = 'Wheel_Hub'
  const axle = mesh('Wheel_Hub_Axle', new CylinderGeometry(0.06, 0.06, 0.3, 24), steel, owned)
  axle.rotation.x = Math.PI / 2
  hub.add(axle)
  const cabin = new Group()
  cabin.name = 'Wheel_Cabin'
  const shell = mesh('Wheel_Cabin_Shell', new SphereGeometry(0.045, 20, 14), metal('#f4eef7', 0.25, 0.4), owned)
  shell.scale.set(1, 0.85, 1)
  shell.position.y = -0.05
  cabin.add(shell)
  const windows = mesh('Wheel_Cabin_Window', new CylinderGeometry(0.046, 0.046, 0.022, 20), glow('#bff6ff', 3.5), owned)
  windows.position.y = -0.045
  cabin.add(windows)
  const hanger = mesh('Wheel_Cabin_Hanger', new CylinderGeometry(0.003, 0.003, 0.03, 6), steel, owned)
  hanger.position.y = -0.012
  cabin.add(hanger)
  return { rim, hub, cabin }
}

function screen(owned: Owned[]): { frame: Group; panel: Mesh } {
  const frame = new Group()
  frame.name = 'Screen_Frame'
  const dark = metal('#16131d', 0.45, 0.7)
  owned.push(dark)
  const back = new Mesh(new BoxGeometry(1.84, 1.06, 0.05), dark)
  owned.push(back.geometry)
  back.position.z = -0.03
  frame.add(back)
  const edge = mesh('Screen_Frame_Edge', new BoxGeometry(1.86, 1.08, 0.02), glow('#ff4f9e', 2.5), owned)
  edge.position.z = -0.06
  frame.add(edge)
  const panel = mesh('Screen_Panel', new PlaneGeometry(1.78, 1), new MeshStandardMaterial(), owned)
  panel.position.z = 0.002
  return { frame, panel }
}

function gate(owned: Owned[]): { ring: Group; left: Mesh; right: Mesh; sign: Mesh } {
  const ring = new Group()
  ring.name = 'Gate_Ring'
  const hull = metal('#d8d2e0', 0.3, 0.9)
  owned.push(hull)
  const torus = new Mesh(new TorusGeometry(1, 0.09, 24, 128), hull)
  owned.push(torus.geometry)
  ring.add(torus)
  const neon = mesh('Gate_Ring_Neon', new TorusGeometry(0.9, 0.012, 8, 160), glow('#ff4fa8', 6), owned)
  ring.add(neon)
  const door = metal('#2a2433', 0.4, 0.8)
  owned.push(door)
  const left = new Mesh(new CircleGeometry(0.9, 64, Math.PI / 2, Math.PI), door)
  left.name = 'Gate_DoorL'
  const right = new Mesh(new CircleGeometry(0.9, 64, -Math.PI / 2, Math.PI), door)
  right.name = 'Gate_DoorR'
  owned.push(left.geometry, right.geometry)
  const sign = mesh('Gate_Sign', new BoxGeometry(1.2, 0.22, 0.05), dark(owned), owned)
  sign.position.y = 1.3
  return { ring, left, right, sign }
}

function dark(owned: Owned[]): Material {
  const material = metal('#120f18', 0.5, 0.6)
  owned.push(material)
  return material
}

export type FallbackParts = { nodes: Record<string, Object3D>; dispose: () => void }

/** Toutes les pièces de remplacement, indexées par nom de nœud du contrat. */
export function buildFallbacks(): FallbackParts {
  const owned: Owned[] = []
  const { rim, hub, cabin } = wheel(owned)
  const { frame, panel } = screen(owned)
  const doors = gate(owned)
  const nodes: Record<string, Object3D> = {
    Ship_A: ship('A', owned),
    Ship_B: ship('B', owned),
    Ship_C: ship('C', owned),
    Coaster_Car: coasterCar(owned),
    Wheel_Rim: rim,
    Wheel_Hub: hub,
    Wheel_Cabin: cabin,
    Screen_Frame: frame,
    Screen_Panel: panel,
    Gate_Ring: doors.ring,
    Gate_DoorL: doors.left,
    Gate_DoorR: doors.right,
    Gate_Sign: doors.sign,
  }
  return {
    nodes,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}
