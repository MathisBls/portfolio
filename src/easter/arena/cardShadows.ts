// Easter egg, arène : ombres de contact des cartes sur le tapis (pas de shadow map). Un décalque par
// carte, projeté à la verticale : son contour suit l'empreinte de la carte (axes de la carte projetés sur
// la table, rétrécis pendant le retournement), net quand la carte est posée, plus large, plus flou et
// plus pâle quand elle s'élève (vol depuis le sabot, retournement, légendaire qui se lève). Masqué tant
// que la carte est sur le paquet (le sabot est dessous).
import {
  type BufferGeometry,
  DoubleSide,
  Matrix4,
  Mesh,
  type Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { clamp } from '../../lib/math'
import { CARD_LIFT, TABLE_Y } from '../layout'

/** Demi-dimensions d'une carte (cards.glb : 2.6 × 3.7, debout dans le plan XY local). */
const HALF = { x: 1.3, y: 1.85 }

const VERTEX = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */ `
uniform vec2 uHalf;
uniform vec2 uQuad;
uniform float uSoft;
uniform float uOpacity;
varying vec2 vPos;
void main() {
  vec2 p = vPos * uQuad;
  vec2 q = abs(p) - uHalf + 0.18;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.18;
  float a = (1.0 - smoothstep(-uSoft, uSoft, d)) * uOpacity;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`

type Uniforms = {
  uHalf: { value: Vector2 }
  uQuad: { value: Vector2 }
  uSoft: { value: number }
  uOpacity: { value: number }
}

export type CardShadow = { mesh: Mesh; material: ShaderMaterial; uniforms: Uniforms }

let plane: BufferGeometry | null = null

export function createCardShadow(): CardShadow {
  plane ??= new PlaneGeometry(1, 1)
  const uniforms: Uniforms = {
    uHalf: { value: new Vector2(HALF.x, HALF.y) },
    uQuad: { value: new Vector2(1, 1) },
    uSoft: { value: 0.1 },
    uOpacity: { value: 0 },
  }
  // Double face : la base devient indirecte quand la carte passe la verticale pendant le retournement
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
  const mesh = new Mesh(plane, material)
  mesh.matrixAutoUpdate = false
  mesh.renderOrder = 1
  mesh.frustumCulled = false
  return { mesh, material, uniforms }
}

const card = new Matrix4()
const ax = new Vector3()
const ay = new Vector3()
const up = new Vector3(0, 1, 0)
const center = new Vector3()

/**
 * Pose l'ombre sous la carte. `onDeck` : 1 tant que la carte est sur le paquet (ombre masquée), `fade` :
 * opacité supplémentaire (fondu reduced-motion, légendaire levée).
 */
export function updateCardShadow(shadow: CardShadow, object: Object3D, onDeck: number, fade: number) {
  card.compose(object.position, object.quaternion, object.scale)
  // Axes de la carte (largeur X, longueur Y) projetés sur la table
  ax.setFromMatrixColumn(card, 0).setY(0)
  ay.setFromMatrixColumn(card, 1).setY(0)
  const wx = Math.max(ax.length() * HALF.x, 0.08)
  const wy = Math.max(ay.length() * HALF.y, 0.08)
  if (ax.lengthSq() < 1e-6) ax.set(1, 0, 0)
  if (ay.lengthSq() < 1e-6) ay.crossVectors(ax, up).negate()
  ax.normalize()
  ay.normalize()
  const height = Math.max(0, object.position.y - (TABLE_Y + CARD_LIFT * object.scale.y))
  const soft = 0.07 + 0.22 * Math.min(height, 2.5)
  const ex = wx + 2 * soft
  const ey = wy + 2 * soft
  // Plan unité (XY) couché sur la table : X -> axe largeur, Y -> axe longueur, Z -> vertical
  center.set(object.position.x, TABLE_Y + 0.006, object.position.z)
  shadow.mesh.matrix.makeBasis(ax.multiplyScalar(2 * ex), ay.multiplyScalar(2 * ey), up)
  shadow.mesh.matrix.setPosition(center)
  shadow.mesh.matrixWorldNeedsUpdate = true
  const u = shadow.uniforms
  u.uHalf.value.set(wx, wy)
  u.uQuad.value.set(2 * ex, 2 * ey)
  u.uSoft.value = soft
  u.uOpacity.value = 0.62 * (1 - clamp(height / 3)) * (1 - onDeck) * fade
}
