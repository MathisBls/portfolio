// Bouton d'envoi du formulaire : même pill primaire que Button, donc magnétique aussi.
// aria-disabled et non disabled : le bouton garde le focus pendant l'envoi (ContactForm.module.css).
import { useRef } from 'react'
import { useMagnetic } from '../lib/useMagnetic'
import buttonStyles from './Button.module.css'
import styles from './ContactForm.module.css'

export function SubmitButton({ busy, children }: { busy: boolean; children: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  useMagnetic(ref)
  return (
    <button
      ref={ref}
      type="submit"
      className={`${buttonStyles.button} ${styles.submit}`}
      data-variant="primary"
      aria-disabled={busy}
    >
      {children}
    </button>
  )
}
