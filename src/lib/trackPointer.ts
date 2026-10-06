// Suivi du pointeur au-dessus d'un élément (souris ou stylet, jamais le tactile).
// Le rect se mesure à l'entrée, pas à chaque mouvement. Seule exception : un scroll pendant le survol
// (molette, Lenis) décale l'élément sous le pointeur, on re-mesure alors une fois au mouvement suivant.
import { type Box, type Offset, pointerOffset } from './pointer'

type Options = {
  /** Mesure de la zone (appelée à l'entrée, puis au plus une fois par scroll). */
  measure: () => Box
  onEnter?: () => void
  onMove: (offset: Offset) => void
  onLeave: () => void
}

/** Écoute `host` ; renvoie la fonction de nettoyage. */
export function trackPointer(host: HTMLElement, { measure, onEnter, onMove, onLeave }: Options) {
  let inside = false
  let stale = true
  let box: Box | null = null

  const markStale = () => {
    stale = true
  }
  const handleEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    inside = true
    stale = true
    window.addEventListener('scroll', markStale, { passive: true })
    onEnter?.()
  }
  const handleMove = (event: PointerEvent) => {
    if (!inside) return
    if (stale || !box) {
      box = measure()
      stale = false
    }
    onMove(pointerOffset(box, event.clientX, event.clientY))
  }
  const handleLeave = () => {
    if (!inside) return
    inside = false
    box = null
    window.removeEventListener('scroll', markStale)
    onLeave()
  }

  host.addEventListener('pointerenter', handleEnter)
  host.addEventListener('pointermove', handleMove)
  host.addEventListener('pointerleave', handleLeave)
  return () => {
    host.removeEventListener('pointerenter', handleEnter)
    host.removeEventListener('pointermove', handleMove)
    host.removeEventListener('pointerleave', handleLeave)
    window.removeEventListener('scroll', markStale)
  }
}
