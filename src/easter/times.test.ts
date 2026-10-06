// Tests des repères de la séquence (times.ts) : synchro du prisme (correctif 1), route longue
// (correctif 2), lignes du message tapées en entier et tenues avant la suite (correctif 3), et repères
// des beats 4 à 7 dérivés des clips.
import { describe, expect, it } from 'vitest'
import { site } from '../content/site'
import { typingDuration } from './typing'
import {
  LINE_HOLD,
  R,
  ROAD_TIME,
  SUSPENSE,
  T,
  type Cue,
  clipStart,
  cueAt,
  lineCues,
  lineTypedAt,
  subtitleCues,
} from './times'
import { CLIPS, SPEAKER_MARKS } from './voice'

describe('beat 1 : prisme', () => {
  it('éclate au bout de 3 s de zoom, après une demi-seconde de silence', () => {
    expect(T.shatter - T.zoom).toBe(3)
    expect(T.shatter - T.hush).toBeCloseTo(0.5)
  })

  it('arène 0.8 s après l’éclatement, comme avant le zoom de 5 s (788666d)', () => {
    expect(T.arena - T.shatter).toBeCloseTo(0.8)
  })
})

describe('beat 3 : route', () => {
  it('dure 18 à 20 s, de la bascule à la sortie du warp', () => {
    expect(T.warp - T.road).toBe(ROAD_TIME)
    expect(ROAD_TIME).toBeGreaterThanOrEqual(18)
    expect(ROAD_TIME).toBeLessThanOrEqual(20)
  })
})

describe('message de la route : chaque ligne tapée en entier puis tenue', () => {
  for (const reduced of [false, true]) {
    it(`repère + durée de frappe + ${String(LINE_HOLD)} s ≤ repère suivant (${reduced ? 'reduced' : 'complète'})`, () => {
      const cues = lineCues(reduced)
      site.easter.lines.forEach((text, i) => {
        const at = cues[i]?.at ?? 0
        const next = cues[i + 1]?.at ?? 0
        const typed = at + (reduced ? 0 : typingDuration(text))
        expect(lineTypedAt(i, reduced)).toBeCloseTo(typed)
        expect(typed + LINE_HOLD).toBeLessThanOrEqual(next)
      })
    })
  }

  it('la dernière ligne s’efface à la sortie du warp, pas avant', () => {
    const cues = lineCues(false)
    expect(cues.at(-1)).toEqual({ at: T.warp, index: -1 })
    expect(cues).toHaveLength(site.easter.lines.length + 1)
  })

  it('lignes dans la route', () => {
    T.lines.forEach((at) => {
      expect(at).toBeGreaterThan(T.road)
      expect(at).toBeLessThan(T.warp)
    })
  })
})

describe('beats 4 à 7 : dérivés des clips', () => {
  it('Houston, silence de suspense, puis « BoulardTV. »', () => {
    expect(T.hold - T.houston).toBeCloseTo(CLIPS.houston.duration)
    expect(T.name - T.hold).toBeCloseTo(SUSPENSE)
    expect(SUSPENSE).toBeGreaterThanOrEqual(2)
    expect(SUSPENSE).toBeLessThanOrEqual(2.5)
  })

  it('la speakeuse après le mot ; portes, bienvenue et parc sur ses repères', () => {
    expect(T.speaker).toBeGreaterThan(T.name + CLIPS.houstonName.duration)
    expect(T.doors - T.speaker).toBeCloseTo(SPEAKER_MARKS.doors)
    expect(T.welcome - T.speaker).toBeCloseTo(SPEAKER_MARKS.welcome)
    expect(T.park - T.speaker).toBeCloseTo(SPEAKER_MARKS.shout)
  })

  it('ordre des beats', () => {
    const order = [T.road, T.warp, T.space, T.calm, T.houston, T.hold, T.name, T.speaker, T.park]
    order.forEach((at, i) => {
      const next = order[i + 1]
      if (next !== undefined) expect(next).toBeGreaterThan(at)
    })
    const reduced = [R.road, R.warp, R.space, R.houston, R.name, R.speaker, R.doors, R.park]
    reduced.forEach((at, i) => {
      const next = reduced[i + 1]
      if (next !== undefined) expect(next).toBeGreaterThan(at)
    })
  })

  it('début des clips', () => {
    expect(clipStart('houston', false)).toBe(T.houston)
    expect(clipStart('houstonName', false)).toBe(T.name)
    expect(clipStart('speaker', true)).toBe(R.speaker)
    expect(clipStart('park', false)).toBe(T.park)
  })
})

describe('sous-titres et saut de debug', () => {
  it('sous-titres triés, chacun après le début de son clip', () => {
    const cues = subtitleCues(false)
    cues.forEach((cue, i) => {
      const next = cues[i + 1]
      if (next) expect(next.at).toBeGreaterThanOrEqual(cue.at)
      expect(cue.at).toBeGreaterThanOrEqual(T.houston)
    })
  })

  it('cueAt : dernier changement avant t', () => {
    const cues: Cue[] = [
      { at: 1, index: 0 },
      { at: 2, index: -1 },
      { at: 3, index: 1 },
    ]
    expect(cueAt(cues, 0.5)).toBe(-1)
    expect(cueAt(cues, 1.5)).toBe(0)
    expect(cueAt(cues, 2.5)).toBe(-1)
    expect(cueAt(cues, 9)).toBe(1)
  })
})
