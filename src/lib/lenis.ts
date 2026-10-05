// Lenis (smooth scroll) branché sur le ticker GSAP et ScrollTrigger.update. Une seule instance.
// Pas démarré en prefers-reduced-motion : le scroll natif reste.
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'

let lenis: Lenis | null = null

function raf(time: number) {
  lenis?.raf(time * 1000)
}

function stopLenis() {
  gsap.ticker.remove(raf)
  gsap.ticker.lagSmoothing(500, 33) // valeurs par défaut de GSAP
  lenis?.destroy()
  lenis = null
}

export function startLenis(): () => void {
  if (lenis) return stopLenis
  const instance = new Lenis({ lerp: 0.1, smoothWheel: true })
  instance.on('scroll', () => {
    ScrollTrigger.update()
  })
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)
  lenis = instance
  return stopLenis
}

/** Scroll doux vers une ancre ; natif si Lenis est coupé (reduced-motion). */
export function scrollToTarget(target: HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target)
    return
  }
  target.scrollIntoView({ block: 'start' })
}
