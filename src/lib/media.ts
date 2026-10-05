// Media queries partagées par le DOM et la scène. SSR : false côté serveur, à jour après hydratation.
import { useCallback, useSyncExternalStore } from 'react'

export const BREAKPOINTS = { sm: 640, md: 1024, lg: 1440 } as const

/** Mobile = écran tactile ou largeur < 1024 px : scène simplifiée (ni postprocessing ni transmission). */
export const MOBILE_QUERY = `(pointer: coarse), (max-width: ${BREAKPOINTS.md - 0.02}px)`
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function matches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => {
        mql.removeEventListener('change', onChange)
      }
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => matches(query),
    () => false,
  )
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
