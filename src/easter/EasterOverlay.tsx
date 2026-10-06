// Easter egg : écoute du code Konami (useKonami) et overlay accessible qui remplace la page pendant la
// séquence (bundle initial, pas de three). role="dialog" + aria-modal, focus sur « Exit » à l'ouverture
// et piégé dans l'overlay (Tab), Échap quitte à tout moment, bouton son (aria-pressed). La page
// derrière est inerte et aria-hidden (session.ts) ; elle ne s'efface visuellement qu'au début de la
// séquence (stage 'running').
// En fin de séquence (stage 'finale'), « Exit » est mis en avant et la page revient seule après 8 s.
import { type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { hasWebGL2 } from '../lib/webgl'
import { useScene } from '../scene/store'
import { isMuted, setMuted } from './audio'
import { EasterMessage } from './EasterMessage'
import styles from './EasterOverlay.module.css'
import { useKonami } from './konami'
import { beginEaster, endEaster, lockPage, setPageHidden } from './session'

/** Retour automatique à la page après la fin de la séquence. */
const AUTO_EXIT_MS = 8000
const text = site.easter

function useDialogKeys(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        endEaster()
        return
      }
      if (event.key !== 'Tab') return
      const buttons = Array.from(root.current?.querySelectorAll('button') ?? [])
      const first = buttons[0]
      const last = buttons.at(-1)
      if (!first || !last) return
      const active = document.activeElement
      const inside = active instanceof Node && root.current?.contains(active) === true
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [root])
}

function Dialog() {
  const stage = useScene((s) => s.easterStage)
  const [webgl] = useState(hasWebGL2)
  const [soundOn, setSoundOn] = useState(() => !isMuted())
  // Dernière ligne complète du message de la route, annoncée une fois (aria-live)
  const [announced, setAnnounced] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const exit = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const unlock = lockPage(el)
    exit.current?.focus({ preventScroll: true })
    return unlock
  }, [])

  useDialogKeys(root)

  const live = stage === 'running' || stage === 'finale'
  useEffect(() => {
    setPageHidden(live)
  }, [live])

  const done = stage === 'finale' || !webgl
  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(endEaster, AUTO_EXIT_MS)
    return () => {
      window.clearTimeout(id)
    }
  }, [done])

  const toggleSound = () => {
    setMuted(soundOn)
    setSoundOn(!soundOn)
  }

  const status = !webgl ? text.noWebGL : live ? null : text.loading

  return (
    <div
      ref={root}
      className={styles.overlay}
      data-easter-overlay=""
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className={styles.bar}>
        <p id={titleId} className={styles.label}>
          <span className={styles.dot} aria-hidden="true" />
          {text.label}
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            {text.sound}
            <span className={styles.state} aria-hidden="true">
              {soundOn ? text.soundOn : text.soundOff}
            </span>
          </button>
          <button
            ref={exit}
            type="button"
            className={`${styles.button} ${done ? styles.highlight : ''}`}
            onClick={endEaster}
          >
            {text.exit}
            <span className={styles.state}>{text.exitKey}</span>
          </button>
        </div>
      </div>
      <p id={descId} className="sr-only">
        {text.description}
      </p>
      <EasterMessage onLine={setAnnounced} />
      <p className="sr-only" aria-live="polite">
        {announced}
      </p>
      {status && (
        <p className={styles.status} role="status">
          {status}
        </p>
      )}
    </div>
  )
}

/** Écoute le code Konami (inactif pendant la séquence) et affiche l'overlay pendant la séquence. */
export function EasterOverlay() {
  const mode = useScene((s) => s.easter)
  useKonami(beginEaster, mode === 'idle')
  return mode === 'playing' ? <Dialog /> : null
}
