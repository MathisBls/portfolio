// Storyboard hero (docs/storyboards/hero.md §2) : p 0.0 (prisme au centre, tilt x 0.1 / y −0.35,
// flottement), 0.1-0.3 (faisceau, beamT), 0.3-0.5 (Spec0..6 un par un, rayT), 0.6-0.8 (quart de tour
// sur Z, tilt → 0, turnT), 0.8-1.0 (dispersion, spreadT) et « Passage de relais à Projects ».
// Mesures du GLB : docs/models.md (prism.glb). Groupes : cadrage > flottement > quart de tour > tilt.
// Après le hero (fenêtres dans lib/journey.ts) : docs/storyboards/projects.md §2, projects 0.1 « Le
// groupe du prisme monte (y 0 → +3.4) » et 0.2–0.9 « son rayon se réoriente vers l'objet » (prismFocus) ;
// docs/storyboards/services-contact.md §2, 2.3 « Les rayons se rétractent » et 3.0–3.5 « Le prisme
// redescend au centre, rotation z → 0 [...] lumière blanche seule. Flottement lent. » (timeline +1).
// Retours de Mathis et de la review : pendant les projets, seul le rayon actif (fanOutT) ; le spectre
// naît sur la face de sortie du prisme (buildRays, exit).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { site } from '../../content/site'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { SPREAD, rayT, spreadT, turnT } from '../../lib/hero'
import { JOURNEY, fanOutT, liftT, retractT, untwistT } from '../../lib/journey'
import { easeInOut, lerp } from '../../lib/math'
import { useAnchor, useContinuousInvalidate, useInView } from '../hooks'
import { PrismGlass } from '../materials/PrismGlass'
import { setEmissive } from '../materials/emissive'
import { getProgress, setSceneFlag } from '../store'
import { useModel } from '../useModel'
import { Beam } from './Beam'
import {
  aimRay,
  beginAim,
  buildRays,
  createRayFocus,
  cullGlass,
  updateRayFocus,
} from './prismFocus'

type PrismProps = { mobile: boolean; reducedMotion: boolean }

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
  const glass = useRef<Mesh>(null)
  const focus = useRef(createRayFocus())
  const pivots = useRef<(Group | null)[]>([])
  const rayMeshes = useRef<(Mesh | null)[]>([])
  const intro = useRef({ k: reducedMotion ? 1 : 0 })

  const { exit, rays } = useMemo(
    () => buildRays(nodes, materials, bloom),
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

  // Flottement : seule boucle continue du prisme, desktop, quand le hero ou le contact est à l'écran
  const heroTitle = useAnchor('hero-title')
  const heroSection = useMemo(() => heroTitle?.closest('section') ?? null, [heroTitle])
  const contactSection = useMemo(() => document.getElementById(site.sections.contact.id), [])
  const heroInView = useInView(heroSection)
  const contactInView = useInView(contactSection, false)
  useContinuousInvalidate(floating && (heroInView || contactInView))

  useFrame((state, delta) => {
    const f = frame.current
    const fl = float.current
    const tu = turn.current
    const ti = tilt.current
    const gl = glass.current
    if (!f || !fl || !tu || !ti || !gl) return
    const p = getProgress('hero')
    const contact = getProgress('contact')
    const retract = retractT(getProgress('services'))

    const k = easeInOut(turnT(p))
    f.scale.setScalar(lerp(fitScale, SCALE, k) * lerp(0.82, 1, intro.current.k))
    f.position.y = JOURNEY.riseY * liftT(getProgress('projects'), contact)
    fl.position.y = floating ? Math.sin(state.clock.elapsedTime * 0.9) * 0.05 : 0

    tu.rotation.z = TURN * k * (1 - untwistT(contact))
    ti.rotation.set(TILT.x * (1 - k), TILT.y * (1 - k), 0)

    // Hors cadre (projets, services, à propos) : plus de transmission ; plus rien une fois rétracté
    f.visible = cullGlass(gl, state.camera) || retract < 1

    // Rayons : croissance, dispersion (hero) ; seul le rayon actif, jusqu'à son objet (projets) ;
    // rétractation (services). La couleur tend vers l'accent dès que l'éventail laisse place au rayon actif.
    beginAim(ti, exit)
    updateRayFocus(focus.current, state, delta)
    const mode = fanOutT(getProgress('projects'))
    const s = easeInOut(spreadT(p))
    const spread = lerp(1, SPREAD.length, s)
    const opening = lerp(1, SPREAD.angle, s)
    rays.forEach((ray, i) => {
      const pivot = pivots.current[i]
      const mesh = rayMeshes.current[i]
      if (!pivot || !mesh) return
      const g = rayT(p, i)
      const rest = (ray.theta + Math.PI / 2) * opening - Math.PI / 2
      const pose = aimRay(focus.current, i, ray, rest, spread + ray.extra, mode, pivot.rotation.z)
      const length = easeOut(g) * pose.length * (1 - retract)
      const intensity = lerp(ray.peak, ray.accentPeak, mode) * pose.show * g
      pivot.visible = length > 1e-3 && intensity > 1e-3
      pivot.scale.y = Math.max(length, 1e-4)
      pivot.rotation.z = pose.rotation
      setEmissive(mesh, ray.tint, mode, intensity, pose.show)
    })
  })

  return (
    <group ref={frame} scale={fitScale}>
      <group ref={float}>
        <group ref={turn}>
          <group ref={tilt} rotation={[TILT.x, TILT.y, 0]}>
            <mesh ref={glass} geometry={nodes.Prism.geometry} rotation={nodes.Prism.rotation}>
              <PrismGlass mobile={mobile} reducedMotion={reducedMotion} />
            </mesh>
            <Beam beamIn={nodes.BeamIn} exit={exit} source={materials.BeamWhite} bloom={bloom} />
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
