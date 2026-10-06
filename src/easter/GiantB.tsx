// Easter egg, beat 5 (16–26 s) : « Le B en grandeur nature, des dizaines d'unités : on le parcourt en
// volant le long de ses courbes [...] La lumière vire progressivement au rouge. » Et beat 6 (26–29 s) :
// « le B apparaît en entier, de face, rose et blanc dans un halo rouge, en rotation lente. »
// b_logo.glb (B_Logo) à l'échelle GIANT_SCALE (30 : 52 unités de haut), centré à l'origine, face lisible
// vers −Z. Matériaux et épaisseur : giantRig.ts. Rotation lente (balancement ±0.35 rad) coupée en
// reduced-motion. Halo : deux dégradés additifs derrière le B.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { buildGiant, extrudeGiant, tintGiant } from './giantRig'
import { GIANT_SCALE } from './layout'
import { useEasterModel } from './models'
import { createGlow, updateGlow } from './shaders'
import { E, SHOT } from './state'

export function GiantB() {
  const { nodes } = useEasterModel('logo')
  const logo = nodes.B_Logo
  const rig = useMemo(() => (logo ? buildGiant(logo) : null), [logo])
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
  const inner = useRef<Group>(null)
  const outer = useRef<Mesh>(null)
  const core = useRef<Mesh>(null)

  useFrame(({ camera }, delta) => {
    const r = root.current
    if (!r || !rig) return
    r.visible = E.shot >= SHOT.flight
    if (!r.visible) return
    const finale = E.shot === SHOT.finale
    if (finale && !E.reduced) E.spin += delta
    if (sway.current) {
      sway.current.rotation.y = Math.sin(E.spin * 0.45) * 0.35
      sway.current.position.y = Math.sin(E.spin * 0.7) * 0.8
    }
    if (inner.current) extrudeGiant(inner.current, E)
    tintGiant(rig, E)
    if (outer.current) updateGlow(outer.current, halos.outer, camera, finale ? 1.1 * E.halo : 0)
    if (core.current) updateGlow(core.current, halos.inner, camera, finale ? 0.45 * E.halo : 0)
  })

  if (!rig) return null
  return (
    <group ref={root}>
      <group ref={sway}>
        <group scale={GIANT_SCALE}>
          <group ref={inner}>
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
