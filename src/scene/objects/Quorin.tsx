// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « QuorinOS : le
// téléphone oscille doucement en Y. Survol : les fantômes G1/G2 se décalent davantage (+0.35 → +0.6 par
// cran) avec un léger éventail. » Mesures : docs/models.md (quorin.glb, fantômes à (+0.35, 0, −0.35) et
// (+0.7, 0, −0.7), téléphone 0.9 × 1.8).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { lerp } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type QuorinProps = { slug: string }

const PARTS = ['Body', 'Screen', 'Cam'] as const
const GHOSTS = ['PhoneG1', 'PhoneG2'] as const
/** Décalage en x d'un fantôme par cran : au repos (GLB) et au survol. */
const STEP = { rest: 0.35, hover: 0.6 }
/** Éventail au survol (rad sur Z, par cran). */
const FAN = -0.08
/** Écran du téléphone : émissif du GLB (1.4) atténué, une grande surface pleine éblouirait. */
const SCREEN_INTENSITY = 0.5
/** Oscillation sur Y : de trois quarts (fantômes visibles à droite), lente. */
const SWAY = { base: -0.25, amplitude: 0.2, frequency: 0.6 }

export function Quorin({ slug }: QuorinProps) {
  const { nodes, materials } = useModel('quorin')
  // Téléphone + fantômes : x ∈ [−0.45, 1.15] au repos, jusqu'à 1.65 au survol ; 1.8 de haut
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({ slug, width: 1.9, height: 1.9, center: [0.4, 0, 0] })
  const phone = useRef<Group>(null)
  const screen = useMemo(() => {
    const material = materials.Screen.clone()
    material.emissiveIntensity = SCREEN_INTENSITY
    return material
  }, [materials])

  useEffect(
    () => () => {
      screen.dispose()
    },
    [screen],
  )
  const ghosts = useRef<(Group | null)[]>([])

  useFrame(() => {
    const ph = phone.current
    if (!ph || !visibleRef.current) return
    const t = phase.current
    const h = hover.current
    ph.rotation.y = SWAY.base + SWAY.amplitude * Math.sin(t * SWAY.frequency)
    for (let i = 0; i < GHOSTS.length; i++) {
      const ghost = ghosts.current[i]
      if (!ghost) continue
      const step = i + 1
      ghost.position.x = step * (lerp(STEP.rest, STEP.hover, h) - STEP.rest)
      ghost.rotation.z = FAN * step * h
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group position={offset}>
        <group ref={phone} rotation-y={SWAY.base}>
          <Part node={nodes.Phone_Body} />
          <Part node={nodes.Phone_Screen} material={screen} />
          <Part node={nodes.Phone_Cam} />
          {GHOSTS.map((ghost, i) => (
            <group
              key={ghost}
              ref={(g) => {
                ghosts.current[i] = g
              }}
            >
              {PARTS.map((part) => (
                <Part key={part} node={nodes[`${ghost}_${part}` as const]} />
              ))}
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}
