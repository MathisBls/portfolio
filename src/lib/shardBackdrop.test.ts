import { describe, expect, it } from 'vitest'
import { BACKDROP_VIEWS, type BackdropView, layoutBackdrop } from './shardBackdrop'

const views = Object.keys(BACKDROP_VIEWS) as BackdropView[]

describe('fond de formes du chargement', () => {
  it('une vingtaine d’éclats par cadrage, chacun avec un contour et trois facettes', () => {
    for (const view of views) {
      const shards = layoutBackdrop(view)
      expect(shards).toHaveLength(20)
      for (const s of shards) {
        expect(s.outline).toMatch(/^M-?[\d.]+ -?[\d.]+(L-?[\d.]+ -?[\d.]+){2}Z$/)
        expect(s.facets.match(/M/g)).toHaveLength(3)
      }
    }
  })

  it('déterministe : même chaîne à chaque appel (rendu serveur = rendu client)', () => {
    for (const view of views) expect(layoutBackdrop(view)).toEqual(layoutBackdrop(view))
  })

  it('opacités d’un trait de verre de ShardField, quelques éclats teintés par le spectre', () => {
    for (const view of views) {
      const shards = layoutBackdrop(view)
      for (const s of shards) {
        expect(s.opacity).toBeGreaterThanOrEqual(0.28)
        expect(s.opacity).toBeLessThanOrEqual(0.7)
      }
      const tinted = shards.filter((s) => s.tint !== null)
      expect(tinted.length).toBeGreaterThanOrEqual(2)
      expect(tinted.length).toBeLessThanOrEqual(4)
      for (const s of tinted) expect(s.tint).toBeGreaterThanOrEqual(0)
    }
  })
})
