// Helpers sur le contenu de src/content/. Une valeur "TODO: ..." n'est pas renseignée : elle reste
// visible là où le texte est affiché, mais ne produit jamais de lien ni de numéro cliquable.

export function isTodo(value: string | undefined): boolean {
  return value?.trimStart().startsWith('TODO') ?? false
}

export function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '' && !isTodo(value)
}

/** '07 82 07 17 88' -> 'tel:+33782071788' (numéros français à 10 chiffres). */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (/^0\d{9}$/.test(digits)) return `tel:+33${digits.slice(1)}`
  return `tel:${digits}`
}

/** 'https://www.memerina.fr/' -> 'memerina.fr' */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

/**
 * Numéro affiché selon la langue : '+33 7 82 07 17 88' -> '07 82 07 17 88' en français (format national),
 * inchangé en anglais. Un numéro non français reste tel quel.
 */
export function formatPhone(phone: string, locale: 'fr' | 'en'): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (locale !== 'fr' || !/^\+33\d{9}$/.test(digits)) return phone
  return `0${digits.slice(3)}`.replace(/(\d{2})(?=\d)/g, '$1 ')
}

/**
 * Montant en euros selon la langue, sans Intl (rendu identique au prerender Node et au navigateur) :
 * '€900' en anglais, '900 €' en français (espace insécable). `per` : suffixe de période ('/month', '/mois').
 */
export function formatEuros(amount: number, locale: 'fr' | 'en', per = ''): string {
  const value = String(amount)
  return locale === 'fr' ? `${value}\u00a0€${per}` : `€${value}${per}`
}
