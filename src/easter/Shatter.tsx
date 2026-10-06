// Easter egg, beat 1 (0–1.5 s) : « Le prisme éclate : des éclats partent vers la caméra, puis fondu au
// noir. » Le prisme du hero (prism.glb, même cadrage : échelle 1.15, inclinaison x 0.1 / y −0.35) en
// verre sans transmission (un seul passage, PrismGlass mobile), haut dans le ciel au-dessus de l'arène.
// Il tremble (E.tremble), puis disparaît d'un coup : éclats instanciés (shardBurst.ts), éclair unique
// (lumière ponctuelle + halo, E.flash). Fondu au noir : Atmosphere (E.fade). Non monté en reduced-motion.
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

type ShatterProps = { mobile: boolean }

function tremblePrism(group: Group, amount: number, time: number) {
  group.rotation.set(
    0.1 + amount * 0.04 * Math.sin(time * 41),
    -0.35 + time * 0.25 + amount * 0.05 * Math.sin(time * 37 + 1),
    amount * 0.03 * Math.sin(time * 29 + 2),
  )
  group.position.set(amount * 0.03 * Math.sin(time * 53), SKY_Y, 0)
}

export function Shatter({ mobile }: ShatterProps) {
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
    return { geometry, material, burst: createBurst(mobile ? 28 : 72), glow: createGlow('#dfe8ff') }
  }, [mobile])
  useEffect(
    () => () => {
      res.geometry.dispose()
      res.material.dispose()
      res.glow.dispose()
    },
    [res],
  )

  const root = useRef<Group>(null)
  const prism = useRef<Group>(null)
  const shards = useRef<InstancedMesh>(null)
  const light = useRef<PointLight>(null)
  const glow = useRef<Mesh>(null)

  useFrame(({ camera, clock }) => {
    const r = root.current
    if (!r) return
    r.visible = E.shot === SHOT.sky
    if (!r.visible) return
    const exploded = E.shatter > 0
    if (prism.current) {
      prism.current.visible = !exploded
      tremblePrism(prism.current, E.tremble, clock.elapsedTime)
    }
    if (shards.current) {
      shards.current.visible = exploded
      if (exploded) updateBurst(shards.current, res.burst, E.shatter * BURST_TIME)
    }
    if (light.current) light.current.intensity = 400 * E.flash
    if (glow.current) updateGlow(glow.current, res.glow, camera, 2 * E.flash)
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
      </group>
    </>
  )
}
