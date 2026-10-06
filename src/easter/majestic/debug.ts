// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Debug, en DEV seulement ») :
// raccourcis de test, retirés du build (import.meta.env.DEV). La séquence est lancée par ../debug.ts.
// - `?majestic=1` : la séquence saute au final du parc, sans son, et le second niveau part aussitôt ;
// - `?majestic-at=<s>` : idem, le second niveau démarre à ce temps (s depuis le déclenchement) ;
// - `?majestic-armed=1` : avec `?easter-at`, le saut compte quand même comme « joué » (le mot de passe
//   est alors accepté au final), pour tester le vrai déclencheur sans regarder toute la séquence.
// Bundle initial : aucun import.

function params(): URLSearchParams | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

/** Temps de départ du second niveau demandé (s), null sans paramètre. */
export function debugMajesticAt(): number | null {
  const p = params()
  if (!p) return null
  const value = p.get('majestic-at')
  if (value != null) {
    const at = Number(value)
    return Number.isFinite(at) && at >= 0 ? at : 0
  }
  return p.get('majestic') === '1' ? 0 : null
}

/** Le saut de debug compte comme une séquence jouée jusqu'au bout. */
export function debugArmed(): boolean {
  return params()?.get('majestic-armed') === '1'
}
