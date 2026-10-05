// Formulaire de contact (docs/storyboards/services-contact.md §4). Netlify Forms : il est dans le HTML
// prérendu, donc détecté au déploiement. Sans JS : POST natif (validation native du navigateur).
// Avec JS : validation maison (lib/form.ts), envoi en fetch, statuts annoncés en aria-live, motion pour
// les transitions (coupées en reduced-motion).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SubmitEvent } from 'react'
import { AnimatePresence, LazyMotion, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import { isFilled } from '../lib/content'
import { identity } from '../content/services'
import { site } from '../content/site'
import { CONTACT_FORM_NAME, encodeForm, validateContact } from '../lib/form'
import type { ContactErrors, ContactFields } from '../lib/form'
import { ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import buttonStyles from './Button.module.css'
import styles from './ContactForm.module.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const FIELD_ORDER = ['name', 'email', 'message'] as const satisfies readonly (keyof ContactFields)[]
const HONEYPOT = 'bot-field'

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
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({ ...fields, [HONEYPOT]: honeypot }),
      })
      setStatus(response.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
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
    void send(fields, readField(data, HONEYPOT))
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
              data-netlify="true"
              netlify-honeypot={HONEYPOT}
              aria-label={form.label}
              noValidate={hydrated}
              onSubmit={onSubmit}
              className={styles.form}
              exit={leave}
              transition={transition}
            >
              <input type="hidden" name="form-name" value={CONTACT_FORM_NAME} />
              <p className="sr-only">
                <label>
                  {form.honeypot}
                  <input name={HONEYPOT} tabIndex={-1} autoComplete="off" />
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

              <button
                type="submit"
                className={`${buttonStyles.button} ${styles.submit}`}
                data-variant="primary"
                aria-disabled={status === 'sending'}
              >
                {form.submit}
              </button>

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
                <a href="/mentions-legales/" className={styles.link}>
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
