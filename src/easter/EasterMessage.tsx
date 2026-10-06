// Easter egg, beat 3 (docs/storyboards/easter-park.md, route) : message façon jeu vidéo sur la route, tapé
// lettre par lettre avec un caret qui clignote lentement (0.9 Hz, sous les 3 Hz), police mono avec un
// halo. La ligne affichée vient du store (easterLine, posée par la timeline aux repères T.lines) ; textes
// dans site.easter.lines, chaque ligne remplace la précédente. Cadence : typing.ts, horloge sans dérive
// (chaque lettre à son instant prévu, rattrapage si une image saute) : la durée réelle de frappe est
// celle que times.ts réserve (correctif 3 : la dernière ligne s'écrit en entier puis tient ≥ 1.5 s). Le texte tapé est aria-hidden : la ligne
// complète est annoncée une seule fois par la région aria-live de l'overlay (onLine). Un tic discret par
// lettre (cue 'type', coupé quand le son est muet). Reduced-motion : ligne affichée d'un bloc, caret fixe.
// Bundle initial : DOM seulement, aucun import de three.
import { useEffect, useRef } from 'react'
import { site } from '../content/site'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useScene } from '../scene/store'
import { getEngine } from './audio'
import styles from './EasterOverlay.module.css'
import { TYPING, letterGap } from './typing'

type LineProps = { text: string; reduced: boolean; onDone: (text: string) => void }

function TypedLine({ text, reduced, onDone }: LineProps) {
  const typed = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = typed.current
    if (!el) return
    if (reduced) {
      el.textContent = text
      onDone(text)
      return
    }
    let shown = 0
    // Instant prévu de la prochaine lettre (ms) : cumulé depuis le départ, jamais depuis l'image courante
    let next = performance.now() + TYPING.delay * 1000
    let raf = 0
    const tick = (now: number) => {
      if (now >= next) {
        // Rattrapage : toutes les lettres dues depuis la dernière image, un seul tic sonore
        let char = ''
        while (now >= next && shown < text.length) {
          char = text.charAt(shown)
          shown += 1
          next += letterGap(char) * 1000
        }
        el.textContent = text.slice(0, shown)
        if (char.trim()) getEngine()?.cue('type')
        if (shown >= text.length) {
          onDone(text)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [text, reduced, onDone])

  return (
    <p className={styles.message} aria-hidden="true">
      <span ref={typed} />
      <span className={styles.caret} />
    </p>
  )
}

type EasterMessageProps = { onLine: (text: string) => void }

export function EasterMessage({ onLine }: EasterMessageProps) {
  const line = useScene((s) => s.easterLine)
  const reduced = useReducedMotion()
  const text = site.easter.lines[line] ?? ''
  if (!text) return null
  return <TypedLine key={line} text={text} reduced={reduced} onDone={onLine} />
}
