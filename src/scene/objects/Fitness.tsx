// Projet Fitness Kass (docs/storyboards/projects.md §2, ajouté le 2026-10-06 avec les captures de
// Mathis) : téléphone qui fait défiler les 5 vrais écrans de l'app en fondu, deux écrans flottants
// (Programmes, Progression) qui s'ouvrent en éventail au survol, anneau de progression qui tourne
// (écran Nutrition), haltère qui roule. Modèle : scripts/blender/model_fitness.py.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { lerp } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'
import { screenMaterial, useScreenCycle } from './useScreenCycle'

type FitnessProps = { slug: string }

const SCREENS = ['home', 'programs', 'nutrition', 'progress', 'profile'].map(
  (name) => `/textures/fitness/${name}.webp`,
)
const TINT = 0.88
/** Éventail des écrans flottants au survol : décalage x et rotation y par cran. */
const FAN = { x: 0.32, rotY: -0.18 }
const CARD_REST = [
  { x: 0.55, y: 0.12 },
  { x: 1.05, y: 0.22 },
] as const
const SWAY = { base: -0.28, amplitude: 0.16, frequency: 0.55 }

export function Fitness({ slug }: FitnessProps) {
  const { nodes } = useModel('fitness')
  const { materials, shownRef, nextRef, update, textures } = useScreenCycle(SCREENS, {
    tint: TINT,
  })
  // Téléphone, écrans flottants, anneau et haltère : x ∈ [−1.15, 1.35], y ∈ [−0.94, 0.94]
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 2.5,
    height: 1.95,
    center: [0.1, 0, 0],
  })

  // Écrans flottants : Programmes et Progression, fixes
  const cardMaterials = useMemo(() => {
    const [, programs, , progress] = textures
    return [
      screenMaterial(programs ?? null, TINT, 0.92),
      screenMaterial(progress ?? null, TINT, 0.85),
    ]
  }, [textures])
  useEffect(
    () => () => {
      cardMaterials.forEach((m) => {
        m.dispose()
      })
    },
    [cardMaterials],
  )

  const phone = useRef<Group>(null)
  const cards = useRef<(Mesh | null)[]>([])
  const ring = useRef<Mesh>(null)
  const dumbbell = useRef<Group>(null)
  const dumbbellY = nodes.Fit_Dumbbell_Root.position.y

  useFrame(() => {
    const ph = phone.current
    if (!ph || !visibleRef.current) return
    const t = phase.current
    const h = hover.current

    ph.rotation.y = SWAY.base + SWAY.amplitude * Math.sin(t * SWAY.frequency)
    update(t)

    cards.current.forEach((card, i) => {
      const rest = CARD_REST[i]
      if (!card || !rest) return
      const step = i + 1
      card.position.x = rest.x + step * FAN.x * h
      card.rotation.y = step * FAN.rotY * h
      card.position.y = rest.y + 0.04 * Math.sin(t * 0.9 + step)
    })

    if (ring.current) ring.current.rotation.z = -t * lerp(0.6, 1.6, h)
    const db = dumbbell.current
    if (db) {
      db.rotation.x = t * 0.8
      db.position.y = dumbbellY + 0.05 * Math.sin(t * 1.3) + 0.12 * h
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group position={offset}>
        <group ref={phone} rotation-y={SWAY.base}>
          <Part node={nodes.Fit_Body} />
          <Part ref={shownRef} node={nodes.Fit_Screen} material={materials.shown} />
          <Part
            ref={nextRef}
            node={nodes.Fit_Screen}
            material={materials.next}
            position-z={nodes.Fit_Screen.position.z + 0.001}
            visible={false}
          />
          {[nodes.Fit_Card1, nodes.Fit_Card2].map((node, i) => (
            <Part
              key={node.name}
              node={node}
              material={cardMaterials[i]}
              ref={(m: Mesh | null) => {
                cards.current[i] = m
              }}
            />
          ))}
        </group>
        <Part node={nodes.Fit_RingTrack} />
        <Part ref={ring} node={nodes.Fit_RingArc} />
        <group ref={dumbbell} position={nodes.Fit_Dumbbell_Root.position}>
          <Part node={nodes.Fit_Bar} />
          <Part node={nodes.Fit_PlateL0} />
          <Part node={nodes.Fit_PlateL1} />
          <Part node={nodes.Fit_PlateR0} />
          <Part node={nodes.Fit_PlateR1} />
        </group>
      </group>
    </group>
  )
}
