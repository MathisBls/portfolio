import { type RefObject, useEffect } from 'react'
import { FINE_POINTER_QUERY, useMediaQuery } from './media'
import { trackPointer } from './trackPointer'
import { useReducedMotion } from './useReducedMotion'

type Options = {
  /** Inclinaison maximale, en degrés. */
  max: number
  /**
   * Zone qui reçoit le pointeur, si elle n'est pas la cible. À fournir dès que la cible bouge sous le
   * pointeur (sinon son bord qui s'incline la fait sortir puis rentrer en boucle).
   */
  host?: RefObject<HTMLElement | null>
}

/**
 * Inclinaison 3D de `target` selon la position du pointeur dans `host` : le hook écrit seulement
 * `--tilt-x` / `--tilt-y` (degrés, enregistrés dans global.css), le CSS de la cible compose le transform
 * et lisse avec sa transition. Retour à plat en sortie. Sans effet au tactile ni en reduced-motion.
 */
export function useTilt(target: RefObject<HTMLElement | null>, { max, host }: Options): void {
  const fine = useMediaQuery(FINE_POINTER_QUERY)
  const reduced = useReducedMotion()
  const active = fine && !reduced

  useEffect(() => {
    const element = target.current
    const area = host?.current ?? element
    if (!element || !area || !active) return

    const set = (x: number, y: number) => {
      element.style.setProperty('--tilt-x', x.toFixed(2))
      element.style.setProperty('--tilt-y', y.toFixed(2))
    }
    const stop = trackPointer(area, {
      measure: () => area.getBoundingClientRect(),
      // Le bord sous le pointeur s'enfonce : pointeur en bas -> le bas part vers l'arrière
      onMove: (offset) => {
        set(-offset.y * max, offset.x * max)
      },
      onLeave: () => {
        set(0, 0)
      },
    })
    return () => {
      stop()
      element.style.removeProperty('--tilt-x')
      element.style.removeProperty('--tilt-y')
    }
  }, [target, host, max, active])
}
