// Easter egg, beat 2 (« Révélation de l'arène [...] Les bougies et les flammes vacillent (émissif doux),
// les cristaux pulsent ») : préparation de arena.glb et animation par frame, sans React.
// Le GLB n'a pas de textures : les pierres et le tapis sortent en gris 0.8. Ils sont reteintés ici
// (pierre sombre, tapis indigo), sur des clones de matériaux (le cache de useGLTF reste intact).
// Émissifs : intensités du GLB sous bloom (desktop), ramenées au pic de couleur à 1 sans bloom, sinon
// les flammes et les néons saturent en blanc.
import { type Group, type Material, type Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { meshesOf } from './models'

type Tint = { color?: string; emissive?: string; emissiveIntensity?: number; roughness?: number }

const TINTS: Partial<Record<string, Tint>> = {
  B_Stone: { color: '#16121b', roughness: 0.92 },
  B_StoneLight: { color: '#2b2335', roughness: 0.85 },
  B_Field: { color: '#1c1838', roughness: 0.96 },
  A_Stone: { color: '#19141f' },
  A_PortraitPlayer: { color: '#120e19', emissive: '#3b2c60', emissiveIntensity: 0.6 },
  A_PortraitOpp: { color: '#120e19', emissive: '#3b2c60', emissiveIntensity: 0.6 },
}

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
  flames: { mesh: Mesh; material: MeshStandardMaterial; rest: number; height: number }[]
  pulses: { material: MeshStandardMaterial; rest: number; speed: number; phase: number }[]
  owned: Material[]
}

const PULSES: Partial<Record<string, { speed: number; phase: number }>> = {
  B_CrystalPink: { speed: 1.1, phase: 0 },
  B_CrystalBlue: { speed: 0.9, phase: 2 },
  B_Neon: { speed: 0.5, phase: 1 },
  A_Mana: { speed: 0.7, phase: 3 },
}

function cloneMaterial(source: Material, bloom: boolean): Material {
  const material = source.clone()
  if (material instanceof MeshStandardMaterial) {
    const tint = TINTS[source.name]
    if (tint?.color) material.color.set(tint.color)
    if (tint?.emissive) material.emissive.set(tint.emissive)
    if (tint?.emissiveIntensity !== undefined) material.emissiveIntensity = tint.emissiveIntensity
    if (tint?.roughness !== undefined) material.roughness = tint.roughness
    tuneEmissive(material, bloom)
  }
  return material
}

const HIDDEN_ON_MOBILE = /^B_(coin|mana_opp)_/

export function buildArena(scene: Group, bloom: boolean, mobile: boolean): ArenaRig {
  const root = scene.clone(true)
  const shared = new Map<Material, Material>()
  const rig: ArenaRig = { root, flames: [], pulses: [], owned: [] }
  const hide: Object3D[] = []
  meshesOf(root).forEach((mesh) => {
    if (mobile && HIDDEN_ON_MOBILE.test(mesh.name)) hide.push(mesh)
    const source = mesh.material as Material
    if (source.name === 'B_Flame') {
      // Une flamme = un matériau : chacune vacille à son rythme
      const material = cloneMaterial(source, bloom) as MeshStandardMaterial
      mesh.material = material
      rig.owned.push(material)
      rig.flames.push({ mesh, material, rest: material.emissiveIntensity, height: mesh.scale.y })
      return
    }
    let material = shared.get(source)
    if (!material) {
      material = cloneMaterial(source, bloom)
      shared.set(source, material)
      rig.owned.push(material)
      const pulse = PULSES[source.name]
      if (pulse && material instanceof MeshStandardMaterial) {
        rig.pulses.push({ material, rest: material.emissiveIntensity, ...pulse })
      }
    }
    mesh.material = material
  })
  hide.forEach((object) => {
    object.visible = false
  })
  return rig
}

/** Bruit lisse dans [−1, 1] (somme de sinus), sans aléatoire par frame. */
const flicker = (x: number) =>
  Math.sin(x) * 0.5 + Math.sin(x * 2.7 + 1.3) * 0.3 + Math.sin(x * 4.3) * 0.2

/**
 * `light` : allumage de l'arène (0 -> 1, bougies une à une) ; `calm` : reduced-motion, vacillement
 * réduit. Les variations restent lentes et petites (aucun clignotement).
 */
export function updateArena(rig: ArenaRig, light: number, time: number, calm: boolean): void {
  const amount = calm ? 0.25 : 1
  rig.flames.forEach((flame, i) => {
    const on = Math.min(1, Math.max(0, light * (rig.flames.length + 1) - i))
    const n = flicker(time * 3.1 + i * 1.7) * amount
    flame.mesh.scale.y = flame.height * on * (1 + 0.14 * n)
    flame.mesh.visible = on > 0.01
    flame.material.emissiveIntensity = flame.rest * on * (0.85 + 0.15 * n)
  })
  rig.pulses.forEach((pulse) => {
    const wave = 0.75 + 0.25 * Math.sin(time * pulse.speed * amount + pulse.phase)
    pulse.material.emissiveIntensity = pulse.rest * light * wave
  })
}

export function disposeArena(rig: ArenaRig): void {
  rig.owned.forEach((material) => {
    material.dispose()
  })
}
