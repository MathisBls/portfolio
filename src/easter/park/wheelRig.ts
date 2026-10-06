// Easter egg v3, beat 8, tableau 3 (docs/storyboards/easter-park.md : « Grande roue autour d'une lune
// rocheuse, cabines lumineuses ») : lune (texture en niveaux de gris teintée cyan glacé, palette du
// tableau, néons roses côté nuit, fine atmosphère), grande roue centrée sur elle (Wheel_Rim qui tourne
// lentement ; la lune tient lieu de moyeu), cabines (Wheel_Cabin instanciées, accrochées à la jante) qui
// restent droites. La caméra passe entre la lune et la jante (camera.ts). Sans React ; par frame :
// updateWheel.
import { Group, Matrix4, Mesh, type Object3D, SphereGeometry, Vector3 } from 'three'
import { type Instanced, commitInstances, instanceNode, setInstance } from './instancing'
import { MOON, WHEEL } from './layout'
import { PARK_HAZE } from './coasterRig'
import { type Parts, cloneWithMaterials, fitScale, parkMaterial } from './parts'
import { PARK_DIMS } from './types'
import {
  type Palette,
  type PlanetMaterial,
  createAtmosphereMaterial,
  createPlanetMaterial,
} from './planetMaterials'
import { SUN } from './skyRig'

/** Cyan glacé, frange or pâle, néons roses côté nuit. */
export const MOON_PALETTE: Palette = {
  deep: '#050f1c',
  mid: '#3f86aa',
  light: '#e9fcff',
  atmo: '#7fe8ff',
  gold: '#ffd9a0',
  night: '#ff5fb0',
}

export type WheelRig = {
  root: Group
  moon: PlanetMaterial
  rim: Object3D
  cabins: Instanced
  cabinCount: number
  scale: number
  /** Rayon d'accroche des cabines (unités du parc). */
  attach: number
  dispose: () => void
}

export function buildWheel(parts: Parts, mobile: boolean, bloom: boolean): WheelRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  const options = {
    palette: MOON_PALETTE,
    radius: MOON.radius,
    sunDir: SUN,
    haze: PARK_HAZE,
    contrast: 1.15,
    atmoGain: 0.7,
    nightGain: 1.6,
  }
  const moon = createPlanetMaterial(options)
  const sphere = new SphereGeometry(MOON.radius, mobile ? 64 : 128, mobile ? 32 : 64)
  const moonMesh = new Mesh(sphere, moon)
  moonMesh.position.set(...MOON.center)
  moonMesh.rotation.set(0.4, 1.2, 0)
  const atmo = createAtmosphereMaterial({ ...options, outer: MOON.radius * 1.07, gain: 0.55 })
  const shell = new SphereGeometry(MOON.radius * 1.07, 64, 32)
  const atmoMesh = new Mesh(shell, atmo)
  atmoMesh.position.set(...MOON.center)
  root.add(moonMesh, atmoMesh)
  owned.push(moon, sphere, atmo, shell)

  // Roue : plan vertical de normale (sin yaw, 0, cos yaw), centrée sur la lune
  const wheel = new Group()
  wheel.position.set(...MOON.center)
  wheel.rotation.y = WHEEL.yaw
  const rimNode = parts.get('Wheel_Rim')
  const model = parts.fromModel('Wheel_Rim')
  // GLB : cabines accrochées sur r = 30 m ; remplacement : jante unitaire ramenée au rayon
  const scale = model ? WHEEL.radius / PARK_DIMS.wheelCabinRadius : fitScale(rimNode, WHEEL.radius * 2)
  const rim = cloneWithMaterials(rimNode, bloom, 1.6, owned)
  rim.scale.setScalar(scale)
  wheel.add(rim)
  // Le moyeu du GLB porte des pylônes et un socle : ici, c'est la lune qui sert de moyeu
  if (!model) {
    const hub = cloneWithMaterials(parts.get('Wheel_Hub'), bloom, 1, owned)
    hub.scale.setScalar(scale)
    wheel.add(hub)
  }
  const cabinCount = mobile
    ? WHEEL.cabins.mobile
    : model
      ? PARK_DIMS.wheelCabinCount
      : WHEEL.cabins.desktop
  const cabins = instanceNode(parts.get('Wheel_Cabin'), cabinCount, (m) =>
    parkMaterial(m, bloom, 1.8),
  )
  for (const mesh of cabins.meshes) wheel.add(mesh)
  owned.push(cabins)
  root.add(wheel)
  return {
    root,
    moon,
    rim,
    cabins,
    cabinCount,
    scale,
    attach: model ? WHEEL.radius : WHEEL.radius * 0.985,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

const matrix = new Matrix4()
const position = new Vector3()

export function updateWheel(rig: WheelRig, visible: boolean, time: number): void {
  rig.root.visible = visible
  if (!visible) return
  const angle = WHEEL.spin * time
  rig.rim.rotation.z = angle
  const radius = rig.attach
  for (let i = 0; i < rig.cabinCount; i++) {
    const a = angle + (i / rig.cabinCount) * Math.PI * 2
    position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0)
    matrix.makeScale(rig.scale, rig.scale, rig.scale).setPosition(position)
    setInstance(rig.cabins, i, matrix)
  }
  commitInstances(rig.cabins, rig.cabinCount)
}
