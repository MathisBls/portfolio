// Typographie française, appliquée une fois au dictionnaire français (src/content/fr.ts) : les textes
// s'écrivent avec des espaces normales, la fonction pose les espaces insécables (U+00A0) avant : ; ? ! €
// et à l'intérieur des guillemets « ». Aucune dépendance.

const NBSP = '\u00a0'

/** Espaces insécables d'une chaîne française : « Délai : 24 h » ne se coupe jamais avant le « : ». */
export function frenchSpacing(text: string): string {
  return text.replace(/[ \u00a0]+([:;?!€»])/g, `${NBSP}$1`).replace(/«[ \u00a0]+/g, `«${NBSP}`)
}

function mapStrings(value: unknown, fix: (text: string) => string): unknown {
  if (typeof value === 'string') return fix(value)
  if (Array.isArray(value)) return (value as unknown[]).map((item) => mapStrings(item, fix))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, fix)]),
    )
  }
  return value
}

/** Applique frenchSpacing à toutes les chaînes d'un objet (copie profonde, même forme). */
export function typesetFrench<T>(value: T): T {
  return mapStrings(value, frenchSpacing) as T
}
