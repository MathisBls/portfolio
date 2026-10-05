import { describe, expect, it } from 'vitest'
import { projects } from '../content/projects'
import { activeIndex, assignRays, hue, slotCenterY } from './projects'

describe('hue', () => {
  it('calcule la teinte des couleurs primaires', () => {
    expect(hue('#ff0000')).toBe(0)
    expect(hue('#00ff00')).toBe(120)
    expect(hue('#0000ff')).toBe(240)
    expect(hue('#808080')).toBe(0)
  })
})

describe('assignRays', () => {
  it('donne un rayon distinct à chaque projet', () => {
    const rays = assignRays(projects.map((p) => p.accent))
    expect(rays).toHaveLength(projects.length)
    expect(new Set(rays).size).toBe(projects.length)
    rays.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(7)
    })
  })

  it('associe chaque accent actuel au rayon de teinte la plus proche possible', () => {
    const bySlug = Object.fromEntries(
      projects.map((p, i) => [p.slug, assignRays(projects.map((q) => q.accent))[i]]),
    )
    expect(bySlug['game-factory']).toBe(0) // rouge
    expect(bySlug['meme-rina']).toBe(1) // orange
    expect(bySlug.wegir).toBe(2) // jaune
    expect(bySlug.zephyr).toBe(4) // bleu
    expect(bySlug.quorin).toBe(5) // indigo
  })
})

describe('slotCenterY', () => {
  const m = { left: 0, width: 400, height: 300, viewportH: 900 }

  it('part sous l’écran et finit au-dessus', () => {
    expect(slotCenterY(0, m)).toBe(1050)
    expect(slotCenterY(1, m)).toBe(-150)
  })

  it('est centré à mi-parcours', () => {
    expect(slotCenterY(0.5, m)).toBe(450)
  })
})

describe('activeIndex', () => {
  it('choisit le projet le plus proche du centre', () => {
    expect(activeIndex([0, 0.2, 0.55, 1])).toBe(2)
  })

  it('renvoie -1 si aucun projet n’est à l’écran', () => {
    expect(activeIndex([0, 0, 1])).toBe(-1)
  })
})
