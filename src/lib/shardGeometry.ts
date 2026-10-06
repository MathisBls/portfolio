// Géométrie d'un éclat de verre du fond (docs/storyboards/story-v2.md, Métaphore : « Éclats de verre =
// la matière première » ; Contrats : « ShardField [...] un seul InstancedMesh »). Données pures, sans
// three, testées (src/lib/shards.test.ts) ; BufferGeometry construite par scene/objects/shardMaterial.ts.
// Forme : triangle irrégulier épais de quelques centièmes, biseauté sur ses deux faces, chaque face
// taillée en 3 facettes autour d'un sommet décentré. Les facettes et le biseau ont chacun leur normale :
// en tournant, ils accrochent la lumière l'un après l'autre. Rayon englobant ≈ 1 (l'échelle par instance
// règle la taille). Non indexée : normales plates (facettes nettes).
// Attribut `edge` : coordonnées barycentriques par triangle, pour dessiner les arêtes vives en shader
// (distance à l'arête la plus proche). Les diagonales des quads ne sont pas des arêtes : leur composante
// est fixée à 1 (jamais proche de 0).

type P2 = readonly [number, number]
type P3 = readonly [number, number, number]

export const SHARD_SHAPE = {
  /** Triangle de base, sens trigonométrique vu de +z, recentré sur son centroïde. */
  base: [
    [0.05, 1],
    [-0.82, -0.58],
    [0.9, -0.42],
  ] as readonly P2[],
  /** Anneau intérieur du biseau : triangle de base réduit de ce facteur vers le centroïde. */
  bevel: 0.2,
  /** Demi-épaisseur de la tranche (paroi verticale du bord). */
  wall: 0.025,
  /** Hauteur de l'anneau intérieur du biseau, dessus puis dessous. */
  ring: [0.075, -0.06] as const,
  /** Sommets des facettes, décentrés (irrégularité) : dessus puis dessous, relatifs au centroïde. */
  apex: [
    [0.14, -0.12, 0.16],
    [-0.12, 0.1, -0.11],
  ] as readonly P3[],
} as const

export type ShardGeometryData = {
  /** xyz par sommet, 3 sommets par triangle. */
  positions: Float32Array
  /** Barycentriques par sommet (composante à 1 : arête ignorée). */
  edges: Float32Array
  triangles: number
}

/** Diagonale de quad : indice (0, 1, 2) du sommet opposé à l'arête à ignorer, ou null. */
type Skip = 0 | 1 | 2 | null

const BARY: readonly P3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

export function buildShardGeometry(): ShardGeometryData {
  const base = SHARD_SHAPE.base
  const cx = base.reduce((s, p) => s + p[0], 0) / base.length
  const cy = base.reduce((s, p) => s + p[1], 0) / base.length
  const outer = base.map(([x, y]): P2 => [x - cx, y - cy])
  const inner = outer.map(([x, y]): P2 => [
    x * (1 - SHARD_SHAPE.bevel),
    y * (1 - SHARD_SHAPE.bevel),
  ])
  const n = outer.length

  const at = (p: P2 | undefined, z: number): P3 => [p?.[0] ?? 0, p?.[1] ?? 0, z]
  const w = SHARD_SHAPE.wall
  const [ringTop, ringBottom] = SHARD_SHAPE.ring
  const [apexTop, apexBottom] = SHARD_SHAPE.apex
  const topApex: P3 = apexTop ?? [0, 0, 0]
  const bottomApex: P3 = apexBottom ?? [0, 0, 0]

  const positions: number[] = []
  const edges: number[] = []
  const tri = (a: P3, b: P3, c: P3, skip: Skip = null) => {
    ;[a, b, c].forEach((v, k) => {
      positions.push(...v)
      const bary = BARY[k] ?? [0, 0, 0]
      edges.push(...bary.map((value, axis) => (axis === skip ? 1 : value)))
    })
  }
  // Quad a -> b -> c -> d (sens trigonométrique vu de l'extérieur), diagonale a–c ignorée
  const quad = (a: P3, b: P3, c: P3, d: P3) => {
    tri(a, b, c, 1)
    tri(a, c, d, 2)
  }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const pi = outer[i]
    const pj = outer[j]
    const qi = inner[i]
    const qj = inner[j]
    // Dessus : facettes autour du sommet, biseau, paroi, puis le dessous en miroir (ordre inversé)
    tri(at(qi, ringTop), at(qj, ringTop), topApex)
    quad(at(pi, w), at(pj, w), at(qj, ringTop), at(qi, ringTop))
    quad(at(pi, -w), at(pj, -w), at(pj, w), at(pi, w))
    quad(at(pj, -w), at(pi, -w), at(qi, ringBottom), at(qj, ringBottom))
    tri(at(qj, ringBottom), at(qi, ringBottom), bottomApex)
  }

  return {
    positions: new Float32Array(positions),
    edges: new Float32Array(edges),
    triangles: positions.length / 9,
  }
}
