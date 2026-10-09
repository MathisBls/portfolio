import { describe, expect, it } from 'vitest'
import { formatParisTime, msUntilNextMinute } from './parisTime'

describe('heure de Paris', () => {
  it('heure d’été : UTC+2', () => {
    expect(formatParisTime(new Date('2026-10-09T12:32:10Z'), 'fr')).toBe('14:32')
    expect(formatParisTime(new Date('2026-10-09T12:32:10Z'), 'en')).toBe('14:32')
  })

  it('heure d’hiver : UTC+1, minuit affiché 00:xx (24 h)', () => {
    expect(formatParisTime(new Date('2026-01-15T12:32:00Z'), 'fr')).toBe('13:32')
    expect(formatParisTime(new Date('2026-01-14T23:05:00Z'), 'en')).toBe('00:05')
  })

  it('le prochain changement de minute tombe dans ]0, 60000]', () => {
    expect(msUntilNextMinute(0)).toBe(60_000)
    expect(msUntilNextMinute(59_999)).toBe(1)
    expect(msUntilNextMinute(1_700_000_030_000)).toBeGreaterThan(0)
    expect(msUntilNextMinute(1_700_000_030_000)).toBeLessThanOrEqual(60_000)
  })
})
