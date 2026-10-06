import { useEffect, useState } from 'react'

/** Défilement minimal (px) avant de changer de direction : évite le clignotement au moindre tremblement. */
const SCROLL_STEP = 8
const TOP_ZONE = 80

/**
 * `hidden` : la barre se masque en descendant et revient en remontant (jamais dans les 80 premiers px).
 * `scrolled` : la page n'est plus tout en haut (voile dégradé derrière la barre).
 * Au consommateur d'ignorer `hidden` en reduced-motion, menu ouvert ou focus dans la barre.
 */
export function useHideOnScroll(): { hidden: boolean; scrolled: boolean } {
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let anchor = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (y < TOP_ZONE) {
        setHidden(false)
        anchor = y
        return
      }
      if (Math.abs(y - anchor) < SCROLL_STEP) return
      setHidden(y > anchor)
      anchor = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return { hidden, scrolled }
}
