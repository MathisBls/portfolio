// Easter egg, beat 6 : « Silence d'une demi-seconde, impact, puis le B apparaît en entier, de face, rose
// et blanc dans un halo rouge, en rotation lente. » b_logo.glb (B_Logo) à l'échelle GIANT_SCALE (30 : 52
// unités de haut), centré à l'origine, face lisible vers −Z, épaissi (giantRig.ts). Rotation lente
// (balancement ±0.35 rad) coupée en reduced-motion. Halo : deux dégradés additifs derrière le B.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { THICKNESS, buildGiant, thicknessOffset } from './giantRig'
import { GIANT_SCALE } from './layout'
import { useEasterModel } from './models'
import { createGlow, updateGlow } from './shaders'
import { E, SHOT } from './state'

type GiantBProps = { bloom: boolean; reducedMotion: boolean }

export function GiantB({ bloom, reducedMotion }: GiantBProps) {
  const { nodes } = useEasterModel('logo')
  const logo = nodes.B_Logo
  const rig = useMemo(() => (logo ? buildGiant(logo, bloom) : null), [logo, bloom])
  const halos = useMemo(
    () => ({ outer: createGlow('#ff1424', 1.6), inner: createGlow('#ff8a7a', 2.6) }),
    [],
  )
  useEffect(() => rig?.dispose, [rig])
  useEffect(
    () => () => {
      halos.outer.dispose()
      halos.inner.dispose()
    },
    [halos],
  )

  const root = useRef<Group>(null)
  const sway = useRef<Group>(null)
  const outer = useRef<Mesh>(null)
  const core = useRef<Mesh>(null)

  useFrame(({ camera }, delta) => {
    const r = root.current
    if (!r || !rig) return
    r.visible = E.shot === SHOT.finale
    if (!r.visible) return
    if (!E.reduced) E.spin += delta
    if (sway.current) {
      sway.current.rotation.y = Math.sin(E.spin * 0.45) * 0.35
      sway.current.position.y = Math.sin(E.spin * 0.7) * 0.8
    }
    if (outer.current) updateGlow(outer.current, halos.outer, camera, 1.1 * E.halo)
    if (core.current) updateGlow(core.current, halos.inner, camera, 0.45 * E.halo)
  })

  if (!rig) return null
  return (
    <group ref={root}>
      <group ref={sway}>
        <group scale={GIANT_SCALE}>
          <group
            scale-z={reducedMotion ? 1 : THICKNESS}
            position-z={reducedMotion ? 0 : thicknessOffset(THICKNESS)}
          >
            <primitive object={rig.root} />
          </group>
        </group>
      </group>
      <mesh ref={outer} position={[0, 0, 40]} scale={190} material={halos.outer}>
        <planeGeometry />
      </mesh>
      <mesh ref={core} position={[0, 0, 25]} scale={80} material={halos.inner}>
        <planeGeometry />
      </mesh>
    </group>
  )
}
