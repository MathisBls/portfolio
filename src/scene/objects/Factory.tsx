// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Game Factory : les
// dés avancent sur le tapis de x −0.4 à 1.6, tombent, réapparaissent sous la goulotte ; rouleaux en
// rotation.y. Survol : cadence ×1.6. » Mesures : docs/models.md (gamefactory.glb, dés de 0.32 posés à
// y = 0.72, Pip* enfants de leur dé, rouleaux de rayon 0.14).
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { easeInOut, range } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type FactoryProps = { slug: string }

const STATIC = [
  'Belt',
  'Leg-13-038',
  'Leg-13038',
  'Leg0-038',
  'Leg0038',
  'Leg13-038',
  'Leg13038',
  'Hopper',
  'Chute',
] as const
const ROLLERS = ['Roller-16', 'Roller16'] as const
const DICE = [
  { name: 'Die0', pips: ['Pip0_-008_008'] },
  { name: 'Die1', pips: ['Pip1_-008_008', 'Pip1_008_-008'] },
  { name: 'Die2', pips: ['Pip2_-008_008', 'Pip2_008_-008', 'Pip2_0_0'] },
] as const

/** Tapis : les dés vont de start à end à y = top, à speed unités/s. */
const BELT = { start: -0.4, end: 1.6, top: 0.72, speed: 0.45 }
/** Sortie de la goulotte : le dé descend de `drop` en grandissant sur les premiers `length`. */
const SPAWN = { length: 0.15, drop: 0.25 }
/** Chute au bout du tapis, sur `length` de phase : avance, tombe de `depth`, bascule, disparaît. */
const FALL = { length: 0.3, ahead: 0.25, depth: 0.6 }
const RUN = BELT.end - BELT.start
const CYCLE = RUN + FALL.length
const ROLLER_RADIUS = 0.14
/** Vue de trois quarts, un peu plongeante : le dessus du tapis se lit. */
const VIEW = { tilt: 0.35, turn: -0.3 }

const wrap = (v: number, n: number) => ((v % n) + n) % n

export function Factory({ slug }: FactoryProps) {
  const { nodes } = useModel('gamefactory')
  // Emprise vue de trois quarts : ~3.6 × 1.9, centre du modèle à y ≈ 0.78
  const {
    ref: anchor,
    offset,
    phase,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 3.6,
    height: 1.9,
    center: [0, 0.78, 0],
    hoverSpeed: 1.6,
  })
  const rollers = useRef<(Mesh | null)[]>([])
  const dice = useRef<(Mesh | null)[]>([])

  useFrame(() => {
    if (!visibleRef.current) return
    const distance = BELT.speed * phase.current
    for (const roller of rollers.current) {
      if (roller) roller.rotation.y = -distance / ROLLER_RADIUS
    }
    for (let i = 0; i < DICE.length; i++) {
      const die = dice.current[i]
      const spec = DICE[i]
      if (!die || !spec) continue
      // Phase régulièrement espacée ; Die0 part de x −0.2 comme dans le GLB
      const s = wrap(distance + 0.2 + (i * CYCLE) / DICE.length, CYCLE)
      const yaw = nodes[spec.name].rotation.y
      if (s < RUN) {
        const k = easeInOut(range(s, 0, SPAWN.length))
        die.position.set(BELT.start + s, BELT.top + (1 - k) * SPAWN.drop, 0)
        die.rotation.set(0, yaw, 0)
        die.scale.setScalar(Math.max(k, 1e-4))
      } else {
        const f = (s - RUN) / FALL.length
        die.position.set(BELT.end + f * FALL.ahead, BELT.top - f * f * FALL.depth, 0)
        die.rotation.set(0, yaw, (-f * Math.PI) / 2)
        die.scale.setScalar(Math.max(1 - f, 1e-4))
      }
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group rotation={[VIEW.tilt, VIEW.turn, 0]}>
        <group position={offset}>
          {STATIC.map((name) => (
            <Part key={name} node={nodes[name]} />
          ))}
          {ROLLERS.map((name, i) => (
            <Part
              key={name}
              node={nodes[name]}
              ref={(m) => {
                rollers.current[i] = m
              }}
            />
          ))}
          {DICE.map(({ name, pips }, i) => (
            <Part
              key={name}
              node={nodes[name]}
              ref={(m) => {
                dice.current[i] = m
              }}
            >
              {pips.map((pip) => (
                <Part key={pip} node={nodes[pip]} />
              ))}
            </Part>
          ))}
        </group>
      </group>
    </group>
  )
}
