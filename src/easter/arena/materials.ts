// Easter egg, arène : matériaux PBR du plateau et de la salle, qui remplacent ceux du GLB par leur nom
// (arena.glb est exporté sans image ; noms : scripts/blender/model_easter_arena.py). Textures Poly Haven
// (textures.ts) : velours (tapis, rideaux), bois de rose sous vernis (clearcoat), cuir capitonné, marbre.
// Desktop : MeshPhysicalMaterial pour le velours (sheen rose) et la laque (clearcoat) ; mobile : matériaux
// standard, plus légers (scène simplifiée). Émissifs (filets, flammes, lentilles) en MeshBasicMaterial
// sans tone mapping : au-dessus de 1 seulement sous bloom.
// « Lavis » des projecteurs au sol : les colonnes et les rideaux reçoivent en émissif une lumière qui
// monte du pied de chaque colonne (injection dans le shader standard, une valeur par colonne : allumage
// une à une, arenaRig.ts). Normales : UV glTF sans retournement, donc Y de la normale inversé (comme
// GLTFLoader avec des tangentes dérivées).
import type {
  Vector3} from 'three';
import {
  Color,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { FLOOR_Y } from '../layout'
import type { ArenaTextures } from './textures'

export const PINK = new Color('#ff2d78')
export const COLUMNS = 12
/** Angle du pied de la colonne k (rad) : 15° + 30° k, rayon des colonnes et des projecteurs. */
export const columnAngle = (k: number) => ((15 + 30 * k) * Math.PI) / 180
export const COLUMN_RADIUS = 30
export const UPLIGHT_RADIUS = 28.1
export const WASH_COLOR = new Color('#8a3cff')

export type WashUniforms = {
  uWash: { value: number[] }
  uWashColor: { value: Color }
  uWashGain: { value: number }
}

export type ArenaMaterials = {
  /** Matériau de remplacement par nom de matériau du GLB. */
  byName: Map<string, Material>
  /** Matériaux éclairés : reçoivent la carte d'environnement de l'arène (Lightformers). */
  lit: { material: MeshStandardMaterial; intensity: number }[]
  floor: MeshStandardMaterial
  led: MeshBasicMaterial
  slot: MeshBasicMaterial
  lens: MeshBasicMaterial
  flame: MeshBasicMaterial
  crystal: MeshStandardMaterial
  wash: WashUniforms
  owned: Material[]
}

type Options = { bloom: boolean; mobile: boolean }

const WASH_VERTEX = /* glsl */ `
vec4 washWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  washWorld = instanceMatrix * washWorld;
#endif
vWashPos = (modelMatrix * washWorld).xyz;
`

/** Lavis : distance (en arc) au projecteur le plus proche, montée depuis le sol, face tournée vers lui. */
const washFragment = (width: number, height: number) => /* glsl */ `
{
  float washR = length(vWashPos.xz);
  float washK = (atan(vWashPos.z, vWashPos.x) - 0.2617994) / 0.5235988;
  float washI = floor(washK + 0.5);
  float washArc = (washK - washI) * 0.5235988 * washR;
  int washIndex = int(mod(washI + 12.0, 12.0));
  float washAngle = 0.2617994 + washI * 0.5235988;
  vec3 washSource = vec3(cos(washAngle) * ${UPLIGHT_RADIUS.toFixed(2)}, ${FLOOR_Y.toFixed(2)}, sin(washAngle) * ${UPLIGHT_RADIUS.toFixed(2)});
  vec3 washNormal = inverseTransformDirection(normal, viewMatrix);
  float washFace = 0.25 + 0.75 * max(dot(washNormal, normalize(washSource - vWashPos)), 0.0);
  float washRise = exp(-max(vWashPos.y - ${FLOOR_Y.toFixed(2)}, 0.0) / ${height.toFixed(1)});
  float washSpread = exp(-washArc * washArc / ${(width * width).toFixed(2)});
  float washRing = smoothstep(20.0, 26.0, washR);
  totalEmissiveRadiance += uWashColor * uWashGain * uWash[washIndex] * washSpread * washRise * washFace * washRing;
}
`

/** Injecte le lavis des projecteurs (largeur et hauteur en unités monde) dans un matériau standard. */
function addWash(material: MeshStandardMaterial, wash: WashUniforms, width: number, height: number) {
  const fragment = washFragment(width, height)
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uWash = wash.uWash
    shader.uniforms.uWashColor = wash.uWashColor
    shader.uniforms.uWashGain = wash.uWashGain
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWashPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>\n${WASH_VERTEX}`)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vWashPos;\nuniform float uWash[${String(COLUMNS)}];\nuniform vec3 uWashColor;\nuniform float uWashGain;`,
      )
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${fragment}`)
  }
  material.customProgramCacheKey = () => `arena-wash-${String(width)}-${String(height)}`
}

const normalScale = (s: number) => new Vector2(s, -s)

export function createArenaMaterials(t: ArenaTextures, { bloom, mobile }: Options): ArenaMaterials {
  const owned: Material[] = []
  const lit: ArenaMaterials['lit'] = []
  const byName = new Map<string, Material>()
  const wash: WashUniforms = {
    uWash: { value: new Array<number>(COLUMNS).fill(0) },
    uWashColor: { value: WASH_COLOR.clone() },
    uWashGain: { value: bloom ? 1.15 : 0.8 },
  }
  const own = <M extends Material>(name: string, material: M, envIntensity?: number): M => {
    material.name = name
    owned.push(material)
    byName.set(name, material)
    if (envIntensity !== undefined && material instanceof MeshStandardMaterial) {
      lit.push({ material, intensity: envIntensity })
    }
    return material
  }

  // Tapis : velours violet, poil couché (couleur en niveaux de gris teintée), reflet rose rasant (sheen)
  const felt = {
    color: new Color('#6a2aa8'),
    map: t.velvetColor,
    normalMap: t.velvetNormal,
    normalScale: normalScale(0.5),
    roughnessMap: t.velvetArm,
    roughness: 1,
    aoMap: t.velvetArm,
    aoMapIntensity: 0.5,
  }
  own(
    'ArenaFelt',
    mobile
      ? new MeshStandardMaterial(felt)
      : new MeshPhysicalMaterial({
          ...felt,
          sheen: 1,
          sheenColor: new Color('#ff3d8f'),
          sheenRoughness: 0.42,
        }),
    0.35,
  )
  const curtain = {
    color: new Color('#7a1244'),
    map: t.velvetColor,
    normalMap: t.velvetNormal,
    normalScale: normalScale(0.9),
    roughnessMap: t.velvetArm,
    roughness: 1,
  }
  const drape = own(
    'ArenaCurtain',
    mobile
      ? new MeshStandardMaterial(curtain)
      : new MeshPhysicalMaterial({
          ...curtain,
          sheen: 1,
          sheenColor: new Color('#ff5aa0'),
          sheenRoughness: 0.45,
        }),
    0.2,
  )
  addWash(drape, wash, 3.2, 11)

  // Bois de rose sous vernis : clearcoat (desktop), reflets des Lightformers dans la laque
  const wood = { color: new Color('#d99c86'), map: t.woodColor, roughness: 0.42 }
  own(
    'ArenaWood',
    mobile
      ? new MeshStandardMaterial({ ...wood, roughness: 0.3 })
      : new MeshPhysicalMaterial({ ...wood, clearcoat: 1, clearcoatRoughness: 0.06 }),
    1,
  )
  own(
    'ArenaLeather',
    new MeshStandardMaterial({
      color: new Color('#45183a'),
      normalMap: t.leatherNormal,
      normalScale: normalScale(1),
      roughnessMap: t.leatherArm,
      roughness: 1.1,
      aoMap: t.leatherArm,
    }),
    0.9,
  )
  own('ArenaBrass', new MeshStandardMaterial({ color: '#d4a85a', metalness: 1, roughness: 0.3 }), 1.3)
  own('ArenaGold', new MeshStandardMaterial({ color: '#ffd27a', metalness: 1, roughness: 0.16 }), 1.6)
  const obsidian = own(
    'ArenaObsidian',
    mobile
      ? new MeshStandardMaterial({ color: '#0e0b14', roughness: 0.18 })
      : new MeshPhysicalMaterial({
          color: '#0e0b14',
          roughness: 0.2,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
        }),
    1,
  )
  addWash(obsidian, wash, 1.25, 13)
  const floor = own(
    'ArenaMarble',
    new MeshStandardMaterial({
      color: new Color('#6c6876'),
      map: t.marbleColor,
      normalMap: t.marbleNormal,
      normalScale: normalScale(0.6),
      roughnessMap: t.marbleArm,
      roughness: 0.55,
      aoMap: t.marbleArm,
      aoMapIntensity: 0.6,
    }),
    mobile ? 0.3 : 0.2,
  )
  // Émail rose sombre du médaillon : le B d'or s'en détache
  own('ArenaEnamel', new MeshStandardMaterial({ color: '#6a0d36', roughness: 0.42 }), 0.5)
  own('ArenaWax', new MeshStandardMaterial({ color: '#f1e4cc', roughness: 0.5 }), 0.4)
  own('ArenaCardEdge', new MeshStandardMaterial({ color: '#ebe2d2', roughness: 0.72 }), 0.3)
  own('ArenaChip', new MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), 0.6)
  own('ArenaChipInlay', new MeshStandardMaterial({ color: '#f3ead8', roughness: 0.45 }), 0.5)
  const crystal = own(
    'ArenaCrystal',
    new MeshStandardMaterial({
      color: '#ff4d94',
      roughness: 0.08,
      emissive: PINK,
      emissiveIntensity: 0,
    }),
    2.2,
  )

  // Émissifs : intensité animée par arenaRig.ts
  const led = own('ArenaLed', new MeshBasicMaterial({ color: PINK, toneMapped: false }))
  const slot = own('ArenaSlotGlow', new MeshBasicMaterial({ color: '#ffcf7a', toneMapped: false }))
  const lens = own('ArenaLens', new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }))
  const flame = own('ArenaFlame', new MeshBasicMaterial({ color: '#ffb05a', toneMapped: false }))

  return { byName, lit, floor, led, slot, lens, flame, crystal, wash, owned }
}

/** Carte d'environnement de l'arène (Lightformers, Arena.tsx) sur les matériaux éclairés. */
export function applyEnvironment(materials: ArenaMaterials, env: Texture | null) {
  for (const { material, intensity } of materials.lit) {
    if (material.envMap === env) continue
    material.envMap = env
    material.envMapIntensity = intensity
    material.needsUpdate = true
  }
}

/** Position monde du projecteur au pied de la colonne k (sol). */
export function uplightPosition(k: number, out: Vector3): Vector3 {
  const a = columnAngle(k)
  return out.set(Math.cos(a) * UPLIGHT_RADIUS, FLOOR_Y, Math.sin(a) * UPLIGHT_RADIUS)
}
