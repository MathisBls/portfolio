// Tests de la timeline du second niveau (timeline.ts) : hooks aux bons repères (musique, précompilation,
// message de fin, retour), valeurs de M bornées, lumières en rampes (aucun flash, WCAG 2.3.1), noir sur
// la dernière note, et en reduced-motion des valeurs posées seulement sous le noir.
import { afterEach, describe, expect, it } from 'vitest'
import { E, SHOT, resetEaster } from '../state'
import { M, resetMajestic } from './state'
import { MT } from './times'
import { buildMajesticTimeline } from './timeline'

type Calls = { name: string; at: number }[]

function build(reduced: boolean) {
  resetEaster(reduced, !reduced)
  resetMajestic(reduced, false, !reduced)
  E.shot = SHOT.park
  const calls: Calls = []
  let now = 0
  const log = (name: string) => () => {
    calls.push({ name, at: now })
  }
  const tl = buildMajesticTimeline({
    fadePark: log('fadePark'),
    music: log('music'),
    warm: log('warm'),
    thanks: log('thanks'),
    back: log('back'),
  })
  const step = 1 / 30
  const frames: { t: number; m: typeof M; fade: number; tint: number; shot: number }[] = []
  for (now = 0; now <= MT.back + 0.5; now += step) {
    tl.seek(now, false)
    const fade = Math.max(E.fade, M.fade)
    frames.push({ t: now, m: { ...M }, fade, tint: E.fadeTint, shot: E.shot })
  }
  tl.kill()
  return { calls, frames, step }
}

const LIGHTS = ['beams', 'spectrum', 'sculpt', 'aurora', 'collapse'] as const
const UNIT = [
  'access',
  'collapse',
  'entry',
  'plain',
  'quake',
  'cracks',
  'dust',
  'rise',
  'slide',
  'choir',
  'beams',
  'prism',
  'spectrum',
  'aurora',
  'sculpt',
  'outro',
  'fade',
] as const

afterEach(() => {
  resetEaster(false, true)
  resetMajestic(false, false, true)
})

describe('timeline complète', () => {
  const { calls, frames, step } = build(false)
  const at = (name: string) => calls.find((c) => c.name === name)?.at ?? -1

  it('appelle chaque hook une fois, à son repère', () => {
    for (const name of ['fadePark', 'music', 'warm', 'thanks', 'back']) {
      expect(calls.filter((c) => c.name === name)).toHaveLength(1)
    }
    expect(at('fadePark')).toBeLessThan(0.1)
    expect(at('warm')).toBeCloseTo(MT.warm, 1)
    expect(at('music')).toBeCloseTo(MT.music, 1)
    expect(at('thanks')).toBeCloseTo(MT.thanks, 1)
    expect(at('back')).toBeCloseTo(MT.back, 1)
  })

  it('bascule sur le Sanctuaire au départ de la musique, sous le voile', () => {
    const switched = frames.find((f) => f.shot === SHOT.majestic)
    expect(switched?.t).toBeGreaterThanOrEqual(MT.entry - step)
    expect(switched?.fade).toBeGreaterThan(0.95)
  })

  it('ne change jamais la teinte du voile quand il est visible (pas de saut blanc -> noir)', () => {
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]
      const b = frames[i]
      if (!a || !b || a.tint === b.tint) continue
      expect(Math.max(a.fade, b.fade)).toBeLessThan(0.02)
    }
  })

  it('garde toutes les valeurs de M entre 0 et 1', () => {
    for (const { m } of frames) {
      for (const key of UNIT) {
        expect(m[key]).toBeGreaterThanOrEqual(0)
        expect(m[key]).toBeLessThanOrEqual(1)
      }
    }
  })

  it('n’allume rien d’un coup : lumières en rampes (≤ 0.07 par image à 30 i/s)', () => {
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]
      const b = frames[i]
      if (!a || !b) continue
      for (const key of LIGHTS) {
        expect(Math.abs(b.m[key] - a.m[key])).toBeLessThanOrEqual(0.07)
      }
    }
  })

  it('finit au noir sur la dernière note, puis le message', () => {
    const end = frames.find((f) => f.t >= MT.end)
    expect(end?.fade).toBeCloseTo(1, 2)
    expect(at('thanks')).toBeGreaterThanOrEqual(MT.end)
  })
})

describe('timeline reduced-motion', () => {
  const { frames } = build(true)

  it('ne change les valeurs du décor que sous le noir (fondus entre plans fixes)', () => {
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]
      const b = frames[i]
      if (!a || b?.shot !== SHOT.majestic) continue
      for (const key of ['rise', 'choir', 'prism', 'spectrum', 'aurora', 'sculpt'] as const) {
        if (Math.abs(b.m[key] - a.m[key]) > 1e-6)
          expect(Math.max(a.fade, b.fade)).toBeGreaterThan(0.95)
      }
    }
  })

  it('ne tremble jamais (séisme nul)', () => {
    for (const { m } of frames) expect(m.quake).toBe(0)
  })
})
