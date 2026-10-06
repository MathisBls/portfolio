// Easter egg : écoute du code Konami (useKonami) et overlay accessible qui remplace la page pendant la
// séquence (bundle initial, pas de three). role="dialog" + aria-modal, focus sur « Exit » à l'ouverture
// et piégé dans l'overlay (Tab), Échap quitte à tout moment, bouton son (aria-pressed). La page
// derrière est inerte et aria-hidden (session.ts) ; elle ne s'efface visuellement qu'au début de la
// séquence (stage 'running').
// En fin de séquence (stage 'finale'), « Exit » est mis en avant ; la page revient seule à la fin de la
// musique du parc (useSequence.ts), ou après 8 s sans WebGL.
// Sous-titres des voix (EasterSubtitles) en bas ; une seule région aria-live pour le message de la route
// et, son coupé, les sous-titres (en français : lang="fr" sur l'annonce).
// Second niveau (docs/storyboards/easter-majestic.md, « Déclencheur ») : pendant le final, si la séquence
// a été jouée jusqu'au bout (easterPlayed), `boulardtv` au clavier ou 5 tapes rapides sur l'overlay
// (couche de tapes sous la barre) débloquent la musique dans le geste (unlockMajestic), passent au stage
// 'majestic' et annoncent « Secret level unlocked ». Le retour automatique est alors coupé (useSequence) ;
// la fin du second niveau affiche THANKS FOR PLAYING (EasterMessage) puis ramène la page.
import {
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { site } from '../content/site'
import { hasWebGL2 } from '../lib/webgl'
import { useScene } from '../scene/store'
import { isMuted, setMuted, unlockMajestic } from './audio'
import { EasterMessage } from './EasterMessage'
import styles from './EasterOverlay.module.css'
import { EasterSubtitles } from './EasterSubtitles'
import { useKonami } from './konami'
import { useMajesticTrigger } from './majestic/trigger'
import { beginEaster, endEaster, lockPage, setPageHidden } from './session'

/** Retour automatique à la page après la fin de la séquence. */
const AUTO_EXIT_MS = 8000
const text = site.easter

/** Annonce de la région aria-live : ligne de la route (anglais) ou sous-titre (français). */
type Announce = { text: string; lang?: string }

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
  // Dernière ligne complète du message de la route ou sous-titre (son coupé), annoncé une fois
  const [announced, setAnnounced] = useState<Announce>({ text: '' })
  // Stables : EasterMessage relance sa frappe si son callback change
  const announceLine = useCallback((line: string) => {
    setAnnounced({ text: line })
  }, [])
  const announceSubtitle = useCallback((subtitle: string) => {
    setAnnounced({ text: subtitle, lang: 'fr' })
  }, [])
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

  const live = stage === 'running' || stage === 'finale' || stage === 'majestic'
  useEffect(() => {
    setPageHidden(live)
  }, [live])

  // Second niveau : mot de passe ou tapes rapides pendant le final d'une séquence jouée en entier
  const played = useScene((s) => s.easterPlayed)
  const armed = webgl && stage === 'finale' && played
  const unlock = useCallback(() => {
    // Dans le geste (keydown, pointerup) : la musique du second niveau est débloquée ici (iOS)
    unlockMajestic()
    useScene.getState().setEasterStage('majestic')
    setAnnounced({ text: text.majestic.unlocked })
  }, [])
  const onTap = useMajesticTrigger(armed, unlock)

  const done = stage === 'finale' || !webgl
  // Sans WebGL : retour automatique. Avec la séquence, c'est la timeline qui ramène la page à la fin
  // de la musique du parc (useSequence.ts) : le final reste affiché tant qu'elle joue.
  useEffect(() => {
    if (webgl) return
    const id = window.setTimeout(endEaster, AUTO_EXIT_MS)
    return () => {
      window.clearTimeout(id)
    }
  }, [webgl])

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
      {armed && (
        <div
          className={styles.taps}
          aria-hidden="true"
          onPointerUp={(event) => {
            onTap(event.timeStamp)
          }}
        />
      )}
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
      <EasterMessage onLine={announceLine} />
      <EasterSubtitles soundOn={soundOn} onAnnounce={announceSubtitle} />
      <p className="sr-only" aria-live="polite" lang={announced.lang}>
        {announced.text}
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
