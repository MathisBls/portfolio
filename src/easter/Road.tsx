// Easter egg, beat 5 (retour de Mathis du 2026-10-06) : « on file tout droit sur une route à la vitesse
// de la lumière [...] chaussée sombre, lignes de voie émissives qui défilent, bords lumineux, horizon ».
// La caméra reste fixe, la route défile (E.road, distance parcourue, roadPath.ts) : chaussée et réverbères
// en shaders (roadShader.ts), lueur d'horizon (halo additif) vers laquelle tout converge. Les couleurs
// virent au rouge avec E.red. Reduced-motion : route immobile (E.road reste à 0).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group, type Mesh } from 'three'
import { CAMERA_Z } from './roadPath'
import { createPosts, createRoadMaterial, updatePosts, updateRoad } from './roadShader'
import { createGlow, tintGlow, updateGlow } from './shaders'
import { E, SHOT } from './state'

const EDGE = { cold: new Color('#9fd8ff'), red: new Color('#ff1e2e') }
const HORIZON = { cold: new Color('#ff86b0'), red: new Color('#ff2030') }
const LAMP = { cold: new Color('#ffd9b0'), red: new Color('#ff4a3a') }
const colors = { edge: new Color(), horizon: new Color(), lamp: new Color() }
/** Plan de la route : de 20 unités derrière la caméra jusqu'au-delà du brouillard. */
const PLANE = { width: 1400, length: 760 }

type RoadProps = { mobile: boolean }

export function Road({ mobile }: RoadProps) {
  const res = useMemo(
    () => ({
      road: createRoadMaterial(),
      posts: createPosts(mobile ? 36 : 64, 26, CAMERA_Z + 20),
      horizon: createGlow('#ff86b0', 1.4),
    }),
    [mobile],
  )
  useEffect(
    () => () => {
      res.road.dispose()
      res.posts.dispose()
      res.horizon.dispose()
    },
    [res],
  )
  const group = useRef<Group>(null)
  const glow = useRef<Mesh>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = E.shot === SHOT.road
    if (!g.visible) return
    colors.edge.copy(EDGE.cold).lerp(EDGE.red, E.red)
    colors.horizon.copy(HORIZON.cold).lerp(HORIZON.red, E.red)
    colors.lamp.copy(LAMP.cold).lerp(LAMP.red, E.red)
    updateRoad(res.road, E.road, E.speed, colors.edge, colors.horizon, 2.2 + 1.5 * E.red)
    updatePosts(res.posts.material, E.road, colors.lamp)
    tintGlow(res.horizon, colors.horizon)
    if (glow.current) updateGlow(glow.current, res.horizon, null, 0.55 + 0.75 * E.red)
  })

  return (
    <group ref={group}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, CAMERA_Z + 20 - PLANE.length / 2]}
        material={res.road}
      >
        <planeGeometry args={[PLANE.width, PLANE.length]} />
      </mesh>
      <mesh geometry={res.posts.geometry} material={res.posts.material} frustumCulled={false} />
      <mesh ref={glow} position={[0, 2, -560]} scale={[1500, 320, 1]} material={res.horizon}>
        <planeGeometry />
      </mesh>
    </group>
  )
}
