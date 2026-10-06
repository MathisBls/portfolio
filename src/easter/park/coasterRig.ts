// Easter egg v3, beat 8, tableau 2 (docs/storyboards/easter-park.md : « Planète des montagnes russes :
// une géante gazeuse réaliste, teintée magenta et violet, avec des anneaux. Un rail de montagnes russes
// l'enlace et des wagons y foncent. On suit le rail sur un tronçon. ») : planète, atmosphère, anneaux et
// leur poussière, rail généré en code le long de la courbe de rail.ts (la même que la caméra), traverses
// et lumières instanciées (chenillard doux calé sur le tempo de la musique), trains de Coaster_Car
// instanciés. Sans React ; mise à jour par frame : updateCoaster.
import {
  BoxGeometry,
  Color,
  Curve,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { GIANT, RAIL } from './layout'
import { type Instanced, commitInstances, instanceNode, setInstance } from './instancing'
import { createRingDust } from './particles'
import { type Parts, fitScale, parkMaterial } from './parts'
import {
  type Palette,
  type PlanetMaterial,
  type RingMaterial,
  createAtmosphereMaterial,
  createPlanetMaterial,
  createRingMaterial,
} from './planetMaterials'
import { createFrame, giantTilt, railFrame } from './rail'
import { SUN } from './skyRig'

/** Magenta et violet (palette du tableau), frange dorée, cohérents avec le rose BoulardTV. */
export const GIANT_PALETTE: Palette = {
  deep: '#14031f',
  mid: '#86278f',
  light: '#ffc9ec',
  atmo: '#ff5ac8',
  gold: '#ffb36a',
  night: '#ff4fa8',
}
const RING_PALETTE: Palette = { ...GIANT_PALETTE, deep: '#241034', mid: '#b06bd8', light: '#ffe3f5' }
export const PARK_HAZE = { color: '#0c0616', density: 0.00016 }

/** Courbe décalée de la voie (côté, hauteur), pour les tubes des rails. */
class RailCurve extends Curve<Vector3> {
  private readonly frame = createFrame()
  private readonly side: number
  private readonly up: number
  constructor(side: number, up: number) {
    super()
    this.side = side
    this.up = up
  }
  override getPoint(u: number, target = new Vector3()): Vector3 {
    railFrame(u * Math.PI * 2, this.frame)
    return target
      .copy(this.frame.point)
      .addScaledVector(this.frame.side, this.side)
      .addScaledVector(this.frame.up, this.up)
  }
}

export type CoasterRig = {
  root: Group
  planet: PlanetMaterial
  ring: RingMaterial
  spin: Group
  dust: Points<
    ReturnType<typeof createRingDust>['geometry'],
    ReturnType<typeof createRingDust>['material']
  >
  lights: InstancedMesh
  lightCount: number
  cars: Instanced
  carScale: number
  dispose: () => void
}

const COLORS = { magenta: new Color('#ff3d9a'), white: new Color('#ffd6ef') }

export function buildCoaster(parts: Parts, mobile: boolean, bloom: boolean): CoasterRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  const tilt = giantTilt()
  const ringNormal = new Vector3(0, 1, 0).applyQuaternion(tilt)
  const options = {
    palette: GIANT_PALETTE,
    radius: GIANT.radius,
    sunDir: SUN,
    haze: PARK_HAZE,
    contrast: 1.45,
    atmoGain: 0.85,
    ambient: 0.06,
  }
  // Planète, atmosphère, anneaux (repère incliné de l'équateur)
  const system = new Group()
  system.position.set(...GIANT.center)
  system.quaternion.copy(tilt)
  const spin = new Group()
  const planet = createPlanetMaterial(options)
  planet.uniforms.uRing.value.set(GIANT.ring.inner, GIANT.ring.outer, 1, 0)
  planet.uniforms.uRingNormal.value.copy(ringNormal)
  const sphere = new SphereGeometry(GIANT.radius, mobile ? 72 : 144, mobile ? 36 : 72)
  spin.add(new Mesh(sphere, planet))
  const atmo = createAtmosphereMaterial({ ...options, outer: GIANT.radius * 1.13, gain: 1.15 })
  const shell = new SphereGeometry(GIANT.radius * 1.13, 96, 48)
  const atmoMesh = new Mesh(shell, atmo)
  const ring = createRingMaterial({
    ...options,
    palette: RING_PALETTE,
    inner: GIANT.ring.inner,
    outer: GIANT.ring.outer,
    normal: ringNormal,
  })
  const ringGeometry = new RingGeometry(GIANT.ring.inner, GIANT.ring.outer, 256, 6)
  const ringMesh = new Mesh(ringGeometry, ring)
  ringMesh.rotation.x = -Math.PI / 2
  const dustParts = createRingDust(
    mobile ? 2500 : 7000,
    GIANT.ring.inner,
    GIANT.ring.outer,
    6,
    '#ffd9f2',
  )
  const dust = new Points(dustParts.geometry, dustParts.material)
  dust.rotation.x = -Math.PI / 2
  dust.frustumCulled = false
  system.add(spin, atmoMesh, ringMesh, dust)
  root.add(system)
  owned.push(planet, sphere, atmo, shell, ring, ringGeometry, dustParts.geometry, dustParts.material)

  // Rail : deux rails et une poutre, en tubes le long de la courbe décalée
  const segments = mobile ? 900 : 1800
  const steel = new MeshStandardMaterial({ color: '#cfc8da', metalness: 0.9, roughness: 0.32 })
  const beam = new MeshStandardMaterial({
    color: '#1a1324',
    metalness: 0.6,
    roughness: 0.5,
    emissive: '#ff2f8f',
    emissiveIntensity: bloom ? 1.4 : 0.5,
  })
  const ties = new MeshStandardMaterial({ color: '#141019', metalness: 0.7, roughness: 0.55 })
  ties.fog = false
  steel.fog = false
  beam.fog = false
  owned.push(steel, beam, ties)
  // Rail porteur sur l'axe des wagons (rail tubulaire de Coaster_Car, ×carScale), deux rails de guidage,
  // poutre lumineuse dessous
  for (const [side, up, radius, material] of [
    [0, 0, 0.18 * RAIL.carScale * 1.2, steel],
    [-RAIL.gauge, -0.35, 0.12, steel],
    [RAIL.gauge, -0.35, 0.12, steel],
    [0, -1.0, 0.42, beam],
  ] as const) {
    const tube = new TubeGeometry(new RailCurve(side, up), segments, radius, 6, true)
    owned.push(tube)
    const mesh = new Mesh(tube, material)
    mesh.frustumCulled = false
    root.add(mesh)
  }
  // Traverses et lumières
  const frame = createFrame()
  const matrix = new Matrix4()
  const basis = new Matrix4()
  const back = new Vector3()
  const tieCount = mobile ? 300 : 620
  const tieGeometry = new BoxGeometry(RAIL.gauge * 2 + 0.9, 0.2, 0.55)
  const tieMesh = new InstancedMesh(tieGeometry, ties, tieCount)
  tieMesh.frustumCulled = false
  for (let i = 0; i < tieCount; i++) {
    railFrame((i / tieCount) * Math.PI * 2, frame)
    back.copy(frame.tangent).negate()
    basis.makeBasis(frame.side, frame.up, back)
    matrix.copy(basis).setPosition(frame.point.clone().addScaledVector(frame.up, -0.55))
    tieMesh.setMatrixAt(i, matrix)
  }
  owned.push(tieGeometry, tieMesh)
  root.add(tieMesh)
  const lightCount = mobile ? 90 : 180
  const bulb = new SphereGeometry(0.2, 10, 8)
  const bulbMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false })
  const lights = new InstancedMesh(bulb, bulbMaterial, lightCount)
  lights.frustumCulled = false
  const gain = bloom ? 3 : 1
  for (let i = 0; i < lightCount; i++) {
    railFrame((i / lightCount) * Math.PI * 2, frame)
    const side = i % 2 === 0 ? 1 : -1
    matrix.makeTranslation(
      frame.point
        .clone()
        .addScaledVector(frame.side, side * (RAIL.gauge + 0.3))
        .addScaledVector(frame.up, -0.35),
    )
    lights.setMatrixAt(i, matrix)
    lights.setColorAt(i, (i % 4 < 2 ? COLORS.magenta : COLORS.white).clone().multiplyScalar(gain))
  }
  owned.push(bulb, bulbMaterial, lights)
  root.add(lights)
  // Wagons
  const node = parts.get('Coaster_Car')
  const cars = instanceNode(node, RAIL.trains * RAIL.cars, (m) => parkMaterial(m, bloom, 1.5))
  for (const mesh of cars.meshes) root.add(mesh)
  owned.push(cars)
  return {
    root,
    planet,
    ring,
    spin,
    dust,
    lights,
    lightCount,
    cars,
    carScale: parts.fromModel('Coaster_Car') ? RAIL.carScale : fitScale(node, 3.4 * RAIL.carScale),
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

const frame = createFrame()
const matrix = new Matrix4()
const back = new Vector3()
const scale = new Vector3()
const quaternion = new Quaternion()
const position = new Vector3()
const color = new Color()

/** Phases des trains (rad) : le premier double la caméra au milieu du tronçon suivi. */
const TRAINS = [-3.61, -1.5, 0.6] as const

export type CoasterFrame = {
  visible: boolean
  /** Temps de la scène (s du parc), temps de la musique (s), période du tempo (0 : sans). */
  time: number
  music: number
  beat: number
  lights: number
  bloom: boolean
}

export function updateCoaster(rig: CoasterRig, f: CoasterFrame): void {
  rig.root.visible = f.visible
  if (!f.visible) return
  rig.spin.rotation.y = GIANT.spin * f.time
  rig.dust.material.uniforms.uTime.value = f.time
  // Trains
  scale.setScalar(rig.carScale)
  let index = 0
  TRAINS.forEach((phase) => {
    for (let j = 0; j < RAIL.cars; j++) {
      railFrame(phase + RAIL.speed * f.time - j * RAIL.spacing, frame)
      back.copy(frame.tangent).negate()
      matrix.makeBasis(frame.side, frame.up, back)
      quaternion.setFromRotationMatrix(matrix)
      position.copy(frame.point)
      matrix.compose(position, quaternion, scale)
      setInstance(rig.cars, index, matrix)
      index++
    }
  })
  commitInstances(rig.cars, index)
  // Chenillard : une vague douce qui avance d'une lampe par temps (jamais de clignotement franc)
  const gain = (f.bloom ? 3 : 1) * (0.35 + 0.65 * f.lights)
  const step = f.beat > 0 ? f.music / f.beat : f.time * 2
  for (let i = 0; i < rig.lightCount; i++) {
    const wave = 0.5 + 0.5 * Math.cos((i / 8 - step / 2) * Math.PI * 2)
    color.copy(i % 4 < 2 ? COLORS.magenta : COLORS.white).multiplyScalar(gain * (0.45 + 0.55 * wave))
    rig.lights.setColorAt(i, color)
  }
  if (rig.lights.instanceColor) rig.lights.instanceColor.needsUpdate = true
}
