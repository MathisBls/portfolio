// Fond de formes du chargement (ui/ShardBackdrop.tsx) : une vingtaine d'éclats de verre en SVG, affichés
// avant que la scène 3D ne prenne le relais (html.has-scene). Mêmes formes, mêmes teintes et mêmes
// opacités que ShardField (scene/objects/shard*.ts, lib/shardLayout.ts) : triangle de SHARD_SHAPE étiré,
// tourné, avec ses facettes autour d'un sommet décentré ; verre neutre, une teinte du spectre sur
// quelques-uns ; petits et pâles au loin, grands et nets devant.
// Placement déterministe : générateur à graine et arithmétique seule (+ − × ÷ √, exactes en IEEE 754),
// pas de trigonométrie. Le serveur (prerender) et le navigateur écrivent donc les mêmes chiffres, sans
// écart d'hydratation. Testé (shardBackdrop.test.ts).
import { SHARD_SHAPE } from './shardGeometry'
import { createRandom } from './shardLayout'

/** Deux cadrages : paysage (écran large) et portrait (téléphone), pour que les éclats ne soient jamais rognés. */
export const BACKDROP_VIEWS = {
  wide: { width: 1600, height: 900 },
  tall: { width: 500, height: 1000 },
} as const

export type BackdropView = keyof typeof BACKDROP_VIEWS

export type BackdropShard = {
  /** Contour du triangle. */
  outline: string
  /** Trois traits du sommet décentré vers les angles : les facettes du verre. */
  facets: string
  /** Opacité (ShardField : 0.45 à 1 selon la profondeur, 0.6 pour les éclats proches). */
  opacity: number
  /** Index dans le spectre (--ray-0..6), ou null (verre neutre). */
  tint: number | null
}

const COUNT = 20
const SEED = 0x5a4d
/** Un éclat sur `TINT_EVERY` porte une teinte du spectre (même rôle que SHARDS.tintEvery). */
const TINT_EVERY = 7
/** Bleu, violet, orange : l'ordre de TINT_ORDER de shardLayout.ts. */
const TINTS = [4, 6, 1] as const

/** Zone dégagée (fractions de la largeur et de la hauteur) : le titre et le prisme restent propres. */
const CLEAR = {
  wide: { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.33 },
  tall: { cx: 0.5, cy: 0.45, rx: 0.6, ry: 0.22 },
} as const

/** Rayon englobant, en hauteurs de vue : petits au loin, quelques-uns moyens, deux grands devant. */
const SIZE = {
  wide: { far: [12, 38], mid: [42, 58], near: [64, 84] },
  tall: { far: [10, 32], mid: [36, 50], near: [58, 76] },
} as const

const round = (v: number) => (Math.round(v * 10) / 10).toFixed(1)

export function layoutBackdrop(view: BackdropView): BackdropShard[] {
  const { width, height } = BACKDROP_VIEWS[view]
  const clear = CLEAR[view]
  const sizes = SIZE[view]
  const random = createRandom(SEED + (view === 'wide' ? 0 : 1))
  const between = ([a, b]: readonly [number, number]) => a + (b - a) * random()

  const base = SHARD_SHAPE.base
  const cx0 = base.reduce((s, p) => s + p[0], 0) / base.length
  const cy0 = base.reduce((s, p) => s + p[1], 0) / base.length
  const corners = base.map(([x, y]) => [x - cx0, y - cy0] as const)
  const [apex = [0, 0, 0]] = SHARD_SHAPE.apex

  const placed: { x: number; y: number }[] = []
  const shards: BackdropShard[] = []
  for (let i = 0; i < COUNT; i++) {
    // Deux grands éclats devant, quatre moyens, le reste au loin
    const tier = i < 2 ? 'near' : i < 6 ? 'mid' : 'far'
    const radius = between(sizes[tier])
    // Position : tirage au rejet hors de la zone dégagée et à bonne distance des éclats déjà posés
    let x = 0
    let y = 0
    for (let attempt = 0; attempt < 60; attempt++) {
      x = (random() * 1.04 - 0.02) * width
      y = (random() * 1.04 - 0.02) * height
      const du = (x / width - clear.cx) / clear.rx
      const dv = (y / height - clear.cy) / clear.ry
      const apart = placed.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > (0.1 * height) ** 2)
      if (du * du + dv * dv > 1 && apart) break
    }
    placed.push({ x, y })

    // Orientation : vecteur unité tiré sans trigonométrie (normalisation par √)
    let a = random() * 2 - 1
    let b = random() * 2 - 1
    const norm = Math.sqrt(a * a + b * b) || 1
    a /= norm
    b /= norm
    // Étirement à aire constante : un éclat sur trois est effilé (ShardField : sliverShare 0.3)
    const stretch = random() < 0.3 ? 1.8 + random() : 0.7 + 0.7 * random()
    const sx = Math.sqrt(stretch) * radius
    const sy = (1 / Math.sqrt(stretch)) * radius
    const place = (px: number, py: number) => {
      const u = px * sx
      const v = py * sy
      return [x + u * a - v * b, y + u * b + v * a] as const
    }
    const points = corners.map(([px, py]) => place(px, py))
    const [ax, ay] = place(apex[0], apex[1])
    const [p0, p1, p2] = points
    if (!p0 || !p1 || !p2) continue

    shards.push({
      outline: `M${round(p0[0])} ${round(p0[1])}L${round(p1[0])} ${round(p1[1])}L${round(p2[0])} ${round(p2[1])}Z`,
      facets: points
        .map(([px, py]) => `M${round(ax)} ${round(ay)}L${round(px)} ${round(py)}`)
        .join(''),
      // Opacité : ShardField multiplie l'alpha (0.45 à 1, 0.6 pour les proches) par l'intensité des arêtes
      // (≈ 0.3 en moyenne) : à l'écran, un trait de verre fait 0.28 à 0.7 (0.45 pour les éclats proches)
      opacity: tier === 'near' ? 0.45 : Math.round((0.28 + 0.42 * random()) * 100) / 100,
      tint: i % TINT_EVERY === TINT_EVERY >> 1 ? (TINTS[Math.floor(i / TINT_EVERY)] ?? null) : null,
    })
  }
  return shards
}
