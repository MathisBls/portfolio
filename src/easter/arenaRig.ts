// Easter egg, beat 2 (« Révélation de l'arène : la caméra descend du ciel vers la table [...] ») et beat 3 :
// préparation de arena.glb (salon de jeu BoulardTV, scripts/blender/model_easter_arena.py) et animation
// par frame, sans React. Matériaux PBR remplacés par nom (arena/materials.ts, textures Poly Haven),
// doublons regroupés en InstancedMesh (arena/instancing.ts), sol miroir sur desktop (arena/mirror.ts),
// lumière visible et décalques au sol (arena/fx.ts).
// Allumage progressif (E.arena, arena/ramps.ts) : filet rose sous la table, projecteurs des colonnes
// depuis le fond, bougies une à une, plafonnier. Les flammes vacillent (petites oscillations lentes),
// les gemmes respirent ; les liserés des emplacements s'allument quand la carte se pose, puis prennent la
// couleur de la carte retournée. Reduced-motion : tout est allumé d'emblée, sans vacillement.
import type {
  InstancedMesh} from 'three';
import {
  Color,
  type Group,
  type Material,
  Matrix4,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Texture,
} from 'three'
import { clamp } from '../lib/math'
import { type ArenaFx, createArenaFx } from './arena/fx'
import { instanceShared } from './arena/instancing'
import {
  type ArenaMaterials,
  COLUMNS,
  PINK,
  applyEnvironment,
  createArenaMaterials,
} from './arena/materials'
import { type Mirror, createMirror } from './arena/mirror'
import { arenaLight, columnOn, flameOn } from './arena/ramps'
import type { ArenaTextures } from './arena/textures'
import { FLOOR_Y } from './layout'
import { meshesOf } from './models'
import type { EasterState } from './state'
import { T } from './times'

/** Émissif d'un matériau du GLB selon le palier (voir l'en-tête). Renvoie l'intensité de repos. */
export function tuneEmissive(material: MeshStandardMaterial, bloom: boolean): number {
  const { r, g, b } = material.emissive
  const peak = Math.max(r, g, b)
  if (peak <= 0) return 0
  material.toneMapped = !bloom
  material.emissiveIntensity = bloom
    ? material.emissiveIntensity
    : Math.min(material.emissiveIntensity, 1 / peak)
  return material.emissiveIntensity
}

export type ArenaRig = {
  root: Group
  materials: ArenaMaterials
  fx: ArenaFx
  mirror: Mirror | null
  /** Flammes des chandeliers : matrices de repos (les flammes grandissent depuis leur base). */
  flames: { mesh: InstancedMesh; base: Matrix4[] } | null
  /** Lentilles des projecteurs (couleur par instance = allumage). */
  lenses: InstancedMesh | null
  /** Filets lumineux des trois emplacements (un matériau chacun). */
  slots: MeshBasicMaterial[]
  bloom: boolean
  owned: { dispose: () => void }[]
}

type Options = { bloom: boolean; mobile: boolean }

/** Résolution du rendu miroir du sol (desktop) : basse, le reflet est flouté (mipmaps) de toute façon. */
const MIRROR = { width: 640, height: 360 }

export function buildArena(scene: Group, textures: ArenaTextures, { bloom, mobile }: Options): ArenaRig {
  const root = scene.clone(true)
  const materials = createArenaMaterials(textures, { bloom, mobile })
  const owned: { dispose: () => void }[] = []
  const slots: MeshBasicMaterial[] = []
  const fallback = materials.byName.get('ArenaObsidian')
  let ground: Mesh | null = null
  for (const mesh of meshesOf(root)) {
    const slot = /^Arena_Slot(\d)_Glow/.exec(mesh.name)
    if (slot) {
      const material = materials.slot.clone()
      slots[Number(slot[1])] = material
      owned.push(material)
      mesh.material = material
      continue
    }
    const source = mesh.material as Material
    const replacement = materials.byName.get(source.name) ?? fallback
    if (replacement) mesh.material = replacement
    if (mesh.name === 'Arena_Floor') ground = mesh
  }

  // Sol : miroir avec le postprocessing seulement (desktop hors reduced-motion) : sa passe de reflet est
  // rendue hors écran, comme la scène, donc avec les mêmes shaders précompilés (warmup.ts)
  let mirror: Mirror | null = null
  if (ground && bloom) {
    mirror = createMirror(ground.geometry, FLOOR_Y, materials.floor, MIRROR.width, MIRROR.height)
    mirror.mesh.name = 'Arena_Floor_Mirror'
    ground.removeFromParent()
    root.add(mirror.mesh)
  }

  const groups = instanceShared(root, (material) => material.name === 'ArenaChip')
  let flames: ArenaRig['flames'] = null
  let lenses: InstancedMesh | null = null
  for (const { mesh, source } of groups) {
    owned.push(mesh)
    if (source.startsWith('Arena_Flame')) {
      const base = Array.from({ length: mesh.count }, (_, i) => {
        const m = new Matrix4()
        mesh.getMatrixAt(i, m)
        return m
      })
      flames = { mesh, base }
    }
    if (mesh.material === materials.lens) {
      lenses = mesh
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, BLACK)
    }
  }

  const fx = createArenaFx(bloom)
  root.add(fx.group)
  return { root, materials, fx, mirror, flames, lenses, slots, bloom, owned }
}

const BLACK = new Color('#000000')
const GOLD = new Color('#ffcf7a')
const RARITY = [new Color('#dfe6f2'), new Color('#4d8dff'), new Color('#ffb347')] as const
const LENS = new Color('#c9a2ff')
const FLAME = new Color('#ffb05a')
const tint = new Color()
const scale = new Matrix4()
const matrix = new Matrix4()

/** Bruit lisse dans [−1, 1] (somme de sinus, < 1 Hz), sans aléatoire par frame. */
const flicker = (x: number) =>
  Math.sin(x) * 0.5 + Math.sin(x * 2.7 + 1.3) * 0.3 + Math.sin(x * 4.3) * 0.2

function updateSlots(rig: ArenaRig, e: EasterState, rest: number) {
  const gain = rig.bloom ? 1.7 : 0.85
  for (let i = 0; i < rig.slots.length; i++) {
    const slot = rig.slots[i]
    const card = e.cards[i]
    const rarity = RARITY[i]
    if (!slot || !card || !rarity) continue
    // Carte posée : impulsion unique (montée 0.15 s, retombée 0.5 s), puis la couleur de la carte
    const placed = clamp((card.deal - 0.85) / 0.15) * card.alpha
    const since = e.t - (T.deal + i * 0.45 + 0.75)
    const pulse = e.reduced || since < 0 ? 0 : clamp(since / 0.15) * Math.exp(-since / 0.5)
    const level = 0.14 * rest + 0.32 * placed + 1.5 * pulse + 0.9 * card.glow
    slot.color.copy(GOLD).lerp(rarity, card.flip).multiplyScalar(level * gain)
  }
}

function updateFlames(rig: ArenaRig, light: number, time: number, calm: boolean) {
  const flames = rig.flames
  if (!flames) return
  const n = flames.base.length
  for (let j = 0; j < n; j++) {
    const base = flames.base[j]
    if (!base) continue
    const on = flameOn(light, j, n)
    const f = calm ? 0 : flicker(time * 2.2 + j * 1.7)
    const wide = on * (1 - 0.05 * f)
    scale.makeScale(wide, on * (1 + 0.12 * f), wide)
    matrix.multiplyMatrices(base, scale)
    flames.mesh.setMatrixAt(j, matrix)
  }
  flames.mesh.instanceMatrix.needsUpdate = true
}

/** Une frame de l'arène (E.arena : allumage ; E.t, E.cards : emplacements). */
export function updateArena(rig: ArenaRig, e: EasterState, time: number): void {
  const calm = e.reduced
  const light = arenaLight(e.arena)
  const { materials, fx } = rig
  const breathe = calm ? 1 : 0.9 + 0.1 * Math.sin(time * 0.6)
  materials.led.color.copy(PINK).multiplyScalar(light.led * breathe * (rig.bloom ? 2.6 : 1))
  setUniform(fx.glow, 'uOn', light.led * 0.5 * breathe)
  setUniform(fx.shadow, 'uOn', 0.82)
  setUniform(fx.beam, 'uOn', light.key)
  setUniform(fx.shafts, 'uOn', light.key)
  setUniform(fx.columns, 'uOn', 1)
  setUniform(fx.pools, 'uOn', rig.bloom ? 0.42 : 0.32)
  for (let k = 0; k < COLUMNS; k++) {
    const on = columnOn(e.arena, k)
    materials.wash.uWash.value[k] = on
    fx.columnOn.setX(k, on)
    fx.poolOn.setX(k, on)
    if (rig.lenses) rig.lenses.setColorAt(k, tint.copy(LENS).multiplyScalar(on * (rig.bloom ? 3 : 1)))
  }
  fx.columnOn.needsUpdate = true
  fx.poolOn.needsUpdate = true
  if (rig.lenses?.instanceColor) rig.lenses.instanceColor.needsUpdate = true
  updateFlames(rig, e.arena, time, calm)
  materials.flame.color.copy(FLAME).multiplyScalar(rig.bloom ? 2.4 : 1)
  const glint = calm ? 1 : 0.8 + 0.2 * Math.sin(time * 0.8)
  materials.crystal.emissiveIntensity = light.crystals * glint * (rig.bloom ? 1.6 : 0.6)
  updateSlots(rig, e, light.slots)
}

function setUniform(material: { uniforms: Record<string, { value: unknown }> }, name: string, value: number) {
  const uniform = material.uniforms[name]
  if (uniform) uniform.value = value
}

/** Carte d'environnement de l'arène (Lightformers d'Arena.tsx). */
export function applyArenaEnvironment(rig: ArenaRig, env: Texture | null): void {
  applyEnvironment(rig.materials, env)
}

export function disposeArena(rig: ArenaRig): void {
  rig.owned.forEach((item) => {
    item.dispose()
  })
  rig.materials.owned.forEach((material) => {
    material.dispose()
  })
  rig.fx.dispose()
  rig.mirror?.dispose()
}
