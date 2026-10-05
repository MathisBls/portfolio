import { describe, expect, it } from 'vitest'
import { displayUrl, isFilled, isTodo, telHref } from './content'

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
