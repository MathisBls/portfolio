// Hooks partagés de la scène. Storyboard hero (docs/storyboards/hero.md) §7 : « useContinuousInvalidate
// (active) : seule boucle de rendu continu, coupée hors écran, en reduced-motion et onglet masqué ».
// Et §4 (ancre 'hero-title') : le DOM peut se monter après la scène, d'où useAnchor (réactif).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { type AnchorId, getAnchor, onAnchorsChange } from './store'

/**
 * frameloop="demand" : demande une frame à chaque frame tant que `active` est vrai et que l'onglet
 * est visible. À réserver aux animations continues visibles (flottement), jamais au scroll
 * (ScrollTrigger invalide déjà via setProgress).
 */
export function useContinuousInvalidate(active: boolean) {
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (!active) return
    // Relance la boucle au retour sur l'onglet (elle s'arrête d'elle-même quand il est masqué)
    const resume = () => {
      if (!document.hidden) invalidate()
    }
    resume()
    document.addEventListener('visibilitychange', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
    }
  }, [active, invalidate])

  useFrame(() => {
    if (active && !document.hidden) invalidate()
  })
}

/** Élément DOM enregistré sous `id` (registerAnchor), null tant qu'il n'est pas monté. */
export function useAnchor(id: AnchorId): HTMLElement | null {
  return useSyncExternalStore(
    onAnchorsChange,
    () => getAnchor(id) ?? null,
    () => null,
  )
}

/** true si `el` coupe le viewport. Sans élément : `fallback` (on ne sait pas, on suppose visible). */
export function useInView(el: Element | null, fallback = true): boolean {
  const [state, setState] = useState<{ el: Element; inView: boolean } | null>(null)

  useEffect(() => {
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry) setState({ el, inView: entry.isIntersecting })
    })
    io.observe(el)
    return () => {
      io.disconnect()
    }
  }, [el])

  if (!el) return fallback
  return state?.el === el ? state.inView : fallback
}
