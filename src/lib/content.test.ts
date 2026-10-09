import { describe, expect, it } from 'vitest'
import { displayUrl, formatEuros, formatPhone, isFilled, isTodo, telHref } from './content'

describe('isTodo / isFilled', () => {
  it('repère les TODO', () => {
    expect(isTodo('TODO: url')).toBe(true)
    expect(isTodo('  TODO: x')).toBe(true)
    expect(isTodo('https://wegir.com')).toBe(false)
    expect(isTodo(undefined)).toBe(false)
  })

  it('considère vide, absent et TODO comme non renseignés', () => {
    expect(isFilled('07 82 07 17 88')).toBe(true)
    expect(isFilled('TODO: afficher ou non')).toBe(false)
    expect(isFilled('   ')).toBe(false)
    expect(isFilled(undefined)).toBe(false)
  })
})

describe('telHref', () => {
  it('convertit un numéro français au format international', () => {
    expect(telHref('07 82 07 17 88')).toBe('tel:+33782071788')
    expect(telHref('07.82.07.17.88')).toBe('tel:+33782071788')
  })

  it('laisse un numéro déjà international', () => {
    expect(telHref('+33 7 82 07 17 88')).toBe('tel:+33782071788')
  })
})

describe('displayUrl', () => {
  it('retire protocole, www et slash final', () => {
    expect(displayUrl('https://www.memerina.fr/')).toBe('memerina.fr')
    expect(displayUrl('https://github.com/MathisBls')).toBe('github.com/MathisBls')
  })
})

describe('formatPhone', () => {
  it('affiche un numéro français au format national en français', () => {
    expect(formatPhone('+33 7 82 07 17 88', 'fr')).toBe('07 82 07 17 88')
    expect(formatPhone('+33 1 84 16 23 40', 'fr')).toBe('01 84 16 23 40')
  })

  it('garde le format international en anglais et les numéros étrangers', () => {
    expect(formatPhone('+33 7 82 07 17 88', 'en')).toBe('+33 7 82 07 17 88')
    expect(formatPhone('+1 415 555 0100', 'fr')).toBe('+1 415 555 0100')
  })
})

describe('formatEuros', () => {
  it('place le symbole selon la langue', () => {
    expect(formatEuros(900, 'en')).toBe('€900')
    expect(formatEuros(900, 'fr')).toBe('900\u00a0€')
    expect(formatEuros(60, 'en', '/month')).toBe('€60/month')
    expect(formatEuros(60, 'fr', '/mois')).toBe('60\u00a0€/mois')
  })
})
