/** Exécute fn quand le navigateur est libre (après le premier rendu), avec un plafond. */
export function whenIdle(fn: () => void, timeout = 1500): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout })
    return () => {
      window.cancelIdleCallback(id)
    }
  }
  const id = setTimeout(fn, 200)
  return () => {
    clearTimeout(id)
  }
}
