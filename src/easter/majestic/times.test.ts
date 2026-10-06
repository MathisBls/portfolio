// Tests des repères du second niveau (times.ts) : tous dérivés des repères mesurés de MajesticBTV
// (MAJESTIC_MARKS), dans l'ordre du storyboard, durées plausibles, fin après la dernière note.
import { describe, expect, it } from 'vitest'
import { MAJESTIC, MAJESTIC_MARKS } from './music'
import {
  ACCESS_TIME,
  BLACKOUT,
  MT,
  QUAKE_HITS,
  THANKS_HOLD,
  beatDurations,
  musicTime,
} from './times'

describe('repères du second niveau', () => {
  it('le beat 0 dure 3 s, puis la musique démarre', () => {
    expect(MT.music).toBe(ACCESS_TIME)
    expect(ACCESS_TIME).toBe(3)
    expect(MT.warm).toBeLessThan(MT.music)
    expect(musicTime(MT.music)).toBe(0)
  })

  it('cale chaque beat sur un repère mesuré de la musique', () => {
    expect(MT.entry).toBe(MT.music)
    expect(MT.plain).toBe(MT.music + MAJESTIC_MARKS.rise)
    expect(MT.quake).toBe(MT.music + MAJESTIC_MARKS.quake)
    expect(MT.choir).toBe(MT.music + MAJESTIC_MARKS.choir)
    expect(MT.prism).toBe(MT.music + MAJESTIC_MARKS.climax)
    expect(MT.exit).toBe(MT.music + MAJESTIC_MARKS.end)
    expect(MT.final).toBe(MT.music + MAJESTIC_MARKS.final)
    expect(MT.end).toBe(MT.final + BLACKOUT)
  })

  it('cale les rampes du séisme sur les coups sourds, entre le séisme et la montagne', () => {
    expect(QUAKE_HITS.length).toBeGreaterThanOrEqual(1)
    for (const hit of QUAKE_HITS) {
      expect(hit).toBeGreaterThan(MT.quake)
      expect(hit).toBeLessThan(MT.mountain)
    }
  })

  it('enchaîne les beats dans l’ordre, chacun assez long pour être lu', () => {
    const order = [MT.entry, MT.plain, MT.quake, MT.mountain, MT.choir, MT.prism, MT.exit, MT.end]
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1] ?? 0)
    }
    for (const duration of Object.values(beatDurations())) {
      expect(duration).toBeGreaterThanOrEqual(4)
    }
  })

  it('dure environ 2 minutes, de l’accès au retour à la page', () => {
    expect(MT.back).toBeGreaterThan(110)
    expect(MT.back).toBeLessThan(150)
  })

  it('finit après la dernière note : noir, message tenu, retour à la page', () => {
    expect(MT.final).toBeGreaterThan(MT.exit)
    expect(MT.end).toBeLessThanOrEqual(MT.music + MAJESTIC.duration)
    expect(MT.thanks).toBeGreaterThanOrEqual(MT.end)
    expect(MT.back).toBeGreaterThanOrEqual(MT.end + THANKS_HOLD)
    expect(MT.back).toBeGreaterThanOrEqual(MT.music + MAJESTIC.duration)
  })
})
