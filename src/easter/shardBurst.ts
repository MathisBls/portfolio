// Easter egg, beat 1 (« le prisme éclate, net et soudain : éclats projetés vers la caméra ») : données et pose par
// frame des éclats. Géométrie : l'éclat biseauté du fond de page (lib/shardGeometry.ts). Trajectoires
// déterministes (seeded) : départ dans le volume du prisme, vitesse vers l'extérieur et vers la caméra
// (+z), freinage, légère gravité, rotation propre.
import {
  BufferAttribute,
  BufferGeometry,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { buildShardGeometry } from '../lib/shardGeometry'
import { seeded } from './shaders'

export type Burst = {
  count: number
  origin: Float32Array
  velocity: Float32Array
  axis: Float32Array
  spin: Float32Array
  size: Float32Array
}

/** Durée de vol représentée par E.shatter = 1 (secondes). */
export const BURST_TIME = 1.6
const DRAG = 1.3
const GRAVITY = -2.5

export function createShardGeometry(): BufferGeometry {
  const data = buildShardGeometry()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createBurst(count: number): Burst {
  const random = seeded(11)
  const burst: Burst = {
    count,
    origin: new Float32Array(count * 3),
    velocity: new Float32Array(count * 3),
    axis: new Float32Array(count * 3),
    spin: new Float32Array(count),
    size: new Float32Array(count),
  }
  const dir = new Vector3()
  for (let i = 0; i < count; i++) {
    // Volume du prisme (triangle x ±0.85, y −0.5..0.97, profondeur ±1.1), à l'échelle de la scène
    const o = new Vector3((random() - 0.5) * 1.8, -0.55 + random() * 1.5, (random() - 0.5) * 2.2)
    burst.origin.set([o.x, o.y, o.z], i * 3)
    dir.copy(o).normalize().multiplyScalar(0.8)
    dir.z += 1.6 + random() * 1
    dir.normalize().multiplyScalar(8 + random() * 14)
    burst.velocity.set([dir.x, dir.y, dir.z], i * 3)
    dir.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
    burst.axis.set([dir.x, dir.y, dir.z], i * 3)
    burst.spin[i] = 4 + random() * 10
    burst.size[i] = 0.06 + Math.pow(random(), 2) * 0.22
  }
  return burst
}

const matrix = new Matrix4()
const position = new Vector3()
const scale = new Vector3()
const axis = new Vector3()
const rotation = new Quaternion()

/** Pose des éclats `time` secondes après l'éclatement. */
export function updateBurst(mesh: InstancedMesh, burst: Burst, time: number): void {
  const travel = (1 - Math.exp(-DRAG * time)) / DRAG
  for (let i = 0; i < burst.count; i++) {
    const j = i * 3
    position.set(
      (burst.origin[j] ?? 0) + (burst.velocity[j] ?? 0) * travel,
      (burst.origin[j + 1] ?? 0) +
        (burst.velocity[j + 1] ?? 0) * travel +
        0.5 * GRAVITY * time * time,
      (burst.origin[j + 2] ?? 0) + (burst.velocity[j + 2] ?? 0) * travel,
    )
    axis.set(burst.axis[j] ?? 0, burst.axis[j + 1] ?? 1, burst.axis[j + 2] ?? 0)
    rotation.setFromAxisAngle(axis, (burst.spin[i] ?? 0) * time + i)
    const s = burst.size[i] ?? 0.1
    scale.set(s, s, s)
    mesh.setMatrixAt(i, matrix.compose(position, rotation, scale))
  }
  mesh.instanceMatrix.needsUpdate = true
}
