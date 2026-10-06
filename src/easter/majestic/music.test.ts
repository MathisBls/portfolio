// Tests des repères de la musique du Sanctuaire (music.ts) : source, durée du montage, repères croissants
// dans l'ordre du storyboard et dans le clip, tempo plausible, coups du séisme entre séisme et tutti.
import { describe, expect, it } from 'vitest'
import { MAJESTIC_SRC } from '../audio'
import { MAJESTIC, MAJESTIC_MARKS, MAJESTIC_QUAKE_HITS } from './music'

const M = MAJESTIC_MARKS

describe('MAJESTIC', () => {
  it('fichier du lecteur, montage d’environ 2 min à 2 min 15', () => {
    expect(MAJESTIC.src).toBe(MAJESTIC_SRC)
    expect(MAJESTIC.src).toBe('/audio/easter/majestic.mp3')
    expect(MAJESTIC.duration).toBeGreaterThanOrEqual(115)
    expect(MAJESTIC.duration).toBeLessThanOrEqual(135)
  })
})

describe('MAJESTIC_MARKS', () => {
  it('croissants dans l’ordre du storyboard, tous dans le clip', () => {
    const order = [M.rise, M.quake, M.orchestra, M.choir, M.climax, M.end, M.final]
    let previous = 0
    for (const mark of order) {
      expect(mark).toBeGreaterThan(previous)
      expect(mark).toBeLessThan(MAJESTIC.duration)
      previous = mark
    }
  })

  it('tempo plausible', () => {
    expect(60 / M.beat).toBeGreaterThan(60)
    expect(60 / M.beat).toBeLessThan(200)
  })

  it('coups du séisme croissants, entre `quake` et `orchestra`', () => {
    let previous: number = M.quake
    for (const hit of MAJESTIC_QUAKE_HITS) {
      expect(hit).toBeGreaterThan(previous)
      previous = hit
    }
    expect(previous).toBeLessThan(M.orchestra)
  })
})
