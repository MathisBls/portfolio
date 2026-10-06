// Easter egg v3, beats 4 à 7 (docs/storyboards/easter-park.md) : clones des nœuds de park.glb (ou des
// pièces de remplacement) pour l'espace, sans React. Un nœud n'a qu'un parent et le parc (D2) utilise
// aussi Gate_* : on clone toujours, matériaux compris, pour régler nos émissifs sans toucher aux siens.
import { type Color, type Material, MeshStandardMaterial, type Object3D } from 'three'
import { tuneEmissive } from '../arenaRig'
import { meshesOf } from '../models'

/** Matériau cloné et son émissif d'origine (référence des rampes d'allumage). */
export type Lit = { material: MeshStandardMaterial; emissive: number }

/**
 * Matériau cloné, sa couleur et ses reflets d'environnement d'origine : assombris tant que la porte est
 * une silhouette (la directionnelle de Lighting.tsx et l'Environment restent montés pendant la séquence).
 */
export type Shaded = { material: MeshStandardMaterial; color: Color; env: number }

export type Cloned = { root: Object3D; lit: Lit[]; shaded: Shaded[]; dispose: () => void }

/**
 * Clone profond de `node`, matériaux standard clonés ; `lit` : ceux qui ont un émissif (adouci sans
 * bloom, comme l'arène).
 */
export function cloneNode(node: Object3D, bloom: boolean): Cloned {
  const root = node.clone(true)
  const clones = new Map<Material, MeshStandardMaterial>()
  const lit: Lit[] = []
  const shaded: Shaded[] = []
  meshesOf(root).forEach((mesh) => {
    const source = mesh.material
    if (Array.isArray(source) || !(source instanceof MeshStandardMaterial)) return
    let material = clones.get(source)
    if (!material) {
      material = source.clone()
      clones.set(source, material)
      const strength = tuneEmissive(material, bloom)
      if (strength > 0) lit.push({ material, emissive: strength })
      shaded.push({ material, color: material.color.clone(), env: material.envMapIntensity })
    }
    mesh.material = material
  })
  return {
    root,
    lit,
    shaded,
    dispose: () => {
      clones.forEach((material) => {
        material.dispose()
      })
    },
  }
}

/** Allumage des émissifs clonés : `level` × émissif d'origine (0 éteint). */
export function setLit(lit: readonly Lit[], level: number): void {
  for (const { material, emissive } of lit) material.emissiveIntensity = emissive * level
}

/** Couleur et reflets : `level` × ceux d'origine (une silhouette sombre vers 0.05). */
export function setShade(shaded: readonly Shaded[], level: number): void {
  for (const { material, color, env } of shaded) {
    material.envMapIntensity = env * level
    material.color.copy(color).multiplyScalar(level)
  }
}

/** Front d'allumage partagé (0 -> 1) des matériaux balayés (addRamp). */
export type Ramp = { value: number }

const RAMP =
  'totalEmissiveRadiance *= smoothstep(vRampU - 0.12, vRampU + 0.02, uRamp * 1.3 - 0.15);'

/**
 * Allumage balayé le long de UV.x (park/types.ts : le mot BOULARDTV de gauche à droite, les feux de
 * l'anneau du bas vers le haut) : l'émissif d'un point s'allume quand le front `ramp` le dépasse, en
 * 0.14 de course (une seule transition par point, jamais de clignotement).
 */
export function addRamp(material: MeshStandardMaterial, ramp: Ramp): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRamp = ramp
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vRampU;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRampU = uv.x;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRamp;\nvarying float vRampU;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${RAMP}`)
  }
  material.customProgramCacheKey = () => 'easter-ramp'
}
