// Easter egg, beat 2 (1.5–7 s) : « Révélation de l'arène : la caméra descend du ciel vers la table. Les
// bougies et les flammes vacillent (émissif doux), les cristaux pulsent. » arena.glb tel quel (Y-up,
// table centrée à l'origine), matériaux reteintés et animés par arenaRig.ts. Visible pendant les plans
// arène (beats 2 à 4). Mobile : sans les pièces ni la rangée de mana adverse (moins d'objets).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { buildArena, disposeArena, updateArena } from './arenaRig'
import { useEasterModel } from './models'
import { E, SHOT } from './state'

type ArenaProps = { bloom: boolean; mobile: boolean }

export function Arena({ bloom, mobile }: ArenaProps) {
  const { scene } = useEasterModel('arena')
  const rig = useMemo(() => buildArena(scene, bloom, mobile), [scene, bloom, mobile])
  useEffect(
    () => () => {
      disposeArena(rig)
    },
    [rig],
  )

  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    g.visible = E.shot === SHOT.arena
    if (g.visible) updateArena(rig, E.arena, clock.elapsedTime, E.reduced)
  })

  return (
    <group ref={group}>
      <primitive object={rig.root} />
    </group>
  )
}
