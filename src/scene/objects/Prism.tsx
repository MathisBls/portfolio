// Storyboard hero (docs/storyboards/hero.md §2) : p 0.0 (prisme au centre, tilt x 0.1 / y −0.35,
// flottement), 0.1-0.3 (faisceau, beamT), 0.3-0.5 (Spec0..6 un par un, rayT), 0.6-0.8 (quart de tour
// sur Z, tilt → 0, turnT), 0.8-1.0 (dispersion, spreadT) et « Passage de relais à Projects ».
// Mesures du GLB : docs/models.md (prism.glb). Groupes : cadrage > flottement > quart de tour > tilt.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { SPREAD, rayT, spreadT, turnT } from '../../lib/hero'
import { easeInOut, lerp } from '../../lib/math'
import { useAnchor, useContinuousInvalidate, useInView } from '../hooks'
import { PrismGlass } from '../materials/PrismGlass'
import { cloneEmissive, setEmissiveIntensity } from '../materials/emissive'
import { getProgress, setSceneFlag } from '../store'
import { useModel } from '../useModel'
import { Beam } from './Beam'
import { segment } from './segment'

type PrismProps = { mobile: boolean; reducedMotion: boolean }

const SPEC = ['Spec0', 'Spec1', 'Spec2', 'Spec3', 'Spec4', 'Spec5', 'Spec6'] as const

/** Cadrage : à la clé caméra 0, le prisme (1.47 de haut) occupe ~40 % de la hauteur d'écran. */
const SCALE = 1.15
/** Portrait étroit : à p 0, l'échelle suit la largeur (prisme ~55 % de la largeur d'écran), puis revient
 *  à SCALE pendant le quart de tour pour que l'éventail final sorte de l'écran par le bas. */
const SCALE_PER_ASPECT = 1.37
const TILT = { x: 0.1, y: -0.35 }
const TURN = -Math.PI / 2
/** Rayons affinés (section du GLB 0.05) : des traits de lumière plutôt que des tubes. */
const RAY_WIDTH = 0.6

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

export function Prism({ mobile, reducedMotion }: PrismProps) {
  const { nodes, materials } = useModel('prism')
  const invalidate = useThree((s) => s.invalidate)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const bloom = !mobile && !reducedMotion
  const floating = !mobile && !reducedMotion
  const fitScale = Math.min(SCALE, SCALE_PER_ASPECT * aspect)

  const frame = useRef<Group>(null)
  const float = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const pivots = useRef<(Group | null)[]>([])
  const rayMeshes = useRef<(Mesh | null)[]>([])
  const intro = useRef({ k: reducedMotion ? 1 : 0 })

  const rays = useMemo(
    () =>
      SPEC.map((name) => ({
        name,
        geometry: nodes[name].geometry,
        ...segment(nodes[name]),
        ...cloneEmissive(materials[name], bloom),
      })),
    [nodes, materials, bloom],
  )

  useEffect(
    () => () => {
      rays.forEach((ray) => {
        ray.material.dispose()
      })
    },
    [rays],
  )

  // Prisme prêt : le poster SVG s'efface (CSS), les triggers recalculent après le chargement du GLB
  useEffect(() => {
    setSceneFlag('has-scene', true)
    ScrollTrigger.refresh()
    invalidate()
    return () => {
      setSceneFlag('has-scene', false)
    }
  }, [invalidate])

  // Intro au montage (0.8 s), sautée en reduced-motion
  useEffect(() => {
    const state = intro.current
    if (reducedMotion) {
      state.k = 1
      invalidate()
      return
    }
    const tween = gsap.fromTo(
      state,
      { k: 0 },
      { k: 1, duration: 0.8, ease: 'power2.out', onUpdate: invalidate },
    )
    return () => {
      tween.kill()
      state.k = 1
    }
  }, [reducedMotion, invalidate])

  // Flottement : seule boucle continue, desktop, tant que le hero est à l'écran
  const heroTitle = useAnchor('hero-title')
  const heroSection = useMemo(() => heroTitle?.closest('section') ?? null, [heroTitle])
  const heroInView = useInView(heroSection)
  useContinuousInvalidate(floating && heroInView)

  useFrame((state) => {
    const f = frame.current
    const fl = float.current
    const tu = turn.current
    const ti = tilt.current
    if (!f || !fl || !tu || !ti) return
    const p = getProgress('hero')

    const k = easeInOut(turnT(p))
    f.scale.setScalar(lerp(fitScale, SCALE, k) * lerp(0.82, 1, intro.current.k))
    fl.position.y = floating ? Math.sin(state.clock.elapsedTime * 0.9) * 0.05 : 0

    tu.rotation.z = TURN * k
    ti.rotation.set(TILT.x * (1 - k), TILT.y * (1 - k), 0)

    // Rayons : croissance depuis l'origine, puis dispersion (longueur et ouverture de l'éventail)
    const s = easeInOut(spreadT(p))
    const length = lerp(1, SPREAD.length, s)
    const opening = lerp(1, SPREAD.angle, s)
    rays.forEach((ray, i) => {
      const pivot = pivots.current[i]
      const mesh = rayMeshes.current[i]
      if (!pivot || !mesh) return
      const g = rayT(p, i)
      pivot.visible = g > 0
      pivot.scale.y = Math.max(easeOut(g), 1e-4) * length
      pivot.rotation.z = (ray.theta + Math.PI / 2) * opening - Math.PI / 2
      setEmissiveIntensity(mesh, ray.peak * g)
    })
  })

  return (
    <group ref={frame} scale={fitScale}>
      <group ref={float}>
        <group ref={turn}>
          <group ref={tilt} rotation={[TILT.x, TILT.y, 0]}>
            <mesh geometry={nodes.Prism.geometry} rotation={nodes.Prism.rotation}>
              <PrismGlass mobile={mobile} reducedMotion={reducedMotion} />
            </mesh>
            <Beam
              beamIn={nodes.BeamIn}
              exit={nodes.Spec3}
              source={materials.BeamWhite}
              bloom={bloom}
            />
            {rays.map((ray, i) => (
              <group
                key={ray.name}
                ref={(g) => {
                  pivots.current[i] = g
                }}
                position={[ray.x0, ray.y0, 0]}
                rotation-z={ray.theta}
                scale={[RAY_WIDTH, 1e-4, RAY_WIDTH]}
                visible={false}
              >
                <mesh
                  ref={(m) => {
                    rayMeshes.current[i] = m
                  }}
                  geometry={ray.geometry}
                  material={ray.material}
                  position-y={ray.half}
                />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}
