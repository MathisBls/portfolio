// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 5 « 12 colosses
// encapuchonnés (≈ 80 m) surgissent en cercle autour de la montagne, au moment où le chœur entre dans la
// musique. Leurs visages et leurs mains s'illuminent ») : le chœur, sans React. Choir_Statue instancié (un
// InstancedMesh par sous-maillage, enfant Choir_Glow compris), 12 statues sur desktop, 8 sur mobile
// (layout.ts, choirSlot : dos à la montagne, face au monde). Levée en vague (les statues proches de la
// caméra d'abord, CHOIR.waveFrom), sortie du sol avec un léger balancement amorti ; la lueur monte avec
// M.beams (rampe, jamais de flash). Échelle ramenée à CHOIR.height d'après la boîte du nœud, ici (pas
// dans le GLB). Les faisceaux vers le sommet sont dans env/ (D4). Matrices recalculées seulement pendant
// la levée (et une fois au départ, pour la précompilation).
import {
  Box3,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { clamp } from '../../lib/math'
import { tuneEmissive } from '../arenaRig'
import { CHOIR, choirAngle, choirSlot } from './layout'
import type { MajesticState } from './state'

type Part = { mesh: InstancedMesh; relative: Matrix4 }

export type ChoirRig = {
  root: Group
  parts: Part[]
  glows: MeshStandardMaterial[]
  glowPeak: number
  count: number
  scale: number
  /** Dernière valeur de M.choir appliquée aux matrices (−1 : jamais). */
  applied: number
  dispose: () => void
}

/** Lueur des visages et des mains, allumés (sous bloom, sans). */
const GLOW = { bloom: 5, flat: 1 }
/** Part de la levée occupée par le décalage entre la première et la dernière statue. */
const STAGGER = 0.5

function isGlow(object: Object3D | null): boolean {
  for (let node = object; node; node = node.parent)
    if (node.name.startsWith('Choir_Glow')) return true
  return false
}

/** Matériau d'une partie : lueur (réglée par frame) ou pierre (émissif selon le palier). */
function prepare(
  source: MeshStandardMaterial,
  glow: boolean,
  bloom: boolean,
): MeshStandardMaterial {
  const copy = source.clone()
  if (glow) {
    copy.toneMapped = !bloom
    copy.emissiveIntensity = 0
  } else {
    tuneEmissive(copy, bloom)
  }
  return copy
}

export function buildChoir(statue: Object3D, count: number, bloom: boolean): ChoirRig {
  const root = new Group()
  root.visible = false
  const owned: { dispose: () => void }[] = []
  const glows = new Set<MeshStandardMaterial>()
  statue.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(statue.matrixWorld).invert()
  const box = new Box3()
  const parts: Part[] = []
  const cache = new Map<Material, MeshStandardMaterial>()
  statue.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const mesh = child as Mesh
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (!(source instanceof MeshStandardMaterial)) return
    const glow = isGlow(mesh)
    let material = cache.get(source)
    if (!material) {
      material = prepare(source, glow, bloom)
      cache.set(source, material)
      owned.push(material)
      if (glow) glows.add(material)
    }
    const relative = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)
    const instanced = new InstancedMesh(mesh.geometry, material, count)
    instanced.name = mesh.name
    instanced.frustumCulled = false
    owned.push({
      dispose: () => {
        instanced.dispose()
      },
    })
    root.add(instanced)
    parts.push({ mesh: instanced, relative })
    const geometry = mesh.geometry
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    if (geometry.boundingBox) box.union(geometry.boundingBox.clone().applyMatrix4(relative))
  })
  const height = box.isEmpty() ? CHOIR.height : box.max.y - box.min.y
  return {
    root,
    parts,
    glows: [...glows],
    glowPeak: bloom ? GLOW.bloom : GLOW.flat,
    count,
    scale: height > 1 ? CHOIR.height / height : 1,
    applied: -1,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Écart angulaire (0 -> π) entre la statue i et le départ de la vague (CHOIR.waveFrom). */
function fromWave(i: number, count: number): number {
  const d = Math.abs(choirAngle(i, count) - CHOIR.waveFrom) % (Math.PI * 2)
  return Math.min(d, Math.PI * 2 - d)
}

/**
 * Levée de la statue i (0 -> 1) : vague qui part de la caméra (les plus proches d'abord) et fait le
 * tour de la montagne des deux côtés, sortie amortie.
 */
export function statueRise(choir: number, i: number, count: number): number {
  const delay = (fromWave(i, count) / Math.PI) * STAGGER
  const p = clamp((choir - delay) / (1 - STAGGER))
  return 1 - Math.pow(1 - p, 3)
}

const slot: [number, number, number] = [0, 0, 0]
const position = new Vector3()
const rotation = new Quaternion()
const scale = new Vector3()
const base = new Matrix4()
const matrix = new Matrix4()
const UP = new Vector3(0, 1, 0)

function placeChoir(rig: ChoirRig, choir: number, time: number, still: boolean) {
  for (let i = 0; i < rig.count; i++) {
    const yaw = choirSlot(i, rig.count, slot)
    const p = statueRise(choir, i, rig.count)
    // Sortie du sol : léger balancement qui s'amortit une fois debout
    const sway = still ? 0 : 0.035 * (1 - p) * Math.sin(time * 2.1 + i)
    position.set(slot[0], -CHOIR.sunk * (1 - p), slot[2])
    rotation.setFromAxisAngle(UP, yaw + sway)
    scale.setScalar(rig.scale)
    base.compose(position, rotation, scale)
    for (const part of rig.parts) {
      matrix.multiplyMatrices(base, part.relative)
      part.mesh.setMatrixAt(i, matrix)
    }
  }
  for (const part of rig.parts) part.mesh.instanceMatrix.needsUpdate = true
}

export function updateChoir(rig: ChoirRig, m: MajesticState, time: number): void {
  rig.root.visible = m.choir > 0.0005
  // Posées une fois au départ (précompilation), puis à chaque image de la levée
  const moving = m.choir > 0 && m.choir < 1
  if (rig.applied < 0 || moving || m.choir !== rig.applied) {
    placeChoir(rig, m.choir, time, m.reduced)
    rig.applied = m.choir
  }
  const glow = 0.12 * Math.min(1, m.choir * 2) + 0.88 * m.beams
  for (const material of rig.glows) material.emissiveIntensity = rig.glowPeak * glow
}
