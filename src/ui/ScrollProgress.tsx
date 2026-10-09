// Indicateur de progression du scroll : remplace la barre de défilement de la page, masquée
// (styles/global.css, skill design-sans-ia). Un filet de 2 px sur le bord droit, qui descend avec la page.
// Piloté par un ScrollTrigger (0 -> 'max'), écrit en DOM direct : aucun état React, aucun rAF qui lit
// window.scrollY. Décoratif : aria-hidden. Marche aussi en reduced-motion (c'est un repère, pas un mouvement).
import { useLayoutEffect, useRef } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import styles from './ScrollProgress.module.css'

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const write = (self: ScrollTrigger) => {
      bar.style.transform = `scaleY(${self.progress.toFixed(4)})`
    }
    // 'max' : recalculé à chaque refresh (le pin du hero allonge la page)
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: write,
      onRefresh: write,
    })
    write(trigger)
    return () => {
      trigger.kill()
    }
  }, [])

  return (
    <div className={styles.track} aria-hidden="true">
      <div ref={barRef} className={styles.bar} />
    </div>
  )
}
