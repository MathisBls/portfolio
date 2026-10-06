import { describe, expect, it } from 'vitest'
import { buildShardGeometry } from './shardGeometry'
import { SHARDS, createRandom, insidePrism, layoutShards, sideOf } from './shardLayout'
import {
  CROWN,
  INTRO,
  clearCenter,
  columnY,
  crownT,
  fieldFadeAt,
  fieldPace,
  introFlight,
  prismRevealAt,
  scrollBoost,
  visibleHalfHeight,
  wrap,
  PROJECTS_PRESENCE,
  fieldPresence,
} from './shards'

describe('buildShardGeometry', () => {
  const g = buildShardGeometry()

  it('donne 24 triangles, rayon englobant ≈ 1', () => {
    expect(g.triangles).toBe(24)
    expect(g.positions).toHaveLength(24 * 9)
    expect(g.edges).toHaveLength(24 * 9)
    let max = 0
    for (let i = 0; i < g.positions.length; i += 3) {
      max = Math.max(max, Math.hypot(g.positions[i] ?? 0, g.positions[i + 1] ?? 0))
    }
    expect(max).toBeGreaterThan(0.9)
    expect(max).toBeLessThan(1.1)
  })

  it('oriente toutes les faces vers l’extérieur (normales plates correctes)', () => {
    const p = g.positions
    for (let t = 0; t < g.triangles; t++) {
      const o = t * 9
      const v = (k: number) => p[o + k] ?? 0
      const e1 = [v(3) - v(0), v(4) - v(1), v(5) - v(2)]
      const e2 = [v(6) - v(0), v(7) - v(1), v(8) - v(2)]
      const n = [
        (e1[1] ?? 0) * (e2[2] ?? 0) - (e1[2] ?? 0) * (e2[1] ?? 0),
        (e1[2] ?? 0) * (e2[0] ?? 0) - (e1[0] ?? 0) * (e2[2] ?? 0),
        (e1[0] ?? 0) * (e2[1] ?? 0) - (e1[1] ?? 0) * (e2[0] ?? 0),
      ]
      const c = [(v(0) + v(3) + v(6)) / 3, (v(1) + v(4) + v(7)) / 3, (v(2) + v(5) + v(8)) / 3]
      const dot = (n[0] ?? 0) * (c[0] ?? 0) + (n[1] ?? 0) * (c[1] ?? 0) + (n[2] ?? 0) * (c[2] ?? 0)
      expect(dot).toBeGreaterThan(0)
    }
  })

  it('ignore une diagonale par triangle de quad, garde les vraies arêtes', () => {
    const e = g.edges
    let skipped = 0
    for (let t = 0; t < g.triangles; t++) {
      for (let axis = 0; axis < 3; axis++) {
        const values = [0, 1, 2].map((k) => e[t * 9 + k * 3 + axis])
        if (values.every((x) => x === 1)) skipped++
        else expect(values.filter((x) => x === 1)).toHaveLength(1)
      }
    }
    // 3 quads par côté du triangle (biseau dessus, paroi, biseau dessous) × 2 triangles
    expect(skipped).toBe(3 * 3 * 2)
  })
})

describe('layoutShards', () => {
  const desktop = layoutShards('desktop')
  const mobile = layoutShards('mobile')
  const still = layoutShards('static')

  it('donne 150 / 40 / 10 éclats et 24 / 14 / 0 éclats d’intro, toujours les mêmes', () => {
    expect(desktop.field).toHaveLength(150)
    expect(mobile.field).toHaveLength(40)
    expect(still.field).toHaveLength(10)
    expect(desktop.intro).toHaveLength(24)
    expect(mobile.intro).toHaveLength(14)
    expect(still.intro).toHaveLength(0)
    expect(layoutShards('desktop')).toEqual(desktop)
  })

  it('place le champ entre z −10 et −1, plus quelques éclats proches sur les bords', () => {
    const near = desktop.field.filter((s) => s.z > 0)
    expect(near.length).toBe(Math.floor(150 / SHARDS.near.every))
    for (const s of near) {
      expect(s.z).toBeGreaterThanOrEqual(1.5)
      expect(s.z).toBeLessThanOrEqual(4.5)
      expect(Math.abs(s.xFrac)).toBeGreaterThanOrEqual(0.75)
      expect(s.crown).toBeNull()
    }
    for (const s of desktop.field.filter((f) => f.z <= 0)) {
      expect(s.z).toBeGreaterThanOrEqual(-10)
      expect(s.z).toBeLessThanOrEqual(-1)
    }
  })

  it('équilibre les côtés, et chaque rôle tombe des deux côtés', () => {
    const left = desktop.field.filter((s) => s.xFrac < 0).length
    expect(left).toBeGreaterThan(65)
    expect(left).toBeLessThan(85)
    const sides = (list: readonly { xFrac: number }[]) =>
      new Set(list.map((s) => Math.sign(s.xFrac)))
    expect(sides(desktop.field.filter((s) => s.tint !== null)).size).toBe(2)
    expect(sides(desktop.field.filter((s) => s.crown !== null)).size).toBe(2)
    expect(sides(desktop.field.filter((s) => s.z > 0)).size).toBe(2)
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(sideOf)).toEqual([-1, 1, -1, 1, 1, -1, 1, -1])
  })

  it('teinte quelques éclats seulement, couronne d’un quart environ', () => {
    const tinted = desktop.field.filter((s) => s.tint !== null).length
    expect(tinted).toBeGreaterThanOrEqual(10)
    expect(tinted).toBeLessThanOrEqual(25)
    const crown = desktop.field.filter((s) => s.crown !== null)
    expect(crown.length).toBeGreaterThan(30)
    expect(crown.length).toBeLessThan(45)
    expect(still.field.every((s) => s.crown === null)).toBe(true)
    // Angles répartis sur tout le tour
    const angles = crown.map((s) => s.crown?.angle ?? 0).sort((a, b) => a - b)
    expect(angles[0]).toBeLessThan(0.5)
    expect(angles.at(-1)).toBeGreaterThan(Math.PI * 2 - 0.5)
  })

  it('statique : sur les côtés, jamais au centre', () => {
    for (const s of still.field) {
      expect(Math.abs(s.xFrac)).toBeGreaterThanOrEqual(0.55)
      expect(s.z).toBeLessThan(0)
    }
  })

  it('étale le champ sur toute la hauteur de la colonne', () => {
    const ys = desktop.field.map((s) => s.yFrac).sort((a, b) => a - b)
    ys.forEach((y, i) => {
      expect(Math.floor(y * desktop.field.length)).toBe(i)
    })
  })

  it('fait partir l’intro du pourtour et arriver dans le prisme', () => {
    for (const s of desktop.intro) {
      expect(Math.hypot(s.from[0], s.from[1] / 0.75)).toBeGreaterThanOrEqual(2)
      expect(Math.hypot(s.to[0], s.to[1])).toBeLessThan(0.85)
      expect(Math.abs(s.to[2])).toBeLessThanOrEqual(0.7)
      expect(s.delay + INTRO.travel + INTRO.fadeOutTail).toBeLessThanOrEqual(INTRO.duration + 1e-9)
    }
  })
})

describe('insidePrism', () => {
  it('reste dans le triangle du prisme réduit', () => {
    const random = createRandom(7)
    for (let i = 0; i < 200; i++) {
      const [x, y] = insidePrism(random(), random(), 0)
      expect(y).toBeLessThanOrEqual(0.974 * 1.15 * 0.7 + 1e-9)
      expect(y).toBeGreaterThanOrEqual(-0.5 * 1.15 * 0.7 - 1e-9)
      expect(Math.abs(x)).toBeLessThanOrEqual(0.851 * 1.15 * 0.7 + 1e-9)
    }
  })
})

describe('visibleHalfHeight / wrap / columnY', () => {
  it('suit tan(fov / 2) × distance', () => {
    expect(visibleHalfHeight(10, 90)).toBeCloseTo(10)
    expect(visibleHalfHeight(12)).toBeCloseTo(12 * Math.tan((35 * Math.PI) / 360))
  })

  it('boucle : sorti par le haut, l’éclat revient par le bas', () => {
    expect(wrap(-1, 4)).toBe(3)
    expect(wrap(3, 0)).toBe(0)
    expect(columnY(0.5, 0, 10)).toBeCloseTo(0)
    expect(columnY(0.5, 6, 10)).toBeCloseTo(-4)
    for (let o = -20; o < 20; o += 0.7) {
      const y = columnY(0.3, o, 10)
      expect(y).toBeGreaterThanOrEqual(-5)
      expect(y).toBeLessThan(5)
    }
  })
})

describe('clearCenter', () => {
  const zone = { cx: 0, cy: 0.1, rx: 0.4, ry: 0.7 }
  const out = { u: 0, v: 0 }

  it('ne bouge rien à force 0', () => {
    clearCenter(0.1, 0.2, zone, 0, 1, out)
    expect(out).toEqual({ u: 0.1, v: 0.2 })
  })

  it('sort tout point de l’ellipse à force 1, en gardant sa direction', () => {
    for (const [u, v] of [
      [0, 0.1],
      [0.1, 0.2],
      [-0.3, -0.4],
      [0.2, 0.7],
    ] as const) {
      clearCenter(u, v, zone, 1, -1, out)
      const r = Math.hypot((out.u - zone.cx) / zone.rx, (out.v - zone.cy) / zone.ry)
      expect(r).toBeGreaterThanOrEqual(1 - 1e-9)
      if (u !== 0) expect(Math.sign(out.u)).toBe(Math.sign(u))
    }
    // Pile au centre : part du côté demandé
    clearCenter(0, 0.1, zone, 1, -1, out)
    expect(out.u).toBeLessThan(0)
  })

  it('bouge à peine les points lointains', () => {
    clearCenter(1, 0.9, zone, 1, 1, out)
    expect(Math.abs(out.u - 1)).toBeLessThan(0.1)
  })
})

describe('intro', () => {
  const flight = { k: 0, alpha: 0 }

  it('vol : invisible avant son départ, arrive et s’efface avant la fin de l’intro', () => {
    introFlight(0.1, 0.2, flight)
    expect(flight.alpha).toBe(0)
    introFlight(0.2 + INTRO.travel / 2, 0.2, flight)
    expect(flight.alpha).toBe(1)
    expect(flight.k).toBeCloseTo(0.5)
    introFlight(0.2 + INTRO.travel, 0.2, flight)
    expect(flight.k).toBe(1)
    introFlight(INTRO.duration, 0.35, flight)
    expect(flight.alpha).toBe(0)
  })

  it('le prisme et le champ apparaissent pendant l’intro', () => {
    expect(prismRevealAt(0)).toBe(0)
    expect(prismRevealAt(INTRO.duration)).toBe(1)
    expect(fieldFadeAt(0)).toBe(0)
    expect(fieldFadeAt(INTRO.duration)).toBe(1)
  })
})

describe('couronne, allure, scroll', () => {
  it('rassemble après contact 0.3, avec des départs étalés', () => {
    expect(crownT(0.3, 0)).toBe(0)
    expect(crownT(0.29, 1)).toBe(0)
    expect(crownT(1, 1)).toBe(1)
    expect(crownT(CROWN.from + CROWN.span / 2, 0)).toBeGreaterThan(
      crownT(CROWN.from + CROWN.span / 2, 1),
    )
  })

  it('ralentit sur Services et About, reprend un peu au Contact', () => {
    expect(fieldPace(0.5)).toBe(1)
    expect(fieldPace(1.5)).toBe(1)
    expect(fieldPace(2.8)).toBeCloseTo(0.6)
    expect(fieldPace(3.8)).toBeCloseTo(0.45)
    expect(fieldPace(5)).toBeCloseTo(0.55)
  })

  it('accélère avec la vitesse du scroll, borné', () => {
    expect(scrollBoost(0)).toBe(0)
    expect(scrollBoost(-1250)).toBeCloseTo(0.75)
    expect(scrollBoost(1e6)).toBe(1.5)
  })
})

describe('fieldPresence', () => {
  it('atténue les éclats pendant les projets seulement', () => {
    expect(fieldPresence(0.5)).toBe(1)
    expect(fieldPresence(1.5)).toBeCloseTo(PROJECTS_PRESENCE)
    expect(fieldPresence(2.5)).toBe(1)
  })
})
