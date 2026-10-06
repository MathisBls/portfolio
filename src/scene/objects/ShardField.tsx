// Champ d'éclats de verre, fond vivant de toute la page (remplace AmbientShapes).
// docs/storyboards/story-v2.md :
// - Métaphore : « Éclats de verre = la matière première : ils s'assemblent en prisme au début,
//   accompagnent la descente, et attendent au Contact ».
// - Contrats : « ShardField.tsx : remplace AmbientShapes (un seul InstancedMesh, ≈ 150 éclats desktop,
//   ≈ 40 mobile) ; gère l'intro d'assemblage et le rassemblement au Contact ».
// - Beats : Chargement (assemblage, ≈ 1.5 s, au premier rendu après Warmup), Work (parallaxe), Bandeau
//   (accélèrent), Services (ralentissent), About (calme), Contact (arrivée : couronne autour du prisme).
// - Budget : « 1 draw call (instancié), pas de transmission ; matrices mises à jour par frame seulement
//   quand la boucle continue tourne ». Reduced-motion : une dizaine d'éclats statiques, pas d'intro.
// Placement pur : lib/shardLayout.ts, lib/shards.ts (testés). Matériau : shardMaterial.ts. Frame :
// shardFrame.ts et shardPlace.ts. Apparition du prisme pendant l'intro : intro.ts (lu par Prism.tsx).
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { InstancedMesh } from 'three'
import { type ShardMode, layoutShards } from '../../lib/shardLayout'
import { useContinuousInvalidate } from '../hooks'
import { setPrismReveal } from '../intro'
import { usePointerDamp } from '../usePointerDamp'
import { createRuntime, updateShardField } from './shardFrame'
import { syncEnvironment } from './shardPlace'
import { createShardResources } from './shardMaterial'

type ShardFieldProps = { mobile: boolean; reducedMotion: boolean }

export function ShardField({ mobile, reducedMotion }: ShardFieldProps) {
  const mode: ShardMode = reducedMotion ? 'static' : mobile ? 'mobile' : 'desktop'
  const still = mode === 'static'
  const layout = useMemo(() => layoutShards(mode), [mode])
  // Bloom (Effects) et clearcoat seulement sur desktop
  const resources = useMemo(() => createShardResources(layout, mode === 'desktop'), [layout, mode])
  useEffect(
    () => () => {
      resources.dispose()
    },
    [resources],
  )

  const mesh = useRef<InstancedMesh>(null)
  const runtime = useRef(createRuntime())
  const drift = usePointerDamp(2)

  // Le prisme est caché dès le montage (avant la première frame, Warmup en "never") et se révèle avec
  // l'assemblage. Sans intro, ou intro déjà jouée (changement de palier), il reste visible.
  useLayoutEffect(() => {
    if (still || runtime.current.introDone) {
      setPrismReveal(1)
      return
    }
    setPrismReveal(0)
    return () => {
      setPrismReveal(1)
    }
  }, [still])

  // Rotation et flottement continus (coupés onglet masqué) ; rien en reduced-motion
  useContinuousInvalidate(!still)

  useFrame((state, delta) => {
    const m = mesh.current
    if (!m) return
    syncEnvironment(m, state.scene.environment)
    updateShardField(
      m,
      layout,
      resources.shapes,
      runtime.current,
      state.camera,
      state.size,
      delta,
      drift.follow(delta),
      still,
    )
  })

  return (
    <instancedMesh
      key={mode}
      ref={mesh}
      args={[resources.geometry, resources.material, resources.shapes.length]}
      frustumCulled={false}
    >
      <instancedBufferAttribute attach="instanceColor" args={[resources.colors, 3]} />
    </instancedMesh>
  )
}
