import { REDUCED_MOTION_QUERY, matches, useMediaQuery } from './media'

/** true si l'utilisateur demande moins d'animations : scrub coupé, état final statique, pas de Lenis. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY)
}

export function prefersReducedMotion(): boolean {
  return matches(REDUCED_MOTION_QUERY)
}
