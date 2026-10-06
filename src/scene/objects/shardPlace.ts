// Écriture des instances du champ d'éclats (ShardField.tsx), sortie de shardFrame.ts. Aucune allocation
// par frame : objets de travail au niveau du module.
// docs/storyboards/story-v2.md :
// - « Chargement (≈ 1.5 s) : des éclats de verre convergent et s'assemblent en prisme » : placeIntro,
//   les éclats d'intro tourbillonnent du pourtour vers le volume du prisme, puis s'effacent.
// - Reduced-motion (« pas d'intro », statique) : placeStatic, une dizaine d'éclats fixes à l'écran.
import {
  type BufferAttribute,
  type Camera,
  Euler,
  type InstancedMesh,
  type InterleavedBufferAttribute,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  type Texture,
  Vector3,
} from 'three'
import { lerp } from '../../lib/math'
import type { ShardLayout } from '../../lib/shardLayout'
import { introFlight, visibleHalfHeight } from '../../lib/shards'

export type Alpha = BufferAttribute | InterleavedBufferAttribute

/** Reduced-motion : hauteur occupée à l'écran (part de la demi-hauteur). */
const STATIC_SPREAD = 0.85

const matrix = new Matrix4()
const quaternion = new Quaternion()
const euler = new Euler()
const scale = new Vector3()
const position = new Vector3()
const flight = { k: 0, alpha: 0 }

/**
 * Écrit l'instance i : position `at`, rotation (x, y, z), taille, × sa matrice de forme ; opacité `a`.
 * Éteinte (opacité ou taille nulle) : échelle 0, aucun fragment dessiné.
 */
export function placeShard(
  mesh: InstancedMesh,
  alpha: Alpha,
  i: number,
  shape: Matrix4 | undefined,
  at: Vector3,
  rx: number,
  ry: number,
  rz: number,
  size: number,
  a: number,
) {
  const on = a > 0.002 && size > 1e-4
  euler.set(rx, ry, rz)
  quaternion.setFromEuler(euler)
  scale.setScalar(on ? size : 0)
  matrix.compose(at, quaternion, scale)
  if (shape) matrix.multiply(shape)
  mesh.setMatrixAt(i, matrix)
  alpha.setX(i, on ? a : 0)
}

/** Le matériau prend l'env map de la scène : son envMapIntensity compte (sinon environmentIntensity). */
export function syncEnvironment(mesh: InstancedMesh, environment: Texture | null) {
  const { material } = mesh
  if (material instanceof MeshPhysicalMaterial && material.envMap !== environment) {
    material.envMap = environment
    material.needsUpdate = true
  }
}

/** Reduced-motion : éclats fixes à l'écran (relatifs à la caméra), taille écran constante. */
export function placeStatic(
  mesh: InstancedMesh,
  layout: ShardLayout,
  shapes: readonly Matrix4[],
  alpha: Alpha,
  camera: Camera,
  aspect: number,
) {
  const cam = camera.position
  const { field } = layout
  for (let i = 0; i < field.length; i++) {
    const s = field[i]
    if (!s) continue
    const hh = visibleHalfHeight(Math.max(0.1, cam.z - s.z))
    position.set(cam.x + s.xFrac * hh * aspect, cam.y + (s.yFrac * 2 - 1) * STATIC_SPREAD * hh, s.z)
    placeShard(
      mesh,
      alpha,
      i,
      shapes[i],
      position,
      s.rotX,
      s.rotY,
      s.rotZ,
      (s.size * hh) / s.halfRef,
      s.alpha,
    )
  }
  mesh.count = field.length
}

/** Intro : vol de chaque éclat (après ceux du champ), tourbillon autour du prisme (centre en y). */
export function placeIntro(
  mesh: InstancedMesh,
  layout: ShardLayout,
  shapes: readonly Matrix4[],
  alpha: Alpha,
  elapsed: number,
  center: number,
) {
  const base = layout.field.length
  const { intro } = layout
  for (let j = 0; j < intro.length; j++) {
    const s = intro[j]
    if (!s) continue
    introFlight(elapsed, s.delay, flight)
    const k = flight.k
    const swirl = s.swirl * (1 - k)
    const x = lerp(s.from[0], s.to[0], k)
    const y = lerp(s.from[1], s.to[1], k)
    const c = Math.cos(swirl)
    const sn = Math.sin(swirl)
    position.set(x * c - y * sn, center + x * sn + y * c, lerp(s.from[2], s.to[2], k))
    const spin = s.spin * (1 - k)
    const size = s.size * lerp(1, 0.5, k)
    placeShard(
      mesh,
      alpha,
      base + j,
      shapes[base + j],
      position,
      s.rotX + spin,
      s.rotY + 0.6 * spin,
      0,
      size,
      flight.alpha,
    )
  }
}
