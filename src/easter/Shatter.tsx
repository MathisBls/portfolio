// Easter egg, beat 1 (0–7 s, retour de Mathis du 2026-10-06) : zoom lent sur le prisme intact pendant
// 5 s, la tension monte (lueur intérieure qui grandit et respire lentement, verre qui vibre de plus en
// plus, E.focus et E.tremble), une demi-seconde suspendue, puis il éclate d'un coup : éclats instanciés
// projetés vers la caméra (shardBurst.ts), éclair unique (lumière ponctuelle + halo, E.flash). Fondu au
// noir : Atmosphere (E.fade). Le prisme du hero (prism.glb, échelle 1.15, inclinaison x 0.1 / y −0.35)
// en verre sans transmission (PrismGlass mobile), haut dans le ciel au-dessus de l'arène.
// Reduced-motion : prisme immobile, jamais d'éclatement (fondu enchaîné vers l'arène).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  type Group,
  type InstancedMesh,
  type Mesh,
  MeshPhysicalMaterial,
  type PointLight,
} from 'three'
import { PrismGlass } from '../scene/materials/PrismGlass'
import { useModel } from '../scene/useModel'
import { SKY_Y } from './layout'
import { BURST_TIME, createBurst, createShardGeometry, updateBurst } from './shardBurst'
import { createGlow, updateGlow } from './shaders'
import { E, SHOT } from './state'

const SCALE = 1.15

type ShatterProps = { mobile: boolean; reducedMotion: boolean }

/** Rotation lente (sauf reduced-motion) et vibration du verre qui monte avec la tension. */
function tremblePrism(group: Group, amount: number, time: number, still: boolean) {
  const drift = still ? 0 : time * 0.12
  group.rotation.set(
    0.1 + amount * 0.025 * Math.sin(time * 41),
    -0.35 + drift + amount * 0.03 * Math.sin(time * 37 + 1),
    amount * 0.02 * Math.sin(time * 29 + 2),
  )
  group.position.set(amount * 0.02 * Math.sin(time * 53), SKY_Y, 0)
}

/** Lueur intérieure : grandit avec la tension, respire lentement (0.5 Hz, pas un clignotement). */
const breath = (time: number, focus: number) => focus * (0.8 + 0.2 * Math.sin(time * 3.2))

export function Shatter({ mobile, reducedMotion }: ShatterProps) {
  const { nodes } = useModel('prism')
  const res = useMemo(() => {
    const geometry = createShardGeometry()
    const material = new MeshPhysicalMaterial({
      color: '#c9dcff',
      metalness: 0.1,
      roughness: 0.08,
      clearcoat: 1,
      iridescence: 0.7,
      envMapIntensity: 3,
      transparent: true,
      opacity: 0.85,
    })
    return {
      geometry,
      material,
      burst: createBurst(mobile ? 40 : 110),
      glow: createGlow('#dfe8ff'),
      core: createGlow('#cfe0ff', 2.4),
    }
  }, [mobile])
  useEffect(
    () => () => {
      res.geometry.dispose()
      res.material.dispose()
      res.glow.dispose()
      res.core.dispose()
    },
    [res],
  )

  const root = useRef<Group>(null)
  const prism = useRef<Group>(null)
  const shards = useRef<InstancedMesh>(null)
  const light = useRef<PointLight>(null)
  const glow = useRef<Mesh>(null)
  const core = useRef<Mesh>(null)

  useFrame(({ camera, clock }) => {
    const r = root.current
    if (!r) return
    r.visible = E.shot === SHOT.sky
    if (!r.visible) return
    const exploded = E.shatter > 0
    if (prism.current) {
      prism.current.visible = !exploded
      tremblePrism(prism.current, E.tremble, clock.elapsedTime, reducedMotion)
    }
    if (shards.current) {
      shards.current.visible = exploded
      if (exploded) updateBurst(shards.current, res.burst, E.shatter * BURST_TIME)
    }
    const inner = exploded ? 0 : breath(clock.elapsedTime, E.focus)
    if (light.current) light.current.intensity = 500 * E.flash + 14 * inner
    if (glow.current) updateGlow(glow.current, res.glow, camera, 2 * E.flash)
    if (core.current) updateGlow(core.current, res.core, camera, 0.32 * inner)
  })

  // La lumière reste hors du groupe masqué : le nombre de lumières visibles ne change jamais (sinon tous
  // les shaders seraient recompilés en pleine séquence).
  return (
    <>
      <pointLight ref={light} position={[0, SKY_Y, 1.5]} color="#dfe8ff" intensity={0} decay={2} />
      <group ref={root}>
        <group ref={prism} scale={SCALE}>
          <mesh geometry={nodes.Prism.geometry} rotation={nodes.Prism.rotation}>
            <PrismGlass mobile reducedMotion />
          </mesh>
        </group>
        <group position={[0, SKY_Y, 0]} scale={SCALE}>
          <instancedMesh
            ref={shards}
            args={[res.geometry, res.material, res.burst.count]}
            frustumCulled={false}
          />
        </group>
        <mesh ref={glow} position={[0, SKY_Y, 0.5]} scale={7} material={res.glow}>
          <planeGeometry />
        </mesh>
        <mesh ref={core} position={[0, SKY_Y, -0.6]} scale={2.6} material={res.core}>
          <planeGeometry />
        </mesh>
      </group>
    </>
  )
}
