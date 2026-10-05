// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Meme Rina : la part
// pivote lentement autour de son centre (contenu décalé de x −0.8) avec une légère lévitation. Survol :
// la part se soulève et le fromage s'étire (scale y du Cheese). » Mesures : docs/models.md (pizza.glb,
// pointe à l'origine, croûte à x = 1.6, fromage de y 0.105 à 0.135, garnitures posées dessus).
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { lerp } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type PizzaProps = { slug: string }

const BASE = ['Dough', 'Sauce', 'Crust'] as const
const TOPPINGS = [
  'Pep06-012',
  'Pep105018',
  'Pep115-022',
  'Pep085-002',
  'Basil045015',
  'Basil0900',
  'Basil12005',
] as const

/** Part couchée vers la caméra : le dessus se lit. */
const TILT = 0.7
/** Rotation lente autour du centre de la part (rad/s), lévitation (amplitude, rad/s). */
const SPIN = 0.3
const FLOAT = { amplitude: 0.05, frequency: 1.2 }
/** Survol : la part se soulève, le fromage s'épaissit depuis sa base, les garnitures suivent. */
const LIFT = 0.25
const CHEESE = { base: 0.105, thickness: 0.03, stretch: 2.5 }

export function Pizza({ slug }: PizzaProps) {
  const { nodes } = useModel('pizza')
  // Centre de la part en x = 0.8 (décalage −0.8) ; en rotation : 2 de diamètre, ~1.75 de haut incliné
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({ slug, width: 2, height: 1.75, center: [0.8, 0.11, 0] })
  const lift = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const cheese = useRef<Group>(null)
  const toppings = useRef<Group>(null)

  useFrame(() => {
    const l = lift.current
    const s = spin.current
    const c = cheese.current
    const tp = toppings.current
    if (!l || !s || !c || !tp || !visibleRef.current) return
    const t = phase.current
    const h = hover.current
    l.position.y = FLOAT.amplitude * Math.sin(t * FLOAT.frequency) + LIFT * h
    s.rotation.y = SPIN * t
    const stretch = lerp(1, CHEESE.stretch, h)
    c.scale.y = stretch
    tp.position.y = CHEESE.thickness * (stretch - 1)
  })

  return (
    <group ref={anchor} visible={false}>
      <group rotation-x={TILT}>
        <group ref={lift}>
          <group ref={spin}>
            <group position={offset}>
              {BASE.map((name) => (
                <Part key={name} node={nodes[name]} />
              ))}
              <group ref={cheese} position-y={CHEESE.base}>
                <Part node={nodes.Cheese} position={[0, -CHEESE.base, 0]} />
              </group>
              <group ref={toppings}>
                {TOPPINGS.map((name) => (
                  <Part key={name} node={nodes[name]} />
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
