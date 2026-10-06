// Easter egg v3 (docs/storyboards/easter-park.md, « Tests sans son ») : raccourcis de test, en DEV
// seulement (import.meta.env.DEV, retiré du build) :
// - `?easter=1` lance la séquence au chargement, sans taper le code Konami (une fois par page) ;
// - `?easter-at=<secondes>` la démarre à ce temps (tl.seek dans useSequence.ts), et la lance aussi.
// Bundle initial : aucun import.

let started = false

function params(): URLSearchParams | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

/** Temps de départ demandé (s), null sans paramètre valide. */
export function debugStartAt(): number | null {
  const value = params()?.get('easter-at')
  if (value == null) return null
  const at = Number(value)
  return Number.isFinite(at) && at > 0 ? at : null
}

/** true une seule fois par page si l'URL demande de lancer la séquence. */
export function consumeDebugStart(): boolean {
  const p = params()
  if (!p || started) return false
  if (p.get('easter') !== '1' && debugStartAt() === null) return false
  started = true
  return true
}
