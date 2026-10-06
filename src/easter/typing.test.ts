// Tests de la cadence de frappe du message de la route (typing.ts).
import { describe, expect, it } from 'vitest'
import { TYPING, letterGap, letterTime, typingDuration } from './typing'

describe('durée de frappe', () => {
  it('ligne vide : 0, une lettre : le délai initial', () => {
    expect(typingDuration('')).toBe(0)
    expect(typingDuration('a')).toBeCloseTo(TYPING.delay)
  })

  it('une lettre de plus par pas, sans compter la pause après la dernière', () => {
    expect(typingDuration('abc')).toBeCloseTo(TYPING.delay + 2 * TYPING.step)
    expect(typingDuration('ab.')).toBeCloseTo(typingDuration('abc'))
  })

  it('les ponctuations ajoutent une pause, les points de suspension la plus longue', () => {
    expect(letterGap('…')).toBeGreaterThan(letterGap('.'))
    expect(letterGap('.')).toBeGreaterThan(letterGap(','))
    expect(letterGap(',')).toBeGreaterThan(letterGap('a'))
    expect(typingDuration('a…b')).toBeCloseTo(TYPING.delay + 2 * TYPING.step + 0.42)
  })

  it('instants des lettres croissants, la dernière à la durée de frappe', () => {
    const text = 'Well… almost.'
    let last = -1
    for (let i = 0; i < text.length; i++) {
      const at = letterTime(text, i)
      expect(at).toBeGreaterThan(last)
      last = at
    }
    expect(last).toBeCloseTo(typingDuration(text))
  })
})
