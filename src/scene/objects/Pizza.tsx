// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Meme Rina : la part
// pivote lentement autour de son centre (contenu décalé de x −0.8) avec une légère lévitation. Survol :
// la part se soulève et le fromage s'étire (scale y du Cheese). » Mesures : docs/models.md (pizza.glb,
// pointe à l'origine, croûte à x = 1.6, fromage de y 0.105 à 0.135, garnitures posées dessus).
// Ajout du 2026-10-06 : fenêtre de navigateur derrière la part, qui fait défiler les captures du vrai
// site (scripts/blender/model_pizza_browser.py, textures de Mathis) ; elle reste droite, face caméra.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { lerp } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'
import { useScreenCycle } from './useScreenCycle'

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
const SITE = [1, 2, 3].map((i) => `/textures/memerina/site-${String(i)}.webp`)
/** Navigateur : léger flottement et balancement, en retrait derrière la part. */
const BROWSER = { sway: 0.08, float: 0.03 }
const BROWSER_PARTS = [
  'Pizza_BrowserFrame',
  'Pizza_BrowserBar',
  'Pizza_Dot0',
  'Pizza_Dot1',
  'Pizza_Dot2',
] as const

export function Pizza({ slug }: PizzaProps) {
  const { nodes } = useModel('pizza')
  // Centre de la part en x = 0.8 (décalage −0.8) ; en rotation : 2 de diamètre, ~1.75 de haut incliné
  // Avec le navigateur (2.1 × 1.2, centré en y 0.75 derrière la part) : ~2.2 de haut, centre relevé
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({ slug, width: 2.2, height: 2.25, center: [0.8, 0.3, 0] })
  const { materials, shownRef, nextRef, update } = useScreenCycle(SITE, { hold: 3.2, tint: 0.9 })
  const browser = useRef<Group>(null)
  const root = nodes.Pizza_Browser_Root.position
  const browserAt: [number, number, number] = [
    root.x + offset[0],
    root.y + offset[1],
    root.z + offset[2],
  ]
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
    update(t)
    const b = browser.current
    if (b) {
      b.rotation.y = BROWSER.sway * Math.sin(t * 0.4)
      b.position.y = browserAt[1] + BROWSER.float * Math.sin(t * 0.7)
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group ref={browser} position={browserAt}>
        {BROWSER_PARTS.map((name) => (
          <Part key={name} node={nodes[name]} />
        ))}
        <Part ref={shownRef} node={nodes.Pizza_Site} material={materials.shown} />
        <Part
          ref={nextRef}
          node={nodes.Pizza_Site}
          material={materials.next}
          position-z={nodes.Pizza_Site.position.z + 0.001}
          visible={false}
        />
      </group>
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
