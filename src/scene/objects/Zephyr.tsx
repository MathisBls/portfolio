// Storyboard projets (docs/storyboards/projects.md §2, « Animations continues ») : « Zephyr : les 3
// rubans tournent sur Y à des vitesses différentes (0.3 / −0.2 / 0.45 rad/s) et ondulent légèrement.
// TealGlass est remplacé par un meshPhysicalMaterial non transmissif. Survol : vitesse ×2. »
// Mesures : docs/models.md (zephyr.glb, rubans ~2 × 1.8 × 2 centrés sur l'origine).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, MeshPhysicalMaterial } from 'three'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type ZephyrProps = { slug: string }

const WINDS = ['Wind1', 'Wind2', 'Wind3'] as const
/** Rotation sur Y de chaque ruban (rad/s). */
const SPEEDS: readonly number[] = [0.3, -0.2, 0.45]
/** Ondulation : bascule en X (rad) et léger flottement en Y, déphasés par ruban. */
const WAVE = { tilt: 0.08, bob: 0.04, frequency: 0.8, shift: 2.1 }

export function Zephyr({ slug }: ZephyrProps) {
  const { nodes, materials } = useModel('zephyr')
  // Emprise des rubans en rotation : ~2.3 de large, ~2.1 de haut
  const {
    ref: anchor,
    offset,
    phase,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 2.3,
    height: 2.1,
    center: [0.05, 0.05, 0],
    hoverSpeed: 2,
  })
  const spins = useRef<(Group | null)[]>([])

  // Verre sans transmission : un seul objet en transmission à la fois (le prisme)
  const glass = useMemo(() => {
    const source = materials.TealGlass
    return new MeshPhysicalMaterial({
      color: source.color,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      ior: 1.45,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: source.side,
    })
  }, [materials])

  useEffect(
    () => () => {
      glass.dispose()
    },
    [glass],
  )

  useFrame(() => {
    if (!visibleRef.current) return
    const t = phase.current
    for (let i = 0; i < WINDS.length; i++) {
      const spin = spins.current[i]
      if (!spin) continue
      const wave = t * WAVE.frequency + i * WAVE.shift
      spin.rotation.set(WAVE.tilt * Math.sin(wave), (SPEEDS[i] ?? 0) * t, 0)
      spin.position.y = WAVE.bob * Math.sin(wave * 1.3)
    }
  })

  return (
    <group ref={anchor} visible={false}>
      <group position={offset}>
        {WINDS.map((name, i) => (
          <group
            key={name}
            ref={(g) => {
              spins.current[i] = g
            }}
          >
            <Part node={nodes[name]} material={name === 'Wind2' ? glass : nodes[name].material} />
          </group>
        ))}
      </group>
    </group>
  )
}
