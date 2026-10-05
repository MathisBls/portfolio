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
