// Formulaire de contact (Netlify Forms) : encodage et validation purs, testés dans form.test.ts.

export const CONTACT_FORM_NAME = 'contact'

export type ContactFields = { name: string; email: string; message: string }

export type ContactErrors = Partial<Record<keyof ContactFields, 'required' | 'email'>>

/** Corps urlencoded attendu par Netlify Forms (avec form-name). Le honeypot vide est envoyé tel quel. */
export function encodeForm(fields: Record<string, string>, formName = CONTACT_FORM_NAME): string {
  return new URLSearchParams({ 'form-name': formName, ...fields }).toString()
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {}
  if (fields.name.trim() === '') errors.name = 'required'
  if (fields.email.trim() === '') errors.email = 'required'
  else if (!EMAIL.test(fields.email.trim())) errors.email = 'email'
  if (fields.message.trim() === '') errors.message = 'required'
  return errors
}
