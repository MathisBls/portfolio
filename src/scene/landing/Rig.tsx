// Brief agent V du 2026-10-09, visionneuse des pages d'atterrissage : « rotation lente automatique ; on
// peut faire glisser pour tourner (limité en angle, avec amortissement et retour doux) et le modèle
// réagit au survol ».
// Empilement (de l'extérieur vers le modèle) : inclinaison (glisser vertical + regard vers le pointeur),
// soulèvement au survol, rotation (plateau automatique + glisser + scroll). Pivot : centre du modèle
// recadré (Fit.tsx), base posée sur le sol.
// - Glisser : 1 px = DRAG rad ; au-delà de la limite, résistance douce (tanh) ; au relâchement, inertie
//   puis retour doux vers le plateau après RETURN_DELAY.
// - Survol : lissé (HOVER_RATE), ralentit le plateau, soulève le modèle et l'oriente vers le pointeur.
// - Scroll : un quart de tour réparti sur la descente (progress du ScrollTrigger, déjà lissé).
import { useFrame } from '@react-three/fiber'
import { type ReactNode, type RefObject, useRef } from 'react'
import type { Group } from 'three'
import { clamp } from '../../lib/math'
import type { ViewerInput } from './useViewerInput'

/** Plateau automatique : balancement (façade, objet qu'on ne regarde pas de dos) ou tour complet. */
export type Turntable =
  { mode: 'sway'; amplitude: number; speed: number } | { mode: 'spin'; speed: number }

const DRAG = 0.009
const YAW_LIMIT = 0.9
const PITCH_LIMIT = 0.22
/** Frottement de l'inertie (1/s), délai (ms) et vitesse (1/s) du retour doux. */
const FRICTION = 4
const RETURN_DELAY = 900
const RETURN_RATE = 1.4
const HOVER_RATE = 6
/** Survol : regard vers le pointeur (rad), soulèvement (unités), ralentissement du plateau. */
const LOOK = { x: 0.16, y: 0.08 }
const LIFT = 0.08
const HOVER_SLOW = 0.7
const SCROLL_TURN = Math.PI / 4
/** Pas de temps maximal (retour d'onglet, première image après une pause). */
const MAX_DT = 1 / 20

type RigProps = {
  inputRef: RefObject<ViewerInput>
  turntable: Turntable
  /** Écrits à chaque image, lus par le modèle (LandingObjectProps). */
  progressRef: RefObject<number>
  hoverRef: RefObject<number>
  children: ReactNode
}

export function Rig({ inputRef, turntable, progressRef, hoverRef, children }: RigProps) {
  const tilt = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const s = useRef({ yaw: 0, pitch: 0, velocity: 0, phase: 0, lookX: 0, lookY: 0 })

  // Priorité −1 : avant les useFrame des modèles, qui lisent progress et hover
  useFrame((_, delta) => {
    const t = tilt.current
    const l = lift.current
    const r = turn.current
    if (!t || !l || !r) return
    const i = inputRef.current
    const m = s.current
    const dt = Math.min(delta, MAX_DT)
    const ease = (rate: number) => clamp(1 - Math.exp(-rate * dt))

    const h = hoverRef.current + ((i.over ? 1 : 0) - hoverRef.current) * ease(HOVER_RATE)
    hoverRef.current = h
    progressRef.current = i.scroll

    if (i.dragging) {
      const step = i.dx * DRAG
      m.yaw = clamp(m.yaw + step, -3 * YAW_LIMIT, 3 * YAW_LIMIT)
      m.pitch = clamp(m.pitch + i.dy * DRAG, -3 * PITCH_LIMIT, 3 * PITCH_LIMIT)
      // Vitesse lissée, pour l'inertie au relâchement
      m.velocity += (step / dt - m.velocity) * ease(20)
    } else {
      m.yaw += m.velocity * dt
      m.velocity *= Math.exp(-FRICTION * dt)
      if (performance.now() - i.releasedAt > RETURN_DELAY) m.yaw -= m.yaw * ease(RETURN_RATE)
      m.pitch -= m.pitch * ease(RETURN_RATE * 2)
    }
    i.dx = 0
    i.dy = 0
    const yaw = YAW_LIMIT * Math.tanh(m.yaw / YAW_LIMIT)
    const pitch = PITCH_LIMIT * Math.tanh(m.pitch / PITCH_LIMIT)

    m.phase += i.dragging ? 0 : dt * (1 - HOVER_SLOW * h)
    const auto =
      turntable.mode === 'spin'
        ? turntable.speed * m.phase
        : turntable.amplitude * Math.sin(turntable.speed * m.phase)

    m.lookX += (i.pointer.x * h - m.lookX) * ease(5)
    m.lookY += (i.pointer.y * h - m.lookY) * ease(5)

    t.rotation.x = pitch - LOOK.y * m.lookY
    l.position.y = LIFT * h
    r.rotation.y = auto + yaw + LOOK.x * m.lookX + SCROLL_TURN * i.scroll
  }, -1)

  return (
    <group ref={tilt}>
      <group ref={lift}>
        <group ref={turn}>{children}</group>
      </group>
    </group>
  )
}
