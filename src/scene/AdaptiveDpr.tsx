// Résolution adaptative (CLAUDE.md, règle 1 : 60 fps desktop) : sur un GPU modeste (PC portable, écran
// HiDPI), la densité de pixels baisse par paliers quand le rendu passe sous 50 i/s, et remonte
// lentement quand il tient 60. Mesure sur les images rendues d'affilée seulement : en frameloop
// "demand", un trou entre deux images (page immobile) n'est pas de la lenteur.
// Pas de drei PerformanceMonitor pour cette raison : il compterait les trous comme des chutes.
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

/** Écart au-delà duquel deux images ne sont pas consécutives (page immobile, onglet caché). */
const GAP = 0.2
/** Temps de rendu continu mesuré avant chaque décision (s). */
const WINDOW = 1
const STEP = 0.25
const LOW_FPS = 50
const HIGH_FPS = 58
/** Fenêtres fluides d'affilée avant de remonter d'un palier (hystérésis : pas d'oscillation). */
const CLIMB_AFTER = 4

type AdaptiveDprProps = { min?: number; max: number }

export function AdaptiveDpr({ min = 1, max }: AdaptiveDprProps) {
  const setDpr = useThree((s) => s.setDpr)
  const stats = useRef({ time: 0, frames: 0, smooth: 0 })

  useFrame(({ gl }, delta) => {
    if (delta > GAP) return
    const s = stats.current
    s.time += delta
    s.frames += 1
    if (s.time < WINDOW) return
    const fps = s.frames / s.time
    s.time = 0
    s.frames = 0
    const current = gl.getPixelRatio()
    if (fps < LOW_FPS) {
      s.smooth = 0
      if (current > min) setDpr(Math.max(min, current - STEP))
      return
    }
    if (fps < HIGH_FPS) {
      s.smooth = 0
      return
    }
    s.smooth += 1
    const ceiling = Math.min(max, window.devicePixelRatio)
    if (s.smooth >= CLIMB_AFTER && current < ceiling) {
      s.smooth = 0
      setDpr(Math.min(ceiling, current + STEP))
    }
  })

  return null
}
