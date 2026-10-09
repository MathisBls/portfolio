// Formulaire de contact : envoi vers public/contact.php (PHP chez alwaysdata), encodage, validation et
// lecture de la réponse, testés dans form.test.ts.

export const CONTACT_FORM_NAME = 'contact'

/** Servi par Apache/PHP en production. En dev, Vite ne l'exécute pas : la réponse est lue comme un échec. */
export const CONTACT_ENDPOINT = '/contact.php'

/** Champ piège : rempli par les robots, accepté sans envoi par contact.php (HONEYPOT). */
export const HONEYPOT_FIELD = 'bot-field'

/**
 * Types de projet du menu déroulant (libellés : site.contact.form.projectTypes). Valeurs identiques à
 * PROJECT_TYPES dans public/contact.php. `adult` : plateforme 18+, une pièce d'identité est demandée hors
 * du site (jamais par ce formulaire) avant tout travail. `devtools` : outil pour développeurs,
 * automatisation, agents IA (comme Game Factory), ajouté le 2026-10-09.
 */
export const PROJECT_TYPES = [
  'website',
  'shop',
  'webapp',
  'mobile',
  'redesign',
  'adult',
  'devtools',
  'other',
] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]

export const isProjectType = (value: string): value is ProjectType =>
  (PROJECT_TYPES as readonly string[]).includes(value)

export type ContactFields = { name: string; email: string; type: string; message: string }

/** Longueurs maximales (maxlength des champs), identiques à MAX_* dans public/contact.php. */
export const CONTACT_MAX = {
  name: 100,
  email: 254,
  type: 20,
  message: 5000,
} as const satisfies Record<keyof ContactFields, number>

export type ContactErrors = Partial<Record<keyof ContactFields, 'required' | 'email'>>

export type ContactResult = { ok: true } | { ok: false; error: string }

/** Corps urlencoded lu par contact.php ($_POST). Le honeypot vide est envoyé tel quel. */
export function encodeForm(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString()
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {}
  if (fields.name.trim() === '') errors.name = 'required'
  if (fields.email.trim() === '') errors.email = 'required'
  else if (!EMAIL.test(fields.email.trim())) errors.email = 'email'
  if (!isProjectType(fields.type)) errors.type = 'required'
  if (fields.message.trim() === '') errors.message = 'required'
  return errors
}

/**
 * Seul un JSON `{ ok: true }` avec un statut 2xx est un succès. Une page HTML, un 404 ou le source PHP
 * (dev : Vite le renvoie en 200 sans l'exécuter, Content-Type vide) est un échec, comme un JSON
 * `{ ok: false, error }`.
 */
export function parseContactResponse(
  status: number,
  contentType: string | null,
  body: string,
): ContactResult {
  if (contentType?.includes('application/json') !== true) {
    return { ok: false, error: `unexpected_response_${status}` }
  }
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return { ok: false, error: 'invalid_json' }
  }
  if (typeof data !== 'object' || data === null || !('ok' in data)) {
    return { ok: false, error: 'invalid_json' }
  }
  if (data.ok === true && status >= 200 && status < 300) return { ok: true }
  const error = 'error' in data && typeof data.error === 'string' ? data.error : `http_${status}`
  return { ok: false, error }
}

/** Poste le formulaire vers contact.php. Ne lève jamais : une erreur réseau est un échec. */
export async function sendContact(
  fields: Record<string, string>,
  request: typeof fetch = fetch,
): Promise<ContactResult> {
  try {
    const response = await request(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: encodeForm(fields),
    })
    const body = await response.text()
    return parseContactResponse(response.status, response.headers.get('Content-Type'), body)
  } catch {
    return { ok: false, error: 'network' }
  }
}
