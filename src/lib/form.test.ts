import { describe, expect, it } from 'vitest'
import {
  CONTACT_ENDPOINT,
  encodeForm,
  parseContactResponse,
  sendContact,
  validateContact,
} from './form'

const JSON_TYPE = 'application/json; charset=utf-8'
const FIELDS = { name: 'Léa Martin', email: 'lea@exemple.fr', message: 'Bonjour & merci' }

describe('encodeForm', () => {
  it('encode les champs, sans form-name', () => {
    const params = new URLSearchParams(encodeForm({ ...FIELDS, 'bot-field': '' }))
    expect(params.get('form-name')).toBeNull()
    expect(params.get('name')).toBe('Léa Martin')
    expect(params.get('message')).toBe('Bonjour & merci')
    expect(params.get('bot-field')).toBe('')
  })
})

describe('validateContact', () => {
  it('refuse un type de projet hors de la liste', () => {
    expect(
      validateContact({ name: 'Léa', email: 'lea@exemple.fr', type: 'casino', message: 'x' }),
    ).toEqual({ type: 'required' })
  })

  it('accepte un message complet', () => {
    expect(
      validateContact({
        name: 'Léa',
        email: 'lea@exemple.fr',
        type: 'website',
        message: 'Un site',
      }),
    ).toEqual({})
  })

  it('signale les champs vides et un email invalide', () => {
    expect(validateContact({ name: ' ', email: 'lea@', type: '', message: '' })).toEqual({
      name: 'required',
      email: 'email',
      type: 'required',
      message: 'required',
    })
    expect(validateContact({ name: 'Léa', email: '', type: 'shop', message: 'x' })).toEqual({
      email: 'required',
    })
  })
})

describe('parseContactResponse', () => {
  it('accepte { ok: true } en 200', () => {
    expect(parseContactResponse(200, JSON_TYPE, '{"ok":true}')).toEqual({ ok: true })
  })

  it("remonte l'erreur renvoyée par contact.php", () => {
    expect(parseContactResponse(429, JSON_TYPE, '{"ok":false,"error":"rate_limited"}')).toEqual({
      ok: false,
      error: 'rate_limited',
    })
    expect(parseContactResponse(500, JSON_TYPE, '{"ok":false}')).toEqual({
      ok: false,
      error: 'http_500',
    })
  })

  it('traite un 404, une page HTML ou le source PHP (dev : Vite ne l’exécute pas) comme un échec', () => {
    expect(parseContactResponse(404, 'text/html', '<!doctype html>')).toEqual({
      ok: false,
      error: 'unexpected_response_404',
    })
    // Réponse réelle de `npm run dev` : 200, Content-Type vide, source du fichier
    expect(parseContactResponse(200, '', '<?php\n// Formulaire')).toEqual({
      ok: false,
      error: 'unexpected_response_200',
    })
    expect(parseContactResponse(200, 'text/html; charset=utf-8', '<?php').ok).toBe(false)
    expect(parseContactResponse(404, null, '').ok).toBe(false)
  })

  it('refuse un JSON illisible, sans ok, ou ok: true hors 2xx', () => {
    expect(parseContactResponse(200, JSON_TYPE, 'oops')).toEqual({
      ok: false,
      error: 'invalid_json',
    })
    expect(parseContactResponse(200, JSON_TYPE, '[]')).toEqual({ ok: false, error: 'invalid_json' })
    expect(parseContactResponse(302, JSON_TYPE, '{"ok":true}').ok).toBe(false)
  })
})

describe('sendContact', () => {
  it('poste en urlencoded vers /contact.php et demande du JSON', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = []
    const fake: typeof fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      calls.push({ url, init })
      return Promise.resolve(
        new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': JSON_TYPE } }),
      )
    }
    await expect(sendContact(FIELDS, fake)).resolves.toEqual({ ok: true })
    const [call] = calls
    expect(call?.url).toBe(CONTACT_ENDPOINT)
    expect(call?.init?.method).toBe('POST')
    expect(new Headers(call?.init?.headers).get('Accept')).toBe('application/json')
    const body = call?.init?.body
    expect(new URLSearchParams(typeof body === 'string' ? body : '').get('email')).toBe(
      'lea@exemple.fr',
    )
  })

  it('renvoie un échec sans lever sur une erreur réseau ou un 404', async () => {
    const offline: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'))
    await expect(sendContact(FIELDS, offline)).resolves.toEqual({ ok: false, error: 'network' })
    const notFound: typeof fetch = () =>
      Promise.resolve(
        new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } }),
      )
    await expect(sendContact(FIELDS, notFound)).resolves.toEqual({
      ok: false,
      error: 'unexpected_response_404',
    })
  })
})
