// Mesure d'audience (décision de Mathis du 2026-10-09) : Umami Cloud, sans cookies ni données personnelles
// (pages vues, pays, appareil), donc sans bandeau de consentement. Script externe chargé en `defer` par
// head.ts, sur toutes les pages, et limité au domaine de production (`data-domains`) : rien n'est compté
// en local ni sur les liens de démo. Événement de conversion : envoi réussi du formulaire de contact.

export const UMAMI = {
  src: 'https://cloud.umami.is/script.js',
  websiteId: 'd673649e-2b12-425f-8b92-fe54d5d83418',
  domains: 'mathisboulais.com',
} as const

/** Balise du <head> (attributs statiques, aucune donnée du visiteur). */
export function analyticsTag(): string {
  return `<script defer src="${UMAMI.src}" data-website-id="${UMAMI.websiteId}" data-domains="${UMAMI.domains}"></script>`
}

type Umami = { track: (event: string, data?: Record<string, string>) => void }

/** Envoie un événement à Umami s'il est chargé (bloqueur de pub, local : rien, sans erreur). */
export function trackEvent(event: string, data?: Record<string, string>): void {
  const umami = (window as Window & { umami?: Umami }).umami
  try {
    umami?.track(event, data)
  } catch {
    // La mesure ne doit jamais casser le site
  }
}
