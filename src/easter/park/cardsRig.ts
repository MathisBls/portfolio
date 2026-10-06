// Easter egg v3, beat 8, tableau 4 (docs/storyboards/easter-park.md : « Planète des cartes : les cartes
// BoulardTV (cards.glb) orbitent comme des satellites, la légendaire en géant ») : planète or et ambre
// (texture en niveaux de gris teintée, néons roses côté nuit, atmosphère ambrée), cartes satellites
// instanciées par rareté (une InstancedMesh par pièce de carte) sur trois orbites inclinées, et la
// légendaire géante devant la planète, dans un halo d'or. Préparation des cartes : buildCards
// (../cardRig.ts, avec les correctifs du GLB). Sans React ; par frame : updateCardPlanet.
import {
  type Camera,
  Group,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { buildCards } from '../cardRig'
import type { EasterGLTF } from '../models'
import { type GlowMaterial, createGlow, updateGlow } from '../shaders'
import { PARK_HAZE } from './coasterRig'
import { type Instanced, commitInstances, instanceNode, setInstance } from './instancing'
import { CARD_PLANET, LEGEND_OFFSET } from './layout'
import {
  type Palette,
  type PlanetMaterial,
  createAtmosphereMaterial,
  createPlanetMaterial,
} from './planetMaterials'
import { SUN } from './skyRig'

/** Or et ambre, néons roses côté nuit. */
export const CARD_PALETTE: Palette = {
  deep: '#160801',
  mid: '#a8641b',
  light: '#ffe7b4',
  atmo: '#ffb347',
  gold: '#ffd37a',
  night: '#ff5fa8',
}

type Satellite = { rarity: number; orbit: number; slot: number; index: number }

export type CardPlanetRig = {
  root: Group
  planet: PlanetMaterial
  spin: Group
  sets: Instanced[]
  satellites: Satellite[]
  counts: number[]
  legend: Object3D | null
  glow: GlowMaterial
  glowMesh: Mesh
  dispose: () => void
}

function noFog(root: Object3D) {
  root.traverse((child) => {
    const material = (child as Object3D & { material?: Material }).material
    if (material instanceof MeshStandardMaterial) material.fog = false
  })
}

export function buildCardPlanet(cards: EasterGLTF, mobile: boolean, bloom: boolean): CardPlanetRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  const options = {
    palette: CARD_PALETTE,
    radius: CARD_PLANET.radius,
    sunDir: SUN,
    haze: PARK_HAZE,
    contrast: 1.2,
    atmoGain: 1.2,
    nightGain: 2.2,
  }
  const center = new Vector3(...CARD_PLANET.center)
  const spin = new Group()
  spin.position.copy(center)
  spin.rotation.set(0.35, 0, -0.2)
  const planet = createPlanetMaterial(options)
  const sphere = new SphereGeometry(CARD_PLANET.radius, mobile ? 64 : 128, mobile ? 32 : 64)
  spin.add(new Mesh(sphere, planet))
  const atmo = createAtmosphereMaterial({ ...options, outer: CARD_PLANET.radius * 1.12, gain: 0.5 })
  const shell = new SphereGeometry(CARD_PLANET.radius * 1.12, 96, 48)
  const atmoMesh = new Mesh(shell, atmo)
  atmoMesh.position.copy(center)
  root.add(spin, atmoMesh)
  owned.push(planet, sphere, atmo, shell)

  // Cartes : COMMON, RARE, LEGENDARY préparées par cardRig, puis instanciées par rareté
  const rig = buildCards(cards, bloom, false)
  owned.push(rig)
  rig.cards.forEach(noFog)
  const perOrbit = mobile ? CARD_PLANET.perOrbit.mobile : CARD_PLANET.perOrbit.desktop
  const satellites: Satellite[] = []
  const counts = [0, 0, 0]
  CARD_PLANET.orbits.forEach((_, orbit) => {
    for (let slot = 0; slot < perOrbit; slot++) {
      const rarity = (orbit + slot) % 3
      satellites.push({ rarity, orbit, slot, index: counts[rarity] ?? 0 })
      counts[rarity] = (counts[rarity] ?? 0) + 1
    }
  })
  const sets = rig.cards.map((card, rarity) => {
    const set = instanceNode(card, Math.max(1, counts[rarity] ?? 0))
    for (const mesh of set.meshes) root.add(mesh)
    owned.push(set)
    return set
  })
  // La légendaire géante, et son halo d'or
  const legend = rig.cards[2] ?? null
  if (legend) {
    legend.position.copy(center).add(new Vector3(...LEGEND_OFFSET))
    legend.scale.setScalar(CARD_PLANET.legendScale)
    root.add(legend)
  }
  const glow = createGlow('#ffb347', 3)
  const glowGeometry = new PlaneGeometry(1, 1)
  const glowMesh = new Mesh(glowGeometry, glow)
  glowMesh.scale.setScalar(CARD_PLANET.legendScale * 6)
  glowMesh.position.copy(center).add(new Vector3(...LEGEND_OFFSET))
  root.add(glowMesh)
  owned.push(glow, glowGeometry)
  return {
    root,
    planet,
    spin,
    sets,
    satellites,
    counts,
    legend,
    glow,
    glowMesh,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

const matrix = new Matrix4()
const quaternion = new Quaternion()
const tumble = new Quaternion()
const position = new Vector3()
const scale = new Vector3()
const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const toCamera = new Vector3()
const origin = new Vector3()

export function updateCardPlanet(
  rig: CardPlanetRig,
  visible: boolean,
  time: number,
  camera: Camera,
  glow: number,
): void {
  rig.root.visible = visible
  if (!visible) return
  rig.spin.rotation.y = 0.012 * time
  scale.setScalar(CARD_PLANET.cardScale)
  const perOrbit = rig.satellites.length / CARD_PLANET.orbits.length
  for (const s of rig.satellites) {
    const orbit = CARD_PLANET.orbits[s.orbit]
    const set = rig.sets[s.rarity]
    if (!orbit || !set) continue
    const a = orbit.phase + (s.slot / perOrbit) * Math.PI * 2 + orbit.speed * time
    const c = Math.cos(orbit.tilt)
    const n = Math.sin(orbit.tilt)
    position
      .set(Math.cos(a) * orbit.radius, Math.sin(a) * orbit.radius * n, Math.sin(a) * orbit.radius * c)
      .add(rig.spin.position)
    // Satellite qui tourne lentement sur lui-même, face tournée vers l'extérieur de l'orbite
    quaternion.setFromAxisAngle(Y, Math.PI / 2 - a + 0.3 * Math.sin(time * 0.4 + s.slot))
    tumble.setFromAxisAngle(X, 0.25 * Math.sin(time * 0.3 + s.orbit))
    quaternion.multiply(tumble)
    matrix.compose(position, quaternion, scale)
    setInstance(set, s.index, matrix)
  }
  rig.sets.forEach((set, rarity) => {
    commitInstances(set, rig.counts[rarity] ?? 0)
  })
  if (rig.legend) {
    // Face illustrée tournée vers la caméra (lacet seulement), avec un léger balancement
    toCamera.subVectors(camera.position, rig.root.getWorldPosition(origin)).sub(rig.legend.position)
    rig.legend.rotation.y = Math.atan2(toCamera.x, toCamera.z) + 0.22 * Math.sin(time * 0.3)
    rig.legend.position.y = CARD_PLANET.center[1] + LEGEND_OFFSET[1] + 3 * Math.sin(time * 0.35)
  }
  // Halo derrière la légendaire (repoussé à l'opposé de la caméra : il ne voile pas sa face)
  if (rig.legend) {
    toCamera.copy(camera.position).sub(origin).sub(rig.legend.position).normalize()
    rig.glowMesh.position.copy(rig.legend.position).addScaledVector(toCamera, -60)
  }
  updateGlow(rig.glowMesh, rig.glow, camera, glow)
}
