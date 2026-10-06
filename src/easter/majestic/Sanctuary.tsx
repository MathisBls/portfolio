// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 4 « Une montagne
// gigantesque sort du sol devant nous », beat 5 « 12 colosses encapuchonnés (≈ 80 m) surgissent en cercle
// autour de la montagne », beat 6 « Le sommet s'ouvre sur un prisme de verre géant [...] Le B sculpté
// s'allume ») : les objets du Sanctuaire possédés par D3, montés par MajesticWorld. Construction et mise
// à jour hors React (mountainRig.ts, summitRig.ts, choirRig.ts), à partir de M dans useFrame, sans
// setState ; textures du Sanctuaire posées au montage (materials.ts, 1K sur mobile). Paliers : 8 statues
// sur mobile, émissifs plafonnés sans bloom, aucune vibration en reduced-motion.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { choirCount } from './layout'
import type { MajesticNodes } from './model'
import { buildChoir, updateChoir } from './choirRig'
import { dressMaterials } from './materials'
import { buildMountain, updateMountain } from './mountainRig'
import { M } from './state'

type ObjectProps = { nodes: MajesticNodes; mobile: boolean; bloom: boolean }

/** La montagne, son B sculpté et son sommet (coques et prisme). */
export function Mountain({ nodes, mobile, bloom }: ObjectProps) {
  const rig = useMemo(() => buildMountain(nodes, bloom), [nodes, bloom])
  useEffect(() => rig.dispose, [rig])
  useEffect(() => dressMaterials([rig.root], mobile), [rig, mobile])
  useFrame(({ clock }) => {
    updateMountain(rig, M, clock.elapsedTime)
  })
  return <primitive object={rig.root} />
}

/** Le chœur des colosses. */
export function Choir({ nodes, mobile, bloom }: ObjectProps) {
  const rig = useMemo(
    () => buildChoir(nodes.get('Choir_Statue'), choirCount(mobile), bloom),
    [nodes, mobile, bloom],
  )
  useEffect(() => rig.dispose, [rig])
  useEffect(() => dressMaterials([rig.root], mobile), [rig, mobile])
  useFrame(({ clock }) => {
    updateChoir(rig, M, clock.elapsedTime)
  })
  return <primitive object={rig.root} />
}
