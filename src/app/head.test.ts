import { describe, expect, it } from 'vitest'
import { renderHead } from './head'

describe('renderHead', () => {
  it('accueil français : titre, canonical, hreflang, og:locale, script de langue', () => {
    const head = renderHead({ locale: 'fr', kind: 'home' })
    expect(head).toContain('<title>Mathis Boulais · Création de sites internet')
    expect(head).toContain('<link rel="canonical" href="https://mathisboulais.com/" />')
    expect(head).toContain('href="https://mathisboulais.com/" hreflang="fr"')
    expect(head).toContain('href="https://mathisboulais.com/en/" hreflang="en"')
    expect(head).toContain('href="https://mathisboulais.com/" hreflang="x-default"')
    expect(head).toContain('<meta property="og:locale" content="fr_FR" />')
    expect(head).toContain('<meta property="og:locale:alternate" content="en_US" />')
    expect(head).toContain('content="https://mathisboulais.com/og/og-fr.jpg"')
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(head.indexOf('<script>')).toBe(0)
    expect(head).toContain('<link rel="manifest" href="/site.webmanifest" />')
    expect(head).toContain('<script type="application/ld+json">{')
  })

  it('mentions légales anglaises : URL anglaises, x-default vers le français, sans script', () => {
    const head = renderHead({ locale: 'en', kind: 'legal' })
    expect(head).toContain('<title>Legal notice · Mathis Boulais</title>')
    expect(head).toContain('<link rel="canonical" href="https://mathisboulais.com/en/legal/" />')
    expect(head).toContain('href="https://mathisboulais.com/mentions-legales/" hreflang="fr"')
    expect(head).toContain(
      'href="https://mathisboulais.com/mentions-legales/" hreflang="x-default"',
    )
    expect(head).toContain('<meta property="og:locale" content="en_US" />')
    expect(head).not.toContain('<script>')
  })
})
