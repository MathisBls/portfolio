// Le script inline est exécuté tel quel, avec un navigator, un localStorage et un location simulés.
import { describe, expect, it } from 'vitest'
import type { Locale } from '../content/locales'
import { langRedirectScript } from './langRedirect'

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36'

type Env = {
  languages?: string[]
  userAgent?: string
  stored?: string | null
  storageThrows?: boolean
  search?: string
  hash?: string
}

/** URL de redirection, ou null si la page reste. */
function run(here: Locale, env: Env): string | null {
  let target: string | null = null
  const navigator = { languages: env.languages, userAgent: env.userAgent ?? CHROME }
  const localStorage = {
    getItem: () => {
      if (env.storageThrows) throw new Error('SecurityError')
      return env.stored ?? null
    },
  }
  const location = {
    search: env.search ?? '',
    hash: env.hash ?? '',
    replace: (url: string) => {
      target = url
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- script inline exécuté tel quel
  const script = new Function(
    'navigator',
    'localStorage',
    'location',
    langRedirectScript(here),
  ) as (n: unknown, s: unknown, l: unknown) => void
  script(navigator, localStorage, location)
  return target
}

describe('langRedirectScript sur /', () => {
  it('reste en français si le navigateur contient une langue fr*', () => {
    expect(run('fr', { languages: ['fr-FR', 'en'] })).toBeNull()
    expect(run('fr', { languages: ['en-US', 'fr'] })).toBeNull()
    expect(run('fr', { languages: ['de', 'FR-ca'] })).toBeNull()
  })

  it('passe en anglais sans aucune langue fr*, en gardant requête et ancre', () => {
    expect(run('fr', { languages: ['en-US', 'en'] })).toBe('/en/')
    expect(run('fr', { languages: ['de-DE'], search: '?a=1', hash: '#contact' })).toBe(
      '/en/?a=1#contact',
    )
  })
})

describe('langRedirectScript sur /en/', () => {
  it('passe en français si le navigateur préfère fr', () => {
    expect(run('en', { languages: ['fr-FR', 'en'], hash: '#work' })).toBe('/#work')
  })

  it('reste en anglais sinon, même avec fr en seconde langue', () => {
    expect(run('en', { languages: ['en-US', 'fr'] })).toBeNull()
    expect(run('en', { languages: ['es'] })).toBeNull()
  })
})

describe('choix mémorisé et robots', () => {
  it('le choix mémorisé l’emporte sur le navigateur', () => {
    expect(run('fr', { languages: ['en-US'], stored: 'fr' })).toBeNull()
    expect(run('en', { languages: ['fr-FR'], stored: 'en' })).toBeNull()
    expect(run('fr', { languages: ['fr-FR'], stored: 'en' })).toBe('/en/')
    expect(run('en', { languages: ['en-US'], stored: 'fr' })).toBe('/')
  })

  it('ignore une valeur mémorisée inconnue et un stockage bloqué', () => {
    expect(run('fr', { languages: ['en-US'], stored: 'de' })).toBe('/en/')
    expect(run('fr', { languages: ['en-US'], storageThrows: true })).toBe('/en/')
  })

  it('ne redirige jamais un robot', () => {
    expect(run('fr', { languages: undefined })).toBeNull()
    expect(run('fr', { languages: [] })).toBeNull()
    const bots = [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/141.0 Safari/537.36',
      'Mozilla/5.0 Chrome-Lighthouse',
      'facebookexternalhit/1.1',
    ]
    for (const userAgent of bots) {
      expect(run('fr', { languages: ['en-US'], userAgent })).toBeNull()
    }
  })
})
