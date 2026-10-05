import { describe, expect, it } from 'vitest'
import { encodeForm, validateContact } from './form'

describe('encodeForm', () => {
  it('ajoute form-name et encode les champs', () => {
    const body = encodeForm({
      name: 'Léa Martin',
      email: 'lea@exemple.fr',
      message: 'Bonjour & merci',
    })
    const params = new URLSearchParams(body)
    expect(params.get('form-name')).toBe('contact')
    expect(params.get('name')).toBe('Léa Martin')
    expect(params.get('message')).toBe('Bonjour & merci')
  })
})

describe('validateContact', () => {
  it('accepte un message complet', () => {
    expect(validateContact({ name: 'Léa', email: 'lea@exemple.fr', message: 'Un site' })).toEqual(
      {},
    )
  })

  it('signale les champs vides et un email invalide', () => {
    expect(validateContact({ name: ' ', email: 'lea@', message: '' })).toEqual({
      name: 'required',
      email: 'email',
      message: 'required',
    })
    expect(validateContact({ name: 'Léa', email: '', message: 'x' })).toEqual({ email: 'required' })
  })
})
