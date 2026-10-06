// Easter egg v3, beat 8 (docs/storyboards/easter-park.md : « D'autres vaisseaux nous croisent ou volent
// avec nous », « Des vaisseaux circulent, réacteurs allumés ») : Ship_A, Ship_B, Ship_C instanciés par
// type, avec leurs tuyères (*_Engine, émissives) et une traînée additive par tuyère. Plans de vol en
// calcul pur : escorte (décalée dans le repère de la trajectoire de la caméra, un peu devant), croisement
// (ligne droite à vitesse constante dans une fenêtre de temps), orbite (autour d'un tableau). Hors de sa
// fenêtre, un vaisseau n'est ni calculé ni dessiné. Sans React ; par frame : updateFleet.
import {
  Box3,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { pathPoint } from './camera'
import { type Instanced, commitInstances, instanceNode, setInstance } from './instancing'
import { GIANT, MONUMENT, MOON, type V3 } from './layout'
import { type TrailMaterial, createTrailGeometry, createTrailMaterial } from './particles'
import { type Parts, fitScale, localBox, parkMaterial } from './parts'

type Kind = 'A' | 'B' | 'C'

type Plan =
  | { kind: Kind; mode: 'escort'; from: number; to: number; offset: V3; lead: number }
  | { kind: Kind; mode: 'cross'; from: number; to: number; start: V3; end: V3 }
  | {
      kind: Kind
      mode: 'orbit'
      from: number
      to: number
      center: V3
      radius: number
      tilt: number
      speed: number
      phase: number
    }

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/**
 * Plans de vol (s du parc, repère local). A : chasseurs (escortes, croisements rapides) ; B : yachts
 * (parade, orbites) ; C : cargos (lents et loin : ils donnent l'échelle). `desktopOnly` : pas sur mobile.
 */
const PLANS: readonly (Plan & { desktopOnly?: boolean })[] = [
  // Allée : deux chasseurs en escorte, et des vaisseaux qui arrivent en face
  { kind: 'A', mode: 'escort', from: 1.5, to: 16, offset: [15, -4, 0], lead: 0.9 },
  { kind: 'A', mode: 'escort', from: 3, to: 17, offset: [-18, 5, 0], lead: 1.4, desktopOnly: true },
  { kind: 'B', mode: 'cross', from: 4.5, to: 10.5, start: [-46, 34, -760], end: [-38, 30, 140] },
  { kind: 'A', mode: 'cross', from: 7.5, to: 12, start: [30, -12, -720], end: [12, -2, 60] },
  {
    kind: 'A',
    mode: 'cross',
    from: 10,
    to: 15,
    start: [10, 26, -820],
    end: [-6, 10, -120],
    desktopOnly: true,
  },
  // Géante : un cargo très loin dans le plan des anneaux (l'échelle), un yacht, un chasseur sur le rail
  {
    kind: 'C',
    mode: 'orbit',
    from: 0,
    to: 44,
    center: GIANT.center,
    radius: 700,
    tilt: 0.3,
    speed: 0.035,
    phase: 2.0,
  },
  {
    kind: 'B',
    mode: 'orbit',
    from: 12,
    to: 40,
    center: GIANT.center,
    radius: 360,
    tilt: 0.55,
    speed: -0.11,
    phase: 2.6,
    desktopOnly: true,
  },
  { kind: 'A', mode: 'escort', from: 22, to: 34, offset: [13, 7, 0], lead: 1.1 },
  // Lune et grande roue
  {
    kind: 'A',
    mode: 'orbit',
    from: 30,
    to: 46,
    center: MOON.center,
    radius: 190,
    tilt: -0.4,
    speed: 0.22,
    phase: 0,
  },
  // Planète des cartes : un cargo et un yacht en formation, au loin
  { kind: 'C', mode: 'cross', from: 40, to: 58, start: [620, 60, -2050], end: [-120, 260, -2700] },
  {
    kind: 'B',
    mode: 'cross',
    from: 40.5,
    to: 58.5,
    start: [650, 30, -2020],
    end: [-90, 230, -2670],
    desktopOnly: true,
  },
  // Le B : parade lente autour du monument
  ...[0, 1, 2, 3].map(
    (i): Plan & { desktopOnly?: boolean } => ({
      kind: (['A', 'B', 'C', 'A'] as const)[i] ?? 'A',
      mode: 'orbit',
      from: 50,
      to: Infinity,
      center: add(MONUMENT.center, [0, 10, -30]),
      radius: 160 + i * 24,
      tilt: 0.25 - i * 0.18,
      speed: 0.08 + i * 0.008,
      phase: i * 1.6,
      desktopOnly: i > 1,
    }),
  ),
  { kind: 'A', mode: 'escort', from: 45, to: 64, offset: [-20, 6, 0], lead: 1.6, desktopOnly: true },
]

/** Longueur de chaque type (unités du parc) et couleur de ses traînées. */
const LOOK: Record<Kind, { length: number; trail: string; trailLength: number }> = {
  A: { length: 13, trail: '#ff5fb0', trailLength: 30 },
  B: { length: 32, trail: '#ff7ac8', trailLength: 34 },
  C: { length: 42, trail: '#59e1ff', trailLength: 56 },
}

type Squad = {
  kind: Kind
  parts: Instanced
  scale: number
  /** Tuyères (repère du modèle) et largeur de leur traînée (unités du parc). */
  engines: Vector3[]
  width: number
  plans: Plan[]
  trails: InstancedMesh
  trailMaterial: TrailMaterial
}

export type FleetRig = { root: Group; squads: Squad[]; dispose: () => void }

const box = new Box3()

/** Centres des tuyères (*_Engine*) dans le repère du vaisseau. */
function enginesOf(node: Object3D): { centers: Vector3[]; width: number } {
  const centers: Vector3[] = []
  let width = 0
  node.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(node.matrixWorld).invert()
  node.traverse((child) => {
    if (!(child instanceof Mesh) || !child.name.includes('_Engine')) return
    localBox(child, box)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3()).applyMatrix4(child.matrixWorld).applyMatrix4(inverse)
    centers.push(center)
    width = Math.max(width, size.x, size.y)
  })
  return { centers, width }
}

export function buildFleet(parts: Parts, mobile: boolean, bloom: boolean): FleetRig {
  const root = new Group()
  root.visible = false
  const owned: { dispose: () => void }[] = []
  const trailGeometry = createTrailGeometry()
  owned.push(trailGeometry)
  const squads: Squad[] = (['A', 'B', 'C'] as const).map((kind) => {
    const plans = PLANS.filter((p) => p.kind === kind && !(mobile && p.desktopOnly))
    const node = parts.get(`Ship_${kind}`)
    const count = Math.max(1, plans.length)
    const ships = instanceNode(node, count, (m) => parkMaterial(m, bloom, 2))
    const scale = fitScale(node, LOOK[kind].length)
    const { centers, width } = enginesOf(node)
    const engines = centers.length > 0 ? centers : [new Vector3(0, 0, ships.size.z / 2)]
    const trailMaterial = createTrailMaterial(LOOK[kind].trail)
    trailMaterial.uniforms.uIntensity.value = bloom ? 1.6 : 0.8
    const trails = new InstancedMesh(trailGeometry, trailMaterial, count * engines.length)
    trails.frustumCulled = false
    for (const mesh of ships.meshes) root.add(mesh)
    root.add(trails)
    owned.push(ships, trailMaterial, trails)
    return {
      kind,
      parts: ships,
      scale,
      engines,
      // Une traînée par bloc de tuyères : largeur plafonnée (le yacht groupe ses flammes en un maillage)
      width: Math.min(LOOK[kind].length * 0.1, Math.max(0.8, (width || 1) * scale * 0.9)),
      plans,
      trails,
      trailMaterial,
    }
  })
  return {
    root,
    squads,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

const Y = new Vector3(0, 1, 0)
const pos = new Vector3()
const ahead = new Vector3()
const dir = new Vector3()
const side = new Vector3()
const up = new Vector3()
const matrix = new Matrix4()
const trail = new Matrix4()
const engine = new Matrix4()
const quaternion = new Quaternion()
const scale = new Vector3()
const look = new Matrix4()
const hidden = new Matrix4().makeScale(0, 0, 0)

/** Position et direction de vol du plan à l'instant t ; false hors de sa fenêtre. */
function fly(plan: Plan, t: number): boolean {
  if (t < plan.from || t > plan.to) return false
  if (plan.mode === 'escort') {
    const s = t + plan.lead
    pathPoint(s, pos)
    pathPoint(s + 0.2, ahead)
    dir.subVectors(ahead, pos).normalize()
    side.crossVectors(dir, Y).normalize()
    up.crossVectors(side, dir)
    const sway = Math.sin(t * 0.7 + plan.offset[0])
    pos
      .addScaledVector(side, plan.offset[0] + sway * 1.5)
      .addScaledVector(up, plan.offset[1] + Math.sin(t * 0.9) * 1.2)
    return dir.lengthSq() > 0
  }
  if (plan.mode === 'cross') {
    const k = (t - plan.from) / (plan.to - plan.from)
    pos.set(...plan.start).lerp(ahead.set(...plan.end), k)
    dir.set(...plan.end).sub(ahead.set(...plan.start)).normalize()
    return true
  }
  const a = plan.phase + plan.speed * t
  const c = Math.cos(plan.tilt)
  const s = Math.sin(plan.tilt)
  pos.set(Math.cos(a) * plan.radius, Math.sin(a) * plan.radius * s, Math.sin(a) * plan.radius * c)
  dir.set(-Math.sin(a), Math.cos(a) * s, Math.cos(a) * c).multiplyScalar(Math.sign(plan.speed))
  pos.add(ahead.set(...plan.center))
  return true
}

export function updateFleet(rig: FleetRig, visible: boolean, time: number, glow: number): void {
  rig.root.visible = visible
  if (!visible) return
  for (const squad of rig.squads) {
    scale.setScalar(squad.scale)
    let t = 0
    squad.plans.forEach((plan, i) => {
      const flying = fly(plan, time)
      if (flying) {
        // −Z du vaisseau vers sa direction de vol
        look.lookAt(pos, ahead.copy(pos).add(dir), Y)
        quaternion.setFromRotationMatrix(look)
        matrix.compose(pos, quaternion, scale)
      }
      setInstance(squad.parts, i, flying ? matrix : hidden)
      for (const e of squad.engines) {
        if (flying) {
          engine.makeTranslation(e)
          trail.copy(matrix).multiply(engine)
          const w = squad.width / squad.scale
          trail.scale(ahead.set(w, w, LOOK[squad.kind].trailLength / squad.scale))
        }
        squad.trails.setMatrixAt(t, flying ? trail : hidden)
        t++
      }
    })
    commitInstances(squad.parts, squad.plans.length)
    squad.trails.count = t
    squad.trails.instanceMatrix.needsUpdate = true
    squad.trailMaterial.uniforms.uIntensity.value = glow
  }
}

