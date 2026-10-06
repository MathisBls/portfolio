// Formulaire de contact (docs/storyboards/services-contact.md §4). Envoi vers public/contact.php (PHP chez
// alwaysdata). Sans JS : POST natif vers contact.php (validation native du navigateur), qui répond par une
// page minimale. Avec JS : validation maison (lib/form.ts), envoi en fetch avec réponse JSON, statuts
// annoncés en aria-live, motion pour les transitions (coupées en reduced-motion). En dev, Vite ne sert
// pas le PHP : l'envoi aboutit à l'état d'erreur et à son lien email de secours.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SubmitEvent } from 'react'
import { AnimatePresence, LazyMotion, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import { isFilled } from '../lib/content'
import { identity } from '../content/services'
import { site } from '../content/site'
import {
  CONTACT_ENDPOINT,
  CONTACT_FORM_NAME,
  CONTACT_MAX,
  HONEYPOT_FIELD,
  sendContact,
  validateContact,
} from '../lib/form'
import type { ContactErrors, ContactFields } from '../lib/form'
import { ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useScene } from '../scene/store'
import styles from './ContactForm.module.css'
import { SubmitButton } from './SubmitButton'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const FIELD_ORDER = ['name', 'email', 'message'] as const satisfies readonly (keyof ContactFields)[]

type Status = 'idle' | 'sending' | 'success' | 'error'

const fieldId = (name: keyof ContactFields) => `${CONTACT_FORM_NAME}-${name}`

function readField(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

/** false au rendu serveur et à l'hydratation, true ensuite : le JS est là, la validation maison prend le relais. */
const subscribeNone = () => () => undefined
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNone,
    () => true,
    () => false,
  )
}

type FieldProps = {
  name: keyof ContactFields
  label: string
  error: string | undefined
  onEdit: (name: keyof ContactFields) => void
  type?: 'text' | 'email'
  autoComplete?: 'name' | 'email'
  multiline?: boolean
}

function Field({
  name,
  label,
  error,
  onEdit,
  type = 'text',
  autoComplete,
  multiline = false,
}: FieldProps) {
  const id = fieldId(name)
  const errorId = `${id}-error`
  const shared = {
    id,
    name,
    required: true,
    maxLength: CONTACT_MAX[name],
    className: styles.control,
    'aria-invalid': error !== undefined,
    'aria-describedby': errorId,
    onChange: () => {
      onEdit(name)
    },
  }
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={6} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} />
      )}
      <p id={errorId} className={styles.error}>
        {error}
      </p>
    </div>
  )
}

type MotionProps = { initial: false | { opacity: number; y: number }; transition: object }

/** Remplace le formulaire : prend le focus (lu par les lecteurs d'écran), sans contour visible. */
function Success({ initial, transition }: MotionProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <m.div
      ref={ref}
      role="status"
      tabIndex={-1}
      className={styles.success}
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      <p className={styles.successText}>{site.contact.form.success}</p>
    </m.div>
  )
}

export function ContactForm() {
  const { form } = site.contact
  const reduced = useReducedMotion()
  const hydrated = useHydrated()
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<ContactErrors>({})

  const transition = reduced ? { duration: 0 } : { duration: 0.4, ease: EASE }
  const enter = reduced ? false : ({ opacity: 0, y: 12 } as const)
  const leave = reduced ? { opacity: 0 } : { opacity: 0, y: -8 }

  const messageFor = (code: ContactErrors[keyof ContactFields]): string | undefined => {
    if (code === 'required') return form.required
    if (code === 'email') return form.invalidEmail
    return undefined
  }

  const clearError = (name: keyof ContactFields) => {
    setErrors((current) => {
      if (current[name] === undefined) return current
      const next: ContactErrors = {}
      for (const key of FIELD_ORDER) {
        const code = current[key]
        if (key !== name && code !== undefined) next[key] = code
      }
      return next
    })
  }

  const send = async (fields: ContactFields, honeypot: string) => {
    setStatus('sending')
    // sendContact ne lève jamais : réseau coupé, 404 ou HTML (dev) donnent { ok: false }
    const result = await sendContact({ ...fields, [HONEYPOT_FIELD]: honeypot })
    setStatus(result.ok ? 'success' : 'error')
    // La scène joue « l'idée traverse le prisme » (store sans three : rien de 3D importé ici)
    if (result.ok) useScene.getState().setIdeaSent()
  }

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'sending') return
    const element = event.currentTarget
    const data = new FormData(element)
    const fields: ContactFields = {
      name: readField(data, 'name').trim(),
      email: readField(data, 'email').trim(),
      message: readField(data, 'message').trim(),
    }
    const found = validateContact(fields)
    setErrors(found)
    const first = FIELD_ORDER.find((name) => found[name] !== undefined)
    if (first) {
      const control = element.elements.namedItem(first)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    void send(fields, readField(data, HONEYPOT_FIELD))
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={styles.root}>
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => {
            // Le formulaire est remplacé par un message plus court : la page raccourcit
            ScrollTrigger.refresh()
          }}
        >
          {status === 'success' ? (
            <Success key="success" initial={enter} transition={transition} />
          ) : (
            <m.form
              key="form"
              name={CONTACT_FORM_NAME}
              method="POST"
              action={CONTACT_ENDPOINT}
              aria-label={form.label}
              noValidate={hydrated}
              onSubmit={onSubmit}
              className={styles.form}
              exit={leave}
              transition={transition}
            >
              <p className="sr-only">
                <label>
                  {form.honeypot}
                  <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
                </label>
              </p>

              <Field
                name="name"
                label={form.name}
                autoComplete="name"
                error={messageFor(errors.name)}
                onEdit={clearError}
              />
              <Field
                name="email"
                label={form.email}
                type="email"
                autoComplete="email"
                error={messageFor(errors.email)}
                onEdit={clearError}
              />
              <Field
                name="message"
                label={form.message}
                multiline
                error={messageFor(errors.message)}
                onEdit={clearError}
              />

              <SubmitButton busy={status === 'sending'}>{form.submit}</SubmitButton>

              <div className={styles.status} aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  {status === 'sending' && (
                    <m.p
                      key="sending"
                      className={styles.statusText}
                      initial={enter}
                      animate={{ opacity: 1, y: 0 }}
                      exit={leave}
                      transition={transition}
                    >
                      {form.sending}
                    </m.p>
                  )}
                  {status === 'error' && (
                    <m.p
                      key="error"
                      className={`${styles.statusText} ${styles.statusError}`}
                      initial={enter}
                      animate={{ opacity: 1, y: 0 }}
                      exit={leave}
                      transition={transition}
                    >
                      {form.error}{' '}
                      {isFilled(identity.email) ? (
                        <a href={`mailto:${identity.email}`} className={styles.link}>
                          {identity.email}
                        </a>
                      ) : (
                        identity.email
                      )}
                    </m.p>
                  )}
                </AnimatePresence>
              </div>

              <p className={styles.privacy}>
                {form.privacy}{' '}
                <a href={site.legalPath} className={styles.link}>
                  {form.privacyLink}
                </a>
              </p>
            </m.form>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  )
}
