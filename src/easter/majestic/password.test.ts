// Tests du détecteur du mot de passe et des tapes rapides (logique pure de password.ts).
import { describe, expect, it } from 'vitest'
import { PASSWORD, TAPS, TAP_GAP, createPassword, createTaps } from './password'

const feed = (keys: readonly string[]) => {
  const detector = createPassword()
  return keys.map((key) => detector.push(key))
}

describe('createPassword', () => {
  it('se déclenche sur la dernière lettre de « boulardtv », et seulement là', () => {
    const results = feed(Array.from(PASSWORD))
    expect(results.at(-1)).toBe(true)
    expect(results.slice(0, -1).every((r) => !r)).toBe(true)
  })

  it('est insensible à la casse', () => {
    expect(feed(Array.from('BoulardTV')).at(-1)).toBe(true)
    expect(feed(Array.from('BOULARDTV')).at(-1)).toBe(true)
  })

  it('ignore Maj et le verrouillage majuscules au milieu de la saisie', () => {
    expect(feed(['Shift', 'B', 'o', 'u', 'l', 'a', 'r', 'd', 'CapsLock', 'T', 'V']).at(-1)).toBe(
      true,
    )
  })

  it('tolère des caractères parasites avant le mot, et une lettre doublée au début', () => {
    expect(feed(Array.from('xyz boulardtv')).at(-1)).toBe(true)
    expect(feed(Array.from('bboulardtv')).at(-1)).toBe(true)
  })

  it('échoue si une lettre est fausse au milieu', () => {
    expect(feed(Array.from('boularxtv')).some(Boolean)).toBe(false)
  })

  it('Retour arrière corrige une faute de frappe', () => {
    expect(feed([...Array.from('boulard'), 'x', 'Backspace', 't', 'v']).at(-1)).toBe(true)
  })

  it('suit la progression pour le HUD et repart de zéro une fois le mot complet', () => {
    const detector = createPassword()
    expect(detector.progress()).toBe(0)
    Array.from('boul').forEach((key) => detector.push(key))
    expect(detector.progress()).toBeCloseTo(4 / PASSWORD.length)
    detector.push('x')
    expect(detector.progress()).toBe(0)
    detector.push('b')
    expect(detector.progress()).toBeCloseTo(1 / PASSWORD.length)
    Array.from('oulardtv').forEach((key) => detector.push(key))
    expect(detector.progress()).toBe(0)
  })

  it('peut se redéclencher après un succès', () => {
    expect(feed(Array.from(PASSWORD + PASSWORD)).filter(Boolean)).toHaveLength(2)
  })
})

describe('createTaps', () => {
  const at = (times: readonly number[]) => {
    const detector = createTaps()
    return times.map((t) => detector.push(String(t)))
  }

  it(`se déclenche à la ${String(TAPS)}e tape rapide`, () => {
    const results = at([0, 200, 400, 600, 800])
    expect(results.at(-1)).toBe(true)
    expect(results.slice(0, -1).every((r) => !r)).toBe(true)
  })

  it('repart de zéro si une tape arrive trop tard', () => {
    const late = TAP_GAP + 50
    expect(at([0, 200, 400, 400 + late, 600 + late, 800 + late]).some(Boolean)).toBe(false)
    expect(
      at([0, 200, 400, 400 + late, 600 + late, 800 + late, 1000 + late, 1200 + late]).at(-1),
    ).toBe(true)
  })

  it('suit la progression', () => {
    const detector = createTaps()
    detector.push('0')
    detector.push('100')
    expect(detector.progress()).toBeCloseTo(2 / TAPS)
  })
})
