// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Meme Rina : la part
// pivote lentement autour de son centre (contenu décalé de x −0.8) avec une légère lévitation. Survol :
// la part se soulève et le fromage s'étire. »
// Part réaliste du 2026-10-09 (scripts/blender/model_pizza_real.py ; Mathis : « une part de pizza beaucoup
// plus réaliste ») : pointe à l'origine, croûte à x ≈ 1.63, coupes à ±22.5°, même emprise que l'ancienne
// part (même cadrage). Cartes cuites (couleur, rugosité, normales) sur des MeshStandardMaterial.
// La mozzarella pend du bord de coupe +22.5° en quatre brins (Pizza_CheeseStrand*, origine au point
// d'accroche) : ils filent avec le progress scrubé du chapitre (ScrollTrigger, lu via useAnchoredObject)
// et un peu plus au survol, s'affinent en s'allongeant, et pendent toujours vers le bas de l'écran
// (gravité recalculée à chaque image, jamais à travers la part).
// Reduced-motion : rien n'est monté ici (ProjectObjects), le poster public/posters/pizza.webp (même
// script Blender) tient lieu de version simple. Mobile (2026-10-10) : monté aussi, les brins filent
// pendant que l'emplacement traverse l'écran (progress de useAnchoredObject en une colonne).
// Ajout du 2026-10-06 : fenêtre de navigateur derrière la part, qui fait défiler les captures du vrai
// site (scripts/blender/model_pizza_browser.py, textures de Mathis) ; elle reste droite, face caméra.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Mesh, Quaternion, Vector3 } from 'three'
import { easeInOut, range } from '../../lib/math'
import { queueUpload } from '../uploadQueue'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'
import { useScreenCycle } from './useScreenCycle'

type PizzaProps = { slug: string }

const LEAVES = ['Pizza_Basil0', 'Pizza_Basil1', 'Pizza_Basil2'] as const
const STRANDS = [
  'Pizza_CheeseStrand0',
  'Pizza_CheeseStrand1',
  'Pizza_CheeseStrand2',
  'Pizza_CheeseStrand3',
] as const

/** Part couchée vers la caméra : le dessus se lit. */
const TILT = 0.7
/** Rotation lente autour du centre de la part (rad/s), lévitation (amplitude, rad/s). */
const SPIN = 0.3
const FLOAT = { amplitude: 0.05, frequency: 1.2 }
/** La part se soulève : au survol, et un peu pendant que le chapitre défile (la mozzarella file). */
const LIFT = { hover: 0.25, scroll: 0.12 }
const PULL = {
  /** Fenêtre du progress du chapitre où les brins s'allongent (scène collée : 0.36 → 0.64). */
  scroll: [0.3, 0.7] as const,
  /** Allongement maximal (facteur de longueur − 1) : par le scroll, en plus au survol. */
  stretch: 1.1,
  hover: 0.45,
  /** Part de l'allongement prise par chaque brin. */
  weights: [0.8, 1, 0.9, 0.55] as const,
  /** Balancement autour de la normale de la coupe (rad, rad/s). */
  sway: 0.06,
  swaySpeed: 1.6,
  /** Pente minimale vers l'extérieur de la coupe : un brin ne traverse jamais la part. */
  out: 0.2,
}
/** Normale extérieure de la coupe +22.5° d'où pendent les brins, dans le repère de la part. */
const CUT_NORMAL = new Vector3(-Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8))
const DOWN = new Vector3(0, -1, 0)
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
  const { nodes, materials } = useModel('pizza')
  // Centre de la part en x = 0.8 (décalage −0.8) ; en rotation : 2 de diamètre, ~1.75 de haut incliné
  // Avec le navigateur (2.1 × 1.2, centré en y 0.75 derrière la part) : ~2.2 de haut, centre relevé
  const {
    ref: anchor,
    offset,
    progress,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({ slug, width: 2.2, height: 2.25, center: [0.8, 0.3, 0] })
  const {
    materials: screens,
    shownRef,
    nextRef,
    update,
  } = useScreenCycle(SITE, {
    hold: 3.2,
    tint: 0.9,
  })
  const browser = useRef<Group>(null)
  const root = nodes.Pizza_Browser_Root.position
  const browserAt: [number, number, number] = [
    root.x + offset[0],
    root.y + offset[1],
    root.z + offset[2],
  ]
  const lift = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const pull = useRef<Group>(null)
  const strands = useRef<(Mesh | null)[]>([])
  const scratch = useMemo(
    () => ({
      q: new Quaternion(),
      align: new Quaternion(),
      sway: new Quaternion(),
      g: new Vector3(),
    }),
    [],
  )

  // Cartes cuites envoyées au GPU dès le montage (avant le chapitre), pas à sa première image ; une par
  // image (uploadQueue) : groupées, elles gelaient le défilement sur mobile
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const { PizzaSlice, PizzaBasil } = materials
    return queueUpload(gl, [
      PizzaSlice.map,
      PizzaSlice.normalMap,
      PizzaSlice.roughnessMap,
      PizzaBasil.map,
      PizzaBasil.normalMap,
    ])
  }, [gl, materials])

  useFrame(() => {
    const l = lift.current
    const s = spin.current
    const pg = pull.current
    if (!l || !s || !pg || !visibleRef.current) return
    const t = phase.current
    const h = hover.current
    const k = easeInOut(range(progress.current, ...PULL.scroll))
    l.position.y =
      FLOAT.amplitude * Math.sin(t * FLOAT.frequency) + LIFT.hover * h + LIFT.scroll * k
    s.rotation.y = SPIN * t

    // Gravité dans le repère des brins, ramenée hors de la part, puis rotation minimale -y -> gravité
    const { q, align, sway, g } = scratch
    pg.getWorldQuaternion(q)
    g.copy(DOWN).applyQuaternion(q.invert())
    const outward = g.dot(CUT_NORMAL)
    if (outward < PULL.out) g.addScaledVector(CUT_NORMAL, PULL.out - outward).normalize()
    align.setFromUnitVectors(DOWN, g)
    const stretch = PULL.stretch * k + PULL.hover * h
    strands.current.forEach((strand, i) => {
      if (!strand) return
      sway.setFromAxisAngle(CUT_NORMAL, PULL.sway * Math.sin(t * PULL.swaySpeed + i * 1.3))
      strand.quaternion.multiplyQuaternions(align, sway)
      // Volume constant : plus long, plus fin
      const length = 1 + stretch * (PULL.weights[i] ?? 1)
      const thin = 1 / Math.sqrt(length)
      strand.scale.set(thin, length, thin)
    })

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
        <Part ref={shownRef} node={nodes.Pizza_Site} material={screens.shown} />
        <Part
          ref={nextRef}
          node={nodes.Pizza_Site}
          material={screens.next}
          position-z={nodes.Pizza_Site.position.z + 0.001}
          visible={false}
        />
      </group>
      <group rotation-x={TILT}>
        <group ref={lift}>
          <group ref={spin}>
            <group position={offset}>
              <Part node={nodes.Pizza_Slice} />
              {LEAVES.map((name) => (
                <Part key={name} node={nodes[name]} />
              ))}
              <group ref={pull}>
                {STRANDS.map((name, i) => (
                  <Part
                    key={name}
                    node={nodes[name]}
                    ref={(m) => {
                      strands.current[i] = m
                    }}
                  />
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
