// Easter egg, arène : lumière rendue visible, construite en code (shaders additifs, sans texture).
// - Plafonnier au-dessus de la table : un large cône de lumière très léger (le halo de la salle) et trois
//   colonnes de lumière plus nettes qui tombent sur les trois emplacements des cartes ; plus denses au
//   centre (vues de face) qu'aux bords (rasants), dégradées sur la hauteur et effacées au ras du tapis
//   (les cartes restent nettes) ; la poussière (Dust.tsx) flotte dedans.
// - Faisceaux des projecteurs au pied des colonnes (12 instances, allumage une à une : attribut aOn).
// - Au sol : halo rose du filet lumineux sous la table, flaques violettes des projecteurs, et l'ombre
//   portée de la table (le plafonnier l'éclaire d'en haut ; pas de shadow map : un décalque sombre).
// Tout est additif et sans écriture de profondeur, sauf l'ombre (mélange normal, noir).
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  NormalBlending,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { FLOOR_Y, SLOTS, TABLE_Y } from '../layout'
import { COLUMNS, PINK, WASH_COLOR, columnAngle, uplightPosition } from './materials'

/** Plafonnier : sommet du cône, rayon au niveau du sol. Hors champ de la caméra qui descend du ciel. */
export const BEAM = { apex: new Vector3(0, 46, 1.4), radius: 13 }
/** Colonnes de lumière sur les emplacements : haut (hors champ), rayons en haut et au tapis. */
const SHAFT = { top: 40, radiusTop: 0.35, radius: 2.4 }
/** Table vue d'en haut : stade de demi-longueur L et de rayon extérieur (layout de model_easter_arena.py). */
const TABLE = { half: 5, radius: 6.35 }

const BEAM_VERTEX = /* glsl */ `
attribute float aOn;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vH;
varying float vOn;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
#ifdef USE_INSTANCING
  local = instanceMatrix * local;
  n = mat3(instanceMatrix) * n;
  vOn = aOn;
#else
  vOn = 1.0;
#endif
  vec4 world = modelMatrix * local;
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vH = uv.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOn;
uniform float uFoot;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vH;
varying float vOn;
void main() {
  vec3 view = normalize(cameraPosition - vWorld);
  float facing = abs(dot(normalize(vNormalW), view));
  float body = pow(facing, 2.2);
  float along = smoothstep(0.0, uFoot, vH) * mix(0.45, 1.0, vH);
  float a = body * along * uOn * vOn;
  gl_FragColor = vec4(uColor * a, a);
}`

/** Faisceau additif ; `foot` : part de la hauteur (depuis le bas) sur laquelle il s'efface au sol. */
function beamMaterial(color: Color, gain: number, foot = 0.18) {
  return new ShaderMaterial({
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    uniforms: {
      uColor: { value: color.clone().multiplyScalar(gain) },
      uOn: { value: 0 },
      uFoot: { value: foot },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  })
}

const DECAL_VERTEX = /* glsl */ `
attribute float aOn;
varying vec2 vPos;
varying float vOn;
void main() {
  vec4 local = vec4(position, 1.0);
#ifdef USE_INSTANCING
  local = instanceMatrix * local;
  vOn = aOn;
#else
  vOn = 1.0;
#endif
  vPos = position.xy;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * local;
}`

/** Distance signée au stade (demi-longueur uHalf, rayon uRadius) ou au cercle (uHalf = 0). */
const DECAL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOn;
uniform float uHalf;
uniform float uRadius;
uniform float uSoft;
uniform float uMode;
uniform vec2 uScale;
varying vec2 vPos;
varying float vOn;
void main() {
  vec2 p = vPos * uScale;
  float d = length(vec2(max(abs(p.x) - uHalf, 0.0), p.y)) - uRadius;
  float a;
  if (uMode < 0.5) {
    // Halo : maximum sur le contour (filet lumineux), dedans plus doux, dehors en traîne
    a = exp(-d * d / (uSoft * uSoft)) * (d < 0.0 ? 0.6 : 1.0) + 0.25 * (1.0 - smoothstep(-uRadius, 0.0, d));
  } else {
    // Ombre : pleine sous la table, bord flou
    a = 1.0 - smoothstep(-uSoft, uSoft, d);
  }
  a *= uOn * vOn;
  gl_FragColor = uMode < 0.5 ? vec4(uColor * a, a) : vec4(0.0, 0.0, 0.0, a);
}`

/** Décalque au sol : plan unité mis à l'échelle (scale, en unités monde). */
function decalMaterial(
  color: Color,
  shape: { half: number; radius: number; soft: number; scale: [number, number] },
  shadow: boolean,
) {
  return new ShaderMaterial({
    vertexShader: DECAL_VERTEX,
    fragmentShader: DECAL_FRAGMENT,
    uniforms: {
      uColor: { value: color.clone() },
      uOn: { value: 0 },
      uHalf: { value: shape.half },
      uRadius: { value: shape.radius },
      uSoft: { value: shape.soft },
      uScale: { value: new Vector2(...shape.scale) },
      uMode: { value: shadow ? 1 : 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: shadow ? NormalBlending : AdditiveBlending,
    toneMapped: false,
  })
}

export type ArenaFx = {
  group: Group
  beam: ShaderMaterial
  shafts: ShaderMaterial
  columns: ShaderMaterial
  columnOn: InstancedBufferAttribute
  glow: ShaderMaterial
  pools: ShaderMaterial
  poolOn: InstancedBufferAttribute
  shadow: ShaderMaterial
  dispose: () => void
}

export function createArenaFx(bloom: boolean): ArenaFx {
  const group = new Group()
  group.name = 'Arena_Fx'
  const owned: { dispose: () => void }[] = []

  // Faisceau du plafonnier : cône ouvert, sommet en haut (uv.y = 1 au sommet)
  const height = BEAM.apex.y - FLOOR_Y
  const cone = new ConeGeometry(BEAM.radius, height, 64, 1, true)
  const beam = beamMaterial(new Color('#ffd9b0'), bloom ? 0.06 : 0.045)
  const beamMesh = new Mesh(cone, beam)
  beamMesh.position.set(BEAM.apex.x, FLOOR_Y + height / 2, BEAM.apex.z)
  beamMesh.renderOrder = 5
  group.add(beamMesh)
  owned.push(cone, beam)

  // Colonnes de lumière sur les trois emplacements (troncs de cône ouverts, du plafond au tapis)
  const shaftHeight = SHAFT.top - TABLE_Y
  const shaft = new CylinderGeometry(SHAFT.radiusTop, SHAFT.radius, shaftHeight, 40, 1, true)
  const shaftOn = new InstancedBufferAttribute(new Float32Array(SLOTS.length).fill(1), 1)
  shaft.setAttribute('aOn', shaftOn)
  const shafts = beamMaterial(new Color('#ffe2bf'), bloom ? 0.32 : 0.22, 0.1)
  const shaftMesh = new InstancedMesh(shaft, shafts, SLOTS.length)
  SLOTS.forEach(([x, , z], i) => {
    shaftMesh.setMatrixAt(i, new Matrix4().makeTranslation(x, TABLE_Y + shaftHeight / 2, z))
  })
  shaftMesh.renderOrder = 6
  shaftMesh.frustumCulled = false
  group.add(shaftMesh)
  owned.push(shaft, shafts)

  // Faisceaux des projecteurs : cônes étroits qui montent le long des colonnes
  const upCone = new ConeGeometry(2.6, 22, 32, 1, true)
  upCone.rotateX(Math.PI)
  upCone.translate(0, 11, 0)
  // Retourné : le sommet (uv.y = 1, le plus dense) est à la source, au sol
  const columns = beamMaterial(WASH_COLOR, bloom ? 0.2 : 0.15)
  const columnMesh = new InstancedMesh(upCone, columns, COLUMNS)
  const columnOn = new InstancedBufferAttribute(new Float32Array(COLUMNS), 1)
  upCone.setAttribute('aOn', columnOn)
  const dummy = new Object3D()
  const at = new Vector3()
  for (let k = 0; k < COLUMNS; k++) {
    uplightPosition(k, at)
    const a = columnAngle(k)
    dummy.position.copy(at)
    // Penché vers la colonne (comme le projecteur, 22°)
    dummy.rotation.set(0, 0, 0)
    dummy.lookAt(at.x + Math.cos(a), at.y, at.z + Math.sin(a))
    dummy.rotateX(0.32)
    dummy.updateMatrix()
    columnMesh.setMatrixAt(k, dummy.matrix)
  }
  columnMesh.renderOrder = 5
  columnMesh.frustumCulled = false
  group.add(columnMesh)
  owned.push(upCone, columns)

  // Au sol (plans couchés) : ombre de la table, halo rose du filet, flaques des projecteurs
  const flat = new PlaneGeometry(1, 1)
  owned.push(flat)
  const decal = (material: ShaderMaterial, scale: [number, number], lift: number, order: number) => {
    const mesh = new Mesh(flat, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.scale.set(scale[0], scale[1], 1)
    mesh.position.y = FLOOR_Y + lift
    mesh.renderOrder = order
    group.add(mesh)
    owned.push(material)
  }
  const around = (margin: number): [number, number] => [
    2 * (TABLE.half + TABLE.radius + margin),
    2 * (TABLE.radius + margin),
  ]
  const shadowScale = around(3)
  const shadow = decalMaterial(
    new Color('#000000'),
    { half: TABLE.half, radius: TABLE.radius - 0.3, soft: 1.5, scale: shadowScale },
    true,
  )
  decal(shadow, shadowScale, 0.01, 2)
  const glowScale = around(4.5)
  const glow = decalMaterial(
    PINK,
    { half: TABLE.half, radius: 5.85, soft: 1.25, scale: glowScale },
    false,
  )
  decal(glow, glowScale, 0.02, 3)

  const poolGeometry = flat.clone()
  const poolOn = new InstancedBufferAttribute(new Float32Array(COLUMNS), 1)
  poolGeometry.setAttribute('aOn', poolOn)
  const pools = decalMaterial(
    WASH_COLOR,
    { half: 0, radius: 0.3, soft: 1.2, scale: [5.2, 5.2] },
    false,
  )
  const poolMesh = new InstancedMesh(poolGeometry, pools, COLUMNS)
  const m = new Matrix4()
  const r = new Matrix4().makeRotationX(-Math.PI / 2)
  for (let k = 0; k < COLUMNS; k++) {
    uplightPosition(k, at)
    m.makeScale(5.2, 5.2, 1).premultiply(r).setPosition(at.x, FLOOR_Y + 0.02, at.z)
    poolMesh.setMatrixAt(k, m)
  }
  poolMesh.renderOrder = 3
  poolMesh.frustumCulled = false
  group.add(poolMesh)
  owned.push(poolGeometry, pools)

  return {
    group,
    beam,
    shafts,
    columns,
    columnOn,
    glow,
    pools,
    poolOn,
    shadow,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Hauteur utile du faisceau au-dessus de la table (poussière). */
export const BEAM_TABLE_RADIUS = (BEAM.radius * (BEAM.apex.y - TABLE_Y)) / (BEAM.apex.y - FLOOR_Y)
