// Géométrie, couleurs et matériau du champ d'éclats (ShardField.tsx), sortis du composant pour le garder
// court. docs/storyboards/story-v2.md : Métaphore « Éclats de verre = la matière première » ; Budget
// « ShardField : 1 draw call (instancié), pas de transmission » ; Mobile « pas de transmission ni de
// bloom ». Brief motion-3d : verre riche et lisible sur fond noir, arêtes qui brillent, teinte du
// spectre très légère sur quelques éclats (instanceColor).
// Matériau : MeshPhysicalMaterial sans transmission (le prisme est le seul objet en transmission),
// iridescence + clearcoat, env map forte. Mélange additif et depthWrite false : un corps presque noir
// n'ajoute rien, seuls les reflets, les arêtes et la frange s'ajoutent. Pas de tri à faire entre
// instances, et rien de gris sur le fond. Shader complété (onBeforeCompile) :
// - arêtes vives : barycentriques (lib/shardGeometry.ts), trait d'un pixel et demi, plus vives quand la
//   facette renvoie la lumière (luminance du spéculaire) ; atténuées vue par la tranche (toutes les
//   arêtes s'y superposent : sinon une tache lumineuse sous bloom) ;
// - frange de Fresnel : les facettes rasantes s'éclairent, la silhouette reste lisible ;
// - opacité par instance (instanceAlpha) : intro, fondu du champ, couronne.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  MeshPhysicalMaterial,
} from 'three'
import { buildShardGeometry } from '../../lib/shardGeometry'
import type { ShardLayout, ShardLook } from '../../lib/shardLayout'

/** Couleurs du spectre (--ray-0..6, tokens.css), rouge -> violet. */
const SPECTRUM_FALLBACK = [
  '#ff3b3b',
  '#ff9f1a',
  '#ffe14d',
  '#4cff6a',
  '#2aa7ff',
  '#6a4cff',
  '#b44cff',
]

const cssColor = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

export const SHARD_LOOK = {
  /** Verre neutre : blanc légèrement froid. */
  glass: '#dfe6f5',
  /** Part de la teinte du spectre (le reste en verre neutre) : très légère. */
  tintMix: 0.65,
  /** Avec bloom (desktop) : les arêtes teintées dépassent un peu le seuil (halo discret). */
  tintBloom: 1.5,
  /** Arêtes : intensité ; frange de Fresnel ; env map (forte : seuls les reflets font le verre). */
  edge: { desktop: 0.85, mobile: 1.1 },
  rim: 0.22,
  env: { desktop: 2.6, mobile: 3 },
} as const

export type ShardResources = {
  geometry: BufferGeometry
  material: MeshPhysicalMaterial
  /** Couleur par instance (champ puis intro), à poser en instanceColor avant la première frame. */
  colors: Float32Array
  /** Matrice de forme par instance (étirement, épaisseur, torsion), constante. */
  shapes: readonly Matrix4[]
  dispose: () => void
}

/** Matrice de forme : rotation dans le plan, puis étirement à aire constante et épaisseur. */
function shapeMatrix(look: ShardLook): Matrix4 {
  const sx = Math.sqrt(look.stretch)
  return new Matrix4()
    .makeScale(sx, 1 / sx, look.flat)
    .multiply(new Matrix4().makeRotationZ(look.twist))
}

export function createShardResources(layout: ShardLayout, bloom: boolean): ShardResources {
  const looks: readonly ShardLook[] = [...layout.field, ...layout.intro]
  const count = looks.length

  const data = buildShardGeometry()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3))
  geometry.setAttribute('shardEdge', new BufferAttribute(data.edges, 3))
  geometry.computeVertexNormals()
  const alpha = new InstancedBufferAttribute(new Float32Array(count), 1)
  alpha.setUsage(DynamicDrawUsage)
  geometry.setAttribute('instanceAlpha', alpha)

  const glass = new Color(SHARD_LOOK.glass)
  const spectrum = SPECTRUM_FALLBACK.map((hex, i) => new Color(cssColor(`--ray-${i}`, hex)))
  const colors = new Float32Array(count * 3)
  const color = new Color()
  looks.forEach((look, i) => {
    const tint = look.tint === null ? undefined : spectrum[look.tint]
    color.copy(glass)
    if (tint) color.lerp(tint, SHARD_LOOK.tintMix).multiplyScalar(bloom ? SHARD_LOOK.tintBloom : 1)
    color.toArray(colors, i * 3)
  })

  const material = createShardMaterial(bloom)
  return {
    geometry,
    material,
    colors,
    shapes: looks.map(shapeMatrix),
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

const VERTEX_HEAD = /* glsl */ `#include <common>
attribute vec3 shardEdge;
attribute float instanceAlpha;
varying vec3 vShardEdge;
varying float vShardAlpha;`

const VERTEX_BODY = /* glsl */ `#include <begin_vertex>
vShardEdge = shardEdge;
vShardAlpha = instanceAlpha;`

const FRAGMENT_HEAD = /* glsl */ `#include <common>
uniform float uShardEdge;
uniform float uShardRim;
varying vec3 vShardEdge;
varying float vShardAlpha;`

// Après l'éclairage : totalSpecular, normal (face avant/arrière déjà corrigée), geometryViewDir, vColor
const FRAGMENT_BODY = /* glsl */ `{
  float shardD = min(min(vShardEdge.x, vShardEdge.y), vShardEdge.z);
  float shardLine = 1.0 - smoothstep(0.0, fwidth(shardD) * 1.5, shardD);
  float shardGrazing = pow(1.0 - abs(dot(normal, geometryViewDir)), 4.0);
  float shardGlint = clamp(dot(totalSpecular, vec3(0.2126, 0.7152, 0.0722)) * 1.5, 0.0, 1.0);
  outgoingLight += vColor.rgb * (
    shardLine * uShardEdge * (0.3 + 0.7 * shardGlint) * (1.0 - 0.6 * shardGrazing) +
    shardGrazing * uShardRim * min(vColor.rgb, vec3(1.0))
  );
  diffuseColor.a *= vShardAlpha;
}
#include <opaque_fragment>`

function createShardMaterial(bloom: boolean): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: '#0b0e14',
    roughness: 0.16,
    metalness: 0,
    // ior élevé : reflets plus francs de face (F0 ≈ 0.13), comme un verre taillé
    ior: 2.1,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 620],
    // Clearcoat : second reflet net (40 petits éclats sur mobile : coût négligeable)
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: bloom ? SHARD_LOOK.env.desktop : SHARD_LOOK.env.mobile,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // Faces arrière visibles à travers les faces avant : profondeur du verre
    side: DoubleSide,
  })
  const edge = bloom ? SHARD_LOOK.edge.desktop : SHARD_LOOK.edge.mobile
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShardEdge = { value: edge }
    shader.uniforms.uShardRim = { value: SHARD_LOOK.rim }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_HEAD)
      .replace('#include <begin_vertex>', VERTEX_BODY)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_HEAD)
      .replace('#include <opaque_fragment>', FRAGMENT_BODY)
  }
  material.customProgramCacheKey = () => 'shard-field'
  return material
}
