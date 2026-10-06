import { type RefObject, useEffect } from 'react'
import { getLenis } from '../../lib/lenis'
import { BREAKPOINTS } from '../../lib/media'

/**
 * Menu mobile ouvert : page figée derrière (overflow du <html> et Lenis arrêté, sinon la molette au-dessus
 * de la barre ferait défiler la page), Échap ferme et rend le focus au bouton, le focus qui sort du header
 * ferme, repasser au-dessus de 1024 px ferme. `close` doit être stable (useCallback).
 */
export function useMenuDismiss(
  open: boolean,
  close: () => void,
  headerRef: RefObject<HTMLElement | null>,
  buttonRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    getLenis()?.stop()

    const wide = window.matchMedia(`(min-width: ${String(BREAKPOINTS.md)}px)`)
    const onWide = () => {
      if (wide.matches) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }
    const onFocusIn = (event: FocusEvent) => {
      const header = headerRef.current
      if (header && event.target instanceof Node && !header.contains(event.target)) close()
    }
    wide.addEventListener('change', onWide)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      html.style.overflow = previousOverflow
      // Instance relue à la fermeture : Lenis a pu être détruit entre-temps (reduced-motion)
      getLenis()?.start()
      wide.removeEventListener('change', onWide)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open, close, headerRef, buttonRef])
}
