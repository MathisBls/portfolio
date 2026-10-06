// Easter egg, beat 5 : traînées d'étoiles (instanced) pendant la course sur la route. Un seul draw call :
// des étoiles autour de l'axe de la caméra, étirées vers l'arrière selon la vitesse, du blanc bleuté au
// rouge (E.red). Calcul en vertex shader (streakShader.ts) ; ici seulement 4 uniformes par frame.
// Non monté en reduced-motion (route immobile). Mobile : 3 fois moins d'étoiles.
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
    const speed = E.shot === SHOT.road ? E.speed : 0
    g.visible = speed > 0.001
    if (!g.visible) return
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    updateStreaks(res.material, delta, speed, color.copy(COLD).lerp(RED, E.red))
  })

  return (
    <group ref={group}>
      <mesh geometry={res.geometry} material={res.material} frustumCulled={false} />
    </group>
  )
}
