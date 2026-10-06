// Easter egg, beat 5 : la convoi Wegir en bord de route (retour de Mathis : « la plus parlante »).
// wegir.glb instancié directement (sans useAnchoredObject) : route en arc, tirets, 3 voitures qui roulent
// sur l'arc en boucle, roues qui tournent. Mesures et conventions : docs/models.md (arc de centre
// (−2.2, 0, 0), rayon 2.2, φ ∈ [−70°, 70°], rotation.y = π/2 − φ, roues en rotation.y), comme Wegir.tsx.
// Recentrée (+0.6 en x, le modèle n'est pas centré). Coupée en reduced-motion (voitures immobiles).
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import { Part } from '../scene/objects/Part'
import { useModel } from '../scene/useModel'

const CARS = [0, 1, 2] as const
const WHEELS = ['W-02-019', 'W-02019', 'W02-019', 'W02019'] as const
const DASHES = [
  'Dash0',
  'Dash5',
  'Dash10',
  'Dash15',
  'Dash20',
  'Dash25',
  'Dash30',
  'Dash35',
] as const
const DEG = Math.PI / 180
const ARC = { cx: -2.2, radius: 2.2, max: 70 * DEG }
const SPACING = (2 * ARC.max) / CARS.length
/** Un tour d'arc en ~5 s (les voitures doivent se voir rouler pendant le passage). */
const SPEED = 0.5
const WHEEL_RADIUS = 0.08

const wrap = (v: number, n: number) => ((v % n) + n) % n

type RoadsideWegirProps = { still: boolean }

export function RoadsideWegir({ still }: RoadsideWegirProps) {
  const { nodes } = useModel('wegir')
  const cars = useRef<(Group | null)[]>([])
  const wheels = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const travelled = still ? 0 : SPEED * clock.elapsedTime
    const spin = -(ARC.radius * travelled) / WHEEL_RADIUS
    for (const i of CARS) {
      const car = cars.current[i]
      if (!car) continue
      const start = ARC.max - (1 - i) * SPACING
      const phi = ARC.max - wrap(start + travelled, 2 * ARC.max)
      car.position.set(ARC.cx + ARC.radius * Math.cos(phi), 0, ARC.radius * Math.sin(phi))
      car.rotation.y = Math.PI / 2 - phi
      for (let j = 0; j < WHEELS.length; j++) {
        const wheel = wheels.current[i * WHEELS.length + j]
        if (wheel) wheel.rotation.y = spin
      }
    }
  })

  return (
    <group position-x={0.6}>
      <Part node={nodes.Road} />
      {DASHES.map((name) => (
        <Part key={name} node={nodes[name]} />
      ))}
      {CARS.map((i) => {
        const root = nodes[`Car${i}_Root` as const]
        return (
          <group
            key={root.name}
            ref={(g) => {
              cars.current[i] = g
            }}
            position={root.position}
            rotation={root.rotation}
          >
            <Part node={nodes[`Car${i}_Body` as const]} />
            <Part node={nodes[`Car${i}_Cab` as const]} />
            {WHEELS.map((w, j) => (
              <Part
                key={w}
                node={nodes[`Car${i}_${w}` as const]}
                ref={(m) => {
                  wheels.current[i * WHEELS.length + j] = m
                }}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}
