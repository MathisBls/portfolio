// Placement des éclats de verre (scene/objects/ShardField.tsx), pur et déterministe (graine fixe : même
// rendu à chaque visite), testé (shards.test.ts). docs/storyboards/story-v2.md :
// - Contrats : « ShardField [...] ≈ 150 éclats desktop, ≈ 40 mobile » ; Reduced-motion : statique (une
//   dizaine d'éclats sur les côtés, aucune intro).
// - « Work : les éclats défilent en parallaxe » : colonne verticale autour du trajet de la caméra,
//   z ∈ [−10, −1], quelques éclats proches de la caméra (z ∈ [1.5, 4.5], sur les bords).
// - « Chargement : des éclats convergent et s'assemblent en prisme » : `intro`, du pourtour vers le
//   volume du prisme (docs/models.md, prism.glb : triangle sommet en haut, axe long sur z).
// - « Contact (arrivée) : les éclats se rassemblent autour de lui » : `crown` sur un éclat sur quatre.
import { type Vec3, lerp } from './math'
import { visibleHalfHeight } from './shards'

export type ShardMode = 'desktop' | 'mobile' | 'static'

export const SHARDS = {
  count: { desktop: 150, mobile: 40, static: 10 },
  intro: { desktop: 24, mobile: 14, static: 0 },
  seed: 0x5a4d,
  /** Caméra de la vue d'ensemble (cameraPath) : tailles et colonne sont calculées à cette distance. */
  refCameraZ: 12,
  z: [-10, -1],
  /** Un éclat sur `every` est proche de la caméra, sur les bords (parallaxe forte). */
  near: { every: 12, z: [1.5, 4.5], xFrac: [0.75, 1.1], size: [0.1, 0.2], alpha: 0.6 },
  /** |x| en fraction de la demi-largeur visible ; tirage en √ : plus dense sur les côtés. */
  xFrac: [0.06, 1.15],
  staticZ: [-7, -2],
  staticXFrac: [0.55, 0.95],
  /** Hauteur de la colonne de bouclage, en hauteurs d'écran. */
  columnScreens: 1.6,
  /** Rayon englobant à 12 de la caméra (tirage au carré : surtout des petits). */
  size: [0.1, 0.42],
  /** Échelle par palier : moins d'éclats, plus grands (reduced-motion : une dizaine, bien visibles). */
  sizeScale: { desktop: 1, mobile: 1.25, static: 1.6 },
  sliverShare: 0.3,
  stretch: { sliver: [1.8, 2.8], plain: [0.7, 1.4] },
  flat: [0.55, 1.25],
  spin: [0.08, 0.32],
  spinZ: [0.02, 0.1],
  parallax: [0.35, 1],
  alpha: [0.45, 1],
  /** Un éclat sur `tintEvery` porte une teinte du spectre ; un sur `crownEvery` rejoint la couronne. */
  tintEvery: 9,
  crownEvery: 4,
  crown: { radius: [1.35, 1.95], lift: 0.2, size: [0.12, 0.24] },
} as const

/** Ordre des teintes (index dans le spectre rouge -> violet) : bleu, violet, orange, indigo, rouge… */
const TINT_ORDER = [4, 6, 1, 5, 0, 3, 2] as const

/** Prisme (docs/models.md) : triangle dans XY, échelle du groupe (Prism.tsx, SCALE). */
const PRISM = {
  triangle: [
    [0, 0.974],
    [-0.851, -0.5],
    [0.851, -0.5],
  ],
  scale: 1.15,
  /** Part du triangle et demi-profondeur où les éclats d'intro se posent. */
  fill: 0.7,
  depth: 0.7,
} as const

/** Allure d'un éclat (matrice de forme et couleur), commune au champ et à l'intro. */
export type ShardLook = {
  /** Rapport largeur / hauteur dans le plan (à aire constante) : > 1.8 = éclat effilé. */
  stretch: number
  /** Épaisseur (× celle de la géométrie). */
  flat: number
  /** Rotation dans le plan avant l'étirement : varie la forme du triangle. */
  twist: number
  /** Index dans le spectre, ou null (verre neutre). */
  tint: number | null
}

export type CrownSlot = {
  angle: number
  radius: number
  lift: number
  /** Retard de départ dans [0, 1] (× CROWN.stagger). */
  delay: number
  size: number
}

export type FieldShard = ShardLook & {
  xFrac: number
  /** Position de départ dans la colonne (0 bas, 1 haut). */
  yFrac: number
  z: number
  /** Demi-hauteur visible à la distance de référence, et hauteur de la colonne de bouclage. */
  halfRef: number
  column: number
  size: number
  rotX: number
  rotY: number
  rotZ: number
  spinX: number
  spinY: number
  spinZ: number
  floatAmp: number
  floatFreq: number
  floatPhase: number
  parallax: number
  alpha: number
  crown: CrownSlot | null
}

export type IntroShard = ShardLook & {
  from: Vec3
  /** Point d'arrivée relatif au centre du prisme. */
  to: Vec3
  delay: number
  size: number
  rotX: number
  rotY: number
  /** Rotation ajoutée pendant le vol (rad), décroissante, et tourbillon autour du prisme (rad). */
  spin: number
  swirl: number
}

export type ShardLayout = { field: readonly FieldShard[]; intro: readonly IntroShard[] }

/** Générateur pseudo-aléatoire déterministe (mulberry32), valeurs dans [0, 1). */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Côtés alternés par paires décalées : les rôles (teinte, couronne, proche) tombent des deux côtés. */
export const sideOf = (i: number): -1 | 1 => ((i + (i >> 2)) % 2 === 0 ? -1 : 1)

export function layoutShards(mode: ShardMode, seed: number = SHARDS.seed): ShardLayout {
  const random = createRandom(seed)
  const between = ([a, b]: readonly [number, number]) => lerp(a, b, random())
  const signed = (r: readonly [number, number]) => between(r) * (random() < 0.5 ? -1 : 1)
  const look = (i: number): ShardLook => ({
    stretch: between(random() < SHARDS.sliverShare ? SHARDS.stretch.sliver : SHARDS.stretch.plain),
    flat: between(SHARDS.flat),
    twist: random() * Math.PI * 2,
    tint:
      i % SHARDS.tintEvery === SHARDS.tintEvery >> 1
        ? (TINT_ORDER[Math.floor(i / SHARDS.tintEvery) % TINT_ORDER.length] ?? null)
        : null,
  })

  const isStatic = mode === 'static'
  const count = SHARDS.count[mode]
  const crowns = isStatic ? [] : Array.from({ length: count }, (_, i) => i).filter(isCrown)
  const field: FieldShard[] = []
  for (let i = 0; i < count; i++) {
    const near = !isStatic && i % SHARDS.near.every === SHARDS.near.every - 1
    const z = near
      ? between(SHARDS.near.z)
      : isStatic
        ? between(SHARDS.staticZ)
        : lerp(SHARDS.z[0], SHARDS.z[1], random() ** 1.3)
    const ref = SHARDS.refCameraZ - z
    const halfRef = visibleHalfHeight(ref)
    const depth = (z - SHARDS.z[0]) / (SHARDS.near.z[1] - SHARDS.z[0])
    const xRange = near ? SHARDS.near.xFrac : isStatic ? SHARDS.staticXFrac : null
    const xAbs = xRange ? between(xRange) : lerp(...SHARDS.xFrac, Math.sqrt(random()))
    const crownIndex = crowns.indexOf(i)
    field.push({
      ...look(i),
      xFrac: sideOf(i) * xAbs,
      yFrac: (i + 0.15 + 0.7 * random()) / count,
      z,
      halfRef,
      column: SHARDS.columnScreens * 2 * halfRef,
      size:
        (near ? between(SHARDS.near.size) : lerp(...SHARDS.size, random() ** 2)) *
        (ref / SHARDS.refCameraZ) ** 0.85 *
        SHARDS.sizeScale[mode],
      rotX: random() * Math.PI * 2,
      rotY: random() * Math.PI * 2,
      rotZ: random() * Math.PI * 2,
      spinX: signed(SHARDS.spin),
      spinY: signed(SHARDS.spin),
      spinZ: signed(SHARDS.spinZ),
      floatAmp: between([0.04, 0.14]) * (ref / SHARDS.refCameraZ),
      floatFreq: between([0.3, 0.7]),
      floatPhase: random() * Math.PI * 2,
      parallax: lerp(...SHARDS.parallax, Math.min(1, Math.max(0, depth))),
      alpha: near
        ? SHARDS.near.alpha
        : lerp(...SHARDS.alpha, (z - SHARDS.z[0]) / (SHARDS.z[1] - SHARDS.z[0])),
      crown:
        crownIndex < 0
          ? null
          : {
              angle: ((crownIndex + 0.6 * random()) / crowns.length) * Math.PI * 2,
              radius: between(SHARDS.crown.radius),
              lift: signed([0, SHARDS.crown.lift]),
              delay: random(),
              size: between(SHARDS.crown.size),
            },
    })
  }

  const introCount = SHARDS.intro[mode]
  const intro: IntroShard[] = []
  for (let i = 0; i < introCount; i++) {
    const theta = ((i + 0.6 * random()) / introCount) * Math.PI * 2
    const radius = between([2, 4.4])
    intro.push({
      ...look(i + 1),
      from: [Math.cos(theta) * radius, Math.sin(theta) * radius * 0.75, between([-2, 2.5])],
      to: insidePrism(random(), random(), between([-PRISM.depth, PRISM.depth])),
      delay: between([0, 0.35]),
      size: between([0.16, 0.34]),
      rotX: random() * Math.PI * 2,
      rotY: random() * Math.PI * 2,
      spin: signed([2, 5]),
      swirl: signed([0.6, 1.2]),
    })
  }
  return { field, intro }
}

/** Un éclat sur crownEvery rejoint la couronne, jamais un éclat proche de la caméra. */
function isCrown(i: number): boolean {
  return i % SHARDS.crownEvery === 1 && i % SHARDS.near.every !== SHARDS.near.every - 1
}

/** Point uniforme dans le triangle du prisme (réduit de PRISM.fill), à la profondeur z. */
export function insidePrism(r1: number, r2: number, z: number): Vec3 {
  const [a, b, c] = PRISM.triangle
  const s = Math.sqrt(r1)
  const wa = 1 - s
  const wb = s * (1 - r2)
  const wc = s * r2
  const k = PRISM.scale * PRISM.fill
  // Centroïde du triangle ≈ (0, −0.009) : la réduction se fait autour de lui
  const x = wa * a[0] + wb * b[0] + wc * c[0]
  const y = wa * a[1] + wb * b[1] + wc * c[1]
  return [x * k, y * k, z]
}
