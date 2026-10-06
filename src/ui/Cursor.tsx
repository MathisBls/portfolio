// Anneau qui suit la souris (gsap.quickTo, léger retard) et grossit sur les éléments cliquables.
// Le curseur natif reste affiché : l'anneau est un complément décoratif. Rendu seulement avec un pointeur
// fin et hors reduced-motion ; useMediaQuery vaut false au prerender et à l'hydratation, donc l'anneau
// n'existe qu'après (aucun écart serveur/client).
// Les attributs data-visible / data-hover sont posés à la main : pas de rendu React par mouvement.
import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { FINE_POINTER_QUERY, useMediaQuery } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import styles from './Cursor.module.css'

/** Ce qui fait grossir l'anneau. */
const INTERACTIVE = 'a, button, [data-cursor]'

export function Cursor() {
  const fine = useMediaQuery(FINE_POINTER_QUERY)
  const reduced = useReducedMotion()
  const active = fine && !reduced
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !active) return

    const moveX = gsap.quickTo(element, 'x', { duration: 0.35, ease: 'power3.out' })
    const moveY = gsap.quickTo(element, 'y', { duration: 0.35, ease: 'power3.out' })
    const root = document.documentElement
    let placed = false

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!placed) {
        // Première position (ou retour dans la fenêtre) : pas de glissade depuis l'ancienne place
        placed = true
        gsap.set(element, { x: event.clientX, y: event.clientY })
        element.setAttribute('data-visible', '')
      }
      moveX(event.clientX)
      moveY(event.clientY)
    }
    const onOver = (event: PointerEvent) => {
      const { target } = event
      const interactive = target instanceof Element && target.closest(INTERACTIVE) !== null
      element.toggleAttribute('data-hover', interactive)
    }
    const onLeave = () => {
      placed = false
      element.removeAttribute('data-visible')
      element.removeAttribute('data-hover')
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    root.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      root.removeEventListener('pointerleave', onLeave)
      gsap.killTweensOf(element)
    }
  }, [active])

  if (!active) return null
  return (
    <div ref={ref} className={styles.cursor} aria-hidden="true">
      <div className={styles.ring} />
    </div>
  )
}
