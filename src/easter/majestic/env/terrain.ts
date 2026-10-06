// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 4 : « glissements de
// terrain, cascades de sable, roches qui tombent ») : le relief que le CPU doit connaître pour les débris
// et les cascades, en calcul pur (testé).
// - Montagne : grille de hauteurs locales (montagne dressée, base à y = 0), soit rastérisée depuis le
//   maillage Mountain de majestic.glb (B2) s'il est fourni, soit approchée (cône concave et arêtes,
//   même profil que le bloc MOUNTAIN de glsl.ts). Hauteur monde = locale − enfoncement (M.rise).
// - Plaine : dôme et bourrelet du bloc GROUND_HEIGHT (sans les dunes, ±1 m, négligeables ici).
// - Lignes de plus grande pente (cascades de sable).
import { type BufferGeometry, Mesh, type Object3D, Vector3 } from 'three'
import { MOUNTAIN } from '../layout'
import { seeded } from '../../shaders'

export type MountainField = {
  /** Côté de la grille (cellules) et demi-étendue (m) autour du centre de la montagne. */
  size: number
  extent: number
  heights: Float32Array
}

const FIELD_SIZE = 192
const FIELD_EXTENT = MOUNTAIN.radius * 1.15

/**
 * Profil du cône concave, inverse de mountainRadius en GLSL (r = R (1 − h/H)^1.25) : hauteur locale au
 * rayon r.
 */
export function coneHeight(r: number): number {
  const t = Math.min(1, Math.max(0, r / MOUNTAIN.radius))
  return MOUNTAIN.height * (1 - Math.pow(t, 0.8))
}

/** Champ approché : cône, arêtes radiales et ravines (bruit angulaire), quand le modèle manque. */
export function proceduralField(): MountainField {
  const size = FIELD_SIZE
  const heights = new Float32Array(size * size)
  const random = seeded(7)
  const phases = [random(), random(), random()].map((p) => p * Math.PI * 2)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size) * 2 * FIELD_EXTENT - FIELD_EXTENT
      const z = ((j + 0.5) / size) * 2 * FIELD_EXTENT - FIELD_EXTENT
      const r = Math.hypot(x, z)
      const a = Math.atan2(z, x)
      const ridges =
        1 +
        0.06 * Math.sin(a * 7 + (phases[0] ?? 0)) +
        0.04 * Math.sin(a * 13 + (phases[1] ?? 0)) +
        0.03 * Math.sin(a * 23 + (phases[2] ?? 0))
      heights[j * size + i] = coneHeight(r / ridges)
    }
  }
  return { size, extent: FIELD_EXTENT, heights }
}

const va = new Vector3()
const vb = new Vector3()
const vc = new Vector3()

function rasterizeTriangle(field: MountainField, a: Vector3, b: Vector3, c: Vector3): void {
  const { size, extent, heights } = field
  const cell = (2 * extent) / size
  const toI = (x: number) => (x + extent) / cell - 0.5
  const minI = Math.max(0, Math.ceil(toI(Math.min(a.x, b.x, c.x))))
  const maxI = Math.min(size - 1, Math.floor(toI(Math.max(a.x, b.x, c.x))))
  const minJ = Math.max(0, Math.ceil(toI(Math.min(a.z, b.z, c.z))))
  const maxJ = Math.min(size - 1, Math.floor(toI(Math.max(a.z, b.z, c.z))))
  const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
  if (Math.abs(det) < 1e-6) return
  for (let j = minJ; j <= maxJ; j++) {
    const z = (j + 0.5) * cell - extent
    for (let i = minI; i <= maxI; i++) {
      const x = (i + 0.5) * cell - extent
      const w1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / det
      const w2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / det
      const w3 = 1 - w1 - w2
      if (w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4) continue
      const y = w1 * a.y + w2 * b.y + w3 * c.y
      const k = j * size + i
      if (y > (heights[k] ?? 0)) heights[k] = y
    }
  }
}

/**
 * Champ rastérisé depuis le nœud Mountain (repère du nœud : base à y = 0, centre en x = z = 0, mètres).
 * Ne garde que le dessus (hauteur maximale par cellule).
 */
export function fieldFromMesh(node: Object3D): MountainField {
  const field: MountainField = {
    size: FIELD_SIZE,
    extent: FIELD_EXTENT,
    heights: new Float32Array(FIELD_SIZE * FIELD_SIZE),
  }
  node.updateWorldMatrix(true, true)
  const inverse = node.matrixWorld.clone().invert()
  node.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const geometry = child.geometry as BufferGeometry
    const position = geometry.getAttribute('position')
    const relative = inverse.clone().multiply(child.matrixWorld)
    const index = geometry.getIndex()
    const count = index ? index.count : position.count
    for (let t = 0; t + 2 < count; t += 3) {
      const ia = index ? index.getX(t) : t
      const ib = index ? index.getX(t + 1) : t + 1
      const ic = index ? index.getX(t + 2) : t + 2
      va.fromBufferAttribute(position, ia).applyMatrix4(relative)
      vb.fromBufferAttribute(position, ib).applyMatrix4(relative)
      vc.fromBufferAttribute(position, ic).applyMatrix4(relative)
      rasterizeTriangle(field, va, vb, vc)
    }
  })
  return field
}

/** Hauteur locale de la montagne dressée (bilinéaire), 0 hors de l'emprise. */
export function fieldHeight(field: MountainField, x: number, z: number): number {
  const { size, extent, heights } = field
  const cell = (2 * extent) / size
  const fx = (x - MOUNTAIN.position[0] + extent) / cell - 0.5
  const fz = (z - MOUNTAIN.position[2] + extent) / cell - 0.5
  if (fx < 0 || fz < 0 || fx > size - 1 || fz > size - 1) return 0
  const i = Math.floor(fx)
  const j = Math.floor(fz)
  const tx = fx - i
  const tz = fz - j
  const i1 = Math.min(i + 1, size - 1)
  const j1 = Math.min(j + 1, size - 1)
  const h00 = heights[j * size + i] ?? 0
  const h10 = heights[j * size + i1] ?? 0
  const h01 = heights[j1 * size + i] ?? 0
  const h11 = heights[j1 * size + i1] ?? 0
  return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz
}

/** Relief de la plaine au CPU (dôme et bourrelet de GROUND_HEIGHT, sans les dunes). */
export type PlainState = { bulge: number; collar: number; collarRadius: number }

export function plainHeight(s: PlainState, x: number, z: number): number {
  const r = Math.hypot(x, z)
  const c = (r - s.collarRadius) / 330
  const bulge = s.bulge * 46 * Math.exp((-r * r) / (s.collarRadius * s.collarRadius * 0.85))
  return bulge + s.collar * 24 * Math.exp(-c * c)
}

/** Hauteur monde du terrain (montagne enfoncée de `sunk`, ou plaine). */
export function surfaceHeight(
  field: MountainField,
  plain: PlainState,
  sunk: number,
  x: number,
  z: number,
): number {
  const local = fieldHeight(field, x, z)
  const ground = plainHeight(plain, x, z)
  return local > 0.5 ? Math.max(ground, local - sunk) : ground
}

/**
 * Ligne de plus grande pente depuis (x, z) jusqu'au pied (hauteur locale < 15 m), rééchantillonnée en
 * `points` points ; renvoie les coordonnées locales (x, y, z) à plat, ou null si trop courte.
 */
export function descentPath(
  field: MountainField,
  x: number,
  z: number,
  points: number,
): Float32Array | null {
  const raw: number[] = []
  let px = x
  let pz = z
  const step = 18
  for (let n = 0; n < 400; n++) {
    const h = fieldHeight(field, px, pz)
    raw.push(px, h, pz)
    if (h < 15) break
    const gx = fieldHeight(field, px + 4, pz) - fieldHeight(field, px - 4, pz)
    const gz = fieldHeight(field, px, pz + 4) - fieldHeight(field, px, pz - 4)
    const g = Math.hypot(gx, gz)
    if (g < 1e-4) {
      // Plat : on file vers l'extérieur
      const r = Math.hypot(px, pz) || 1
      px += (px / r) * step
      pz += (pz / r) * step
    } else {
      px -= (gx / g) * step
      pz -= (gz / g) * step
    }
  }
  const count = raw.length / 3
  if (count < 6) return null
  // Longueurs cumulées puis rééchantillonnage régulier
  const lengths = new Float32Array(count)
  for (let k = 1; k < count; k++) {
    const dx = (raw[k * 3] ?? 0) - (raw[k * 3 - 3] ?? 0)
    const dy = (raw[k * 3 + 1] ?? 0) - (raw[k * 3 - 2] ?? 0)
    const dz = (raw[k * 3 + 2] ?? 0) - (raw[k * 3 - 1] ?? 0)
    lengths[k] = (lengths[k - 1] ?? 0) + Math.hypot(dx, dy, dz)
  }
  const total = lengths[count - 1] ?? 0
  const out = new Float32Array(points * 3)
  let k = 0
  for (let s = 0; s < points; s++) {
    const target = (s / (points - 1)) * total
    while (k < count - 2 && (lengths[k + 1] ?? 0) < target) k++
    const l0 = lengths[k] ?? 0
    const l1 = lengths[k + 1] ?? l0
    const t = l1 > l0 ? Math.min(1, (target - l0) / (l1 - l0)) : 0
    for (let c = 0; c < 3; c++) {
      const a = raw[k * 3 + c] ?? 0
      const b = raw[(k + 1) * 3 + c] ?? a
      out[s * 3 + c] = a + (b - a) * t
    }
  }
  return out
}
