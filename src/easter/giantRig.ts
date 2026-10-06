// Easter egg, beats 5 et 6 : matériaux du B géant et réglages par frame (sans React, sans allocation).
// - Vol : grille émissive fine dans le repère local du B (onBeforeCompile) : à grande échelle, la surface
//   unie ne donnait aucune sensation de vitesse ; les lignes défilent sous la caméra. La lumière vire
//   au rouge (émissif et grille, E.red).
// - Final : le B redevient rose et blanc (couleurs du GLB), sans grille, dans le halo rouge.
// Épaisseur : le B (0.05) s'épaissit pendant le vol (monolithe), sa face lisible reste en place.
import { Color, type Material, MeshStandardMaterial, type Object3D } from 'three'
import { FACE_Z } from './flight'
import { meshesOf } from './models'
import { type EasterState, SHOT } from './state'

type GridUniforms = {
  uGrid: { value: number }
  uGridColor: { value: Color }
  uGridScale: { value: number }
}

export type GiantPart = {
  material: MeshStandardMaterial
  uniforms: GridUniforms
  color: Color
  emissive: Color
  intensity: number
}

const RED = new Color('#ff1424')
const GRID_PINK = new Color('#ffd2c8')
/** Teinte de la surface en vol : sombre, pour que la grille et les arêtes se lisent. */
const DUSK = new Color('#3a1a22')

function withGrid(source: Material): GiantPart {
  const material =
    source instanceof MeshStandardMaterial ? source.clone() : new MeshStandardMaterial()
  const uniforms: GridUniforms = {
    uGrid: { value: 0 },
    uGridColor: { value: GRID_PINK.clone() },
    uGridScale: { value: 40 },
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = `varying vec3 vBLocal;\n${shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvBLocal = position;',
    )}`
    shader.fragmentShader = `uniform float uGrid;\nuniform vec3 uGridColor;\nuniform float uGridScale;\nvarying vec3 vBLocal;\n${shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      vec2 gp = vBLocal.xy * uGridScale;
      vec2 gl = abs(fract(gp - 0.5) - 0.5) / max(fwidth(gp), vec2(1e-4));
      float line = 1.0 - min(min(gl.x, gl.y), 1.0);
      totalEmissiveRadiance += uGridColor * line * uGrid;`,
    )}`
  }
  material.customProgramCacheKey = () => 'easter-giant-b-grid'
  return {
    material,
    uniforms,
    color: material.color.clone(),
    emissive: material.emissive.clone(),
    intensity: material.emissiveIntensity,
  }
}

export type GiantRig = { root: Object3D; parts: GiantPart[]; dispose: () => void }

export function buildGiant(logo: Object3D): GiantRig {
  const root = logo.clone(true)
  root.position.set(0, 0, 0)
  root.quaternion.identity()
  const shared = new Map<Material, GiantPart>()
  meshesOf(root).forEach((mesh) => {
    const source = mesh.material as Material
    let part = shared.get(source)
    if (!part) {
      part = withGrid(source)
      shared.set(source, part)
    }
    mesh.material = part.material
  })
  const parts = [...shared.values()]
  return {
    root,
    parts,
    dispose: () => {
      parts.forEach((part) => {
        part.material.dispose()
      })
    },
  }
}

/** Épaisseur (facteur sur z) selon le plan ; la face lisible (FACE_Z) ne bouge pas. */
export function extrudeGiant(inner: Object3D, e: EasterState): void {
  const k = e.shot === SHOT.flight ? 1 + 7 * e.extrude : e.reduced ? 1 : 3
  inner.scale.set(1, 1, k)
  inner.position.set(0, 0, FACE_Z * (1 - k))
}

/**
 * En vol, la surface s'assombrit et la grille s'allume pendant l'épaississement (E.extrude) : à la
 * bascule depuis la carte, le B est encore identique à celui du dos de la carte.
 */
export function tintGiant(rig: GiantRig, e: EasterState): void {
  const flying = e.shot === SHOT.flight
  const shift = flying ? e.extrude : 0
  const red = flying ? e.red : 0
  for (const part of rig.parts) {
    const m = part.material
    m.color.copy(part.color).lerp(DUSK, 0.8 * shift)
    m.emissive.copy(part.emissive).lerp(RED, red)
    m.emissiveIntensity = part.intensity * (1 - 0.75 * shift + 0.9 * red) * (e.bloom ? 1 : 0.55)
    part.uniforms.uGrid.value = shift * (0.6 + 1.6 * e.speed + 0.6 * red)
    part.uniforms.uGridColor.value.copy(GRID_PINK).lerp(RED, red)
  }
}
