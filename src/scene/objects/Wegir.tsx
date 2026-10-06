// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Wegir : les 3
// voitures roulent sur l'arc (centre (−2.2, 0, 0), rayon 2.2, φ ∈ [−70°, 70°], bouclage),
// rotation.y = π/2 − φ, roues en rotation.y. Groupe recentré (+0.6 en x) et incliné (x 0.5) pour lire
// la route d'en haut. Survol : vitesse ×1.8. » Mesures : docs/models.md (wegir.glb).
// Ajout du 2026-10-06 : un téléphone (celui de fitness.glb) debout au bout de la route fait défiler les
// vrais écrans de l'app (captures de Mathis) ; il reste face caméra, hors de l'inclinaison de la route.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import { easeInOut, range } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'
import { useScreenCycle } from './useScreenCycle'

type WegirProps = { slug: string }

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
/** Axe de la voie : cercle de centre (cx, 0, 0), φ ∈ [−max, max]. */
const ARC = { cx: -2.2, radius: 2.2, max: 70 * DEG }
/** Voitures régulièrement espacées sur l'arc ; Car1 part de φ = 0 comme dans le GLB. */
const SPACING = (2 * ARC.max) / CARS.length
/** Vitesse angulaire (rad/s) : un tour d'arc en ~8 s. */
const SPEED = 0.3
const WHEEL_RADIUS = 0.08
/** Les voitures apparaissent et disparaissent aux bouts de la route (bouclage sans saut). */
const FADE = 10 * DEG
/** Lecture de la route d'en haut ; le quart de tour met l'arc en largeur dans l'emplacement 4:3. */
const VIEW = { tilt: 0.5, turn: -Math.PI / 2 }

const wrap = (v: number, n: number) => ((v % n) + n) % n

const SCREENS = ['intro', 'convoit', 'convoi', 'signalement', 'amis', 'qr-code-convoi'].map(
  (name) => `/textures/wegir/${name}.webp`,
)
/** Téléphone au bout droit de la route, un peu devant, de trois quarts. */
const PHONE = { position: [2.05, 0.25, 0.7] as [number, number, number], scale: 0.62, turn: -0.35 }

export function Wegir({ slug }: WegirProps) {
  const { nodes } = useModel('wegir')
  const { nodes: device } = useModel('fitness')
  const { materials, shownRef, nextRef, update } = useScreenCycle(SCREENS, { hold: 2.4 })
  const phone = useRef<Group>(null)
  // Recentrage +0.6 en x (centre du modèle −0.6) ; emprise vue de face, arc en largeur
  const {
    ref: anchor,
    offset,
    phase,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 5,
    height: 1.5,
    center: [-0.6, 0.15, 0],
    hoverSpeed: 1.8,
  })
  const cars = useRef<(Group | null)[]>([])
  const wheels = useRef<(Mesh | null)[]>([])

  useFrame(() => {
    if (!visibleRef.current) return
    update(phase.current)
    const ph = phone.current
    if (ph) ph.rotation.y = PHONE.turn + 0.12 * Math.sin(phase.current * 0.5)
    // Angle parcouru : φ décroît, la voiture avance selon son +X local
    const travelled = SPEED * phase.current
    const spin = -(ARC.radius * travelled) / WHEEL_RADIUS
    for (const i of CARS) {
      const car = cars.current[i]
      if (!car) continue
      const start = ARC.max - (1 - i) * SPACING
      const phi = ARC.max - wrap(start + travelled, 2 * ARC.max)
      car.position.set(ARC.cx + ARC.radius * Math.cos(phi), 0, ARC.radius * Math.sin(phi))
      car.rotation.y = Math.PI / 2 - phi
      const k = Math.min(range(phi, -ARC.max, FADE - ARC.max), range(phi, ARC.max, ARC.max - FADE))
      car.scale.setScalar(Math.max(easeInOut(k), 1e-4))
      for (let j = 0; j < WHEELS.length; j++) {
        const wheel = wheels.current[i * WHEELS.length + j]
        if (wheel) wheel.rotation.y = spin
      }
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group ref={phone} position={PHONE.position} scale={PHONE.scale} rotation-y={PHONE.turn}>
        <Part node={device.Fit_Body} />
        <Part ref={shownRef} node={device.Fit_Screen} material={materials.shown} />
        <Part
          ref={nextRef}
          node={device.Fit_Screen}
          material={materials.next}
          position-z={device.Fit_Screen.position.z + 0.001}
          visible={false}
        />
      </group>
      <group rotation-x={VIEW.tilt}>
        <group rotation-y={VIEW.turn}>
          <group position={offset}>
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
        </group>
      </group>
    </group>
  )
}
