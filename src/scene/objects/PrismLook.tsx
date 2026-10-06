// Passe « motion » sur le prisme (demande de Mathis, sans storyboard dédié), en parent de <Prism> pour ne
// pas toucher à sa logique (rayons, visée) : pendant le hero et au contact (prisme au centre, storyboards
// hero.md §2 et services-contact.md §2 3.0–3.5), le groupe s'oriente doucement vers le pointeur
// (±LOOK rad, amorti) et un clic dans le vide lui donne une impulsion de rotation (ressort sous-amorti).
// Pivot : le centre du prisme (prismPath.ts, même source que Prism.tsx : levé pendant Projets, il suit
// la descente de la caméra du storyboard v2 et redescend au Contact).
// Hors desktop à pointeur fin ou en reduced-motion, le pointeur est débranché : rotation nulle.
import { useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { clamp } from '../../lib/math'
import { getPointer } from '../pointer'
import { prismPresence, prismY } from '../prismPath'
import { usePointerDamp } from '../usePointerDamp'

/** Orientation maximale vers le pointeur (rad), sur x et y. */
const LOOK = 0.12
/** Clic : vitesse angulaire donnée (rad/s) sur y (et 60 % sur x), selon le côté du clic. */
const KICK = 2.2
/** Ressort : raideur (1/s²) et amortissement (1/s), environ 0.9 oscillation/s, éteint en ~3 s. */
const SPRING = { stiffness: 32, damping: 2 }
const MAX_DT = 1 / 30
const REST = 1e-4
/** Le clic n'agit que si le prisme est au moins à moitié redescendu au centre. */
const MIN_PRESENCE = 0.5

type Spring = { angle: number; velocity: number }

/** Euler semi-implicite. Renvoie true tant que le ressort bouge (il demande alors une frame). */
function stepSpring(s: Spring, dt: number): boolean {
  s.velocity += (-SPRING.stiffness * s.angle - SPRING.damping * s.velocity) * dt
  s.angle += s.velocity * dt
  if (Math.abs(s.angle) > REST || Math.abs(s.velocity) > REST * 10) return true
  s.angle = 0
  s.velocity = 0
  return false
}

const center = new Vector3()

export function PrismLook({ children }: { children: ReactNode }) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  const look = usePointerDamp(3)
  const wobble = useRef({
    x: { angle: 0, velocity: 0 },
    y: { angle: 0, velocity: 0 },
    seen: getPointer().clicks,
  })

  useFrame(({ camera }, delta) => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const presence = prismPresence()
    const y = prismY()
    const d = look.follow(delta, presence)

    // Clic dans le vide : impulsion selon sa position par rapport au prisme à l'écran
    const w = wobble.current
    const p = getPointer()
    if (p.clicks !== w.seen) {
      w.seen = p.clicks
      center.set(0, y, 0).project(camera)
      const onScreen = Math.abs(center.x) < 1 && Math.abs(center.y) < 1
      if (onScreen && presence > MIN_PRESENCE) {
        w.y.velocity += KICK * clamp((p.clickX - center.x) * 2, -1, 1)
        w.x.velocity -= 0.6 * KICK * clamp((p.clickY - center.y) * 2, -1, 1)
      }
    }
    if (!p.enabled) {
      w.x.angle = w.x.velocity = w.y.angle = w.y.velocity = 0
    }
    const dt = Math.min(delta, MAX_DT)
    const movingX = stepSpring(w.x, dt)
    const movingY = stepSpring(w.y, dt)
    if (movingX || movingY) invalidate()

    // Rotation autour du centre du prisme : outer au pivot, inner le ramène à l'origine
    o.position.y = y
    i.position.y = -y
    o.rotation.set(-LOOK * d.y + w.x.angle, LOOK * d.x + w.y.angle, 0)
  })

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  )
}
