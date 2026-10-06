import { type RefObject, useEffect } from 'react'
import { gsap } from './gsap'
import { FINE_POINTER_QUERY, useMediaQuery } from './media'
import { trackPointer } from './trackPointer'
import { useReducedMotion } from './useReducedMotion'

/** Attraction maximale vers le pointeur, en px. */
const PULL = 6

/**
 * Bouton magnétique : l'élément est attiré vers le pointeur (PULL px au plus, gsap.quickTo) et revient avec
 * un rebond élastique doux en sortie. Pilotée par le pointeur seulement : le focus clavier ne déplace rien.
 * Sans effet au tactile ni en reduced-motion. `enabled` permet de réserver l'effet à certaines variantes.
 */
export function useMagnetic(ref: RefObject<HTMLElement | null>, enabled = true): void {
  const fine = useMediaQuery(FINE_POINTER_QUERY)
  const reduced = useReducedMotion()
  const active = enabled && fine && !reduced

  useEffect(() => {
    const element = ref.current
    if (!element || !active) return

    let moveX: ReturnType<typeof gsap.quickTo> | undefined
    let moveY: ReturnType<typeof gsap.quickTo> | undefined

    const stop = trackPointer(element, {
      // Le rect inclut le décalage en cours (retour élastique non fini) : on le retire pour viser le vrai centre
      measure: () => {
        const rect = element.getBoundingClientRect()
        return {
          left: rect.left - Number(gsap.getProperty(element, 'x')),
          top: rect.top - Number(gsap.getProperty(element, 'y')),
          width: rect.width,
          height: rect.height,
        }
      },
      onEnter: () => {
        gsap.killTweensOf(element)
        moveX = gsap.quickTo(element, 'x', { duration: 0.35, ease: 'power3.out' })
        moveY = gsap.quickTo(element, 'y', { duration: 0.35, ease: 'power3.out' })
      },
      onMove: (offset) => {
        moveX?.(offset.x * PULL)
        moveY?.(offset.y * PULL)
      },
      onLeave: () => {
        gsap.killTweensOf(element)
        gsap.to(element, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)' })
      },
    })
    return () => {
      stop()
      gsap.killTweensOf(element)
      gsap.set(element, { clearProps: 'transform' })
    }
  }, [ref, active])
}
