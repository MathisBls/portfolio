// Easter egg v3, beats 3 et 4 (docs/storyboards/easter-park.md : route, puis « les traînées s'étirent puis
// se résorbent en étoiles ») : traînées d'étoiles (instanced) pendant la course sur la route. Un seul draw
// call : des étoiles autour de l'axe de la caméra, étirées vers l'arrière selon la vitesse, du blanc
// bleuté au rouge (E.red). À la sortie du warp, elles s'étirent encore (E.stretch) puis raccourcissent
// avec la vitesse jusqu'à n'être plus que des points, qui s'effacent pendant que le ciel apparaît (E.sky).
// Calcul en vertex shader (streakShader.ts) ; ici quelques uniformes par frame. Non monté en
// reduced-motion (route immobile). Mobile : 3 fois moins d'étoiles.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group } from 'three'
import { createStreaks, updateStreaks } from './streakShader'
import { E, SHOT } from './state'

const COLD = new Color('#cfd8ff')
const RED = new Color('#ff2a36')
const color = new Color()

type StreaksProps = { mobile: boolean }

export function Streaks({ mobile }: StreaksProps) {
  const res = useMemo(() => createStreaks(mobile ? 220 : 650), [mobile])
  useEffect(
    () => () => {
      res.geometry.dispose()
      res.material.dispose()
    },
    [res],
  )
  const group = useRef<Group>(null)

  useFrame(({ camera }, delta) => {
    const g = group.current
    if (!g) return
    const warp = E.shot === SHOT.road || E.shot === SHOT.space
    const speed = warp ? E.speed : 0
    const fade = E.shot === SHOT.space ? 1 - E.sky : 1
    g.visible = warp && fade > 0.01 && (speed > 0.001 || E.stretch > 0.001)
    if (!g.visible) return
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    updateStreaks(res.material, delta, speed, color.copy(COLD).lerp(RED, E.red), E.stretch, fade)
  })

  return (
    <group ref={group}>
      <mesh geometry={res.geometry} material={res.material} frustumCulled={false} />
    </group>
  )
}
