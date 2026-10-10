// Storyboard hero (docs/storyboards/hero.md §2) : p 0.0 (prisme au centre, tilt x 0.1 / y −0.35,
// flottement), 0.1-0.3 (faisceau, beamT), 0.3-0.5 (Spec0..6 un par un, rayT), 0.6-0.8 (quart de tour
// sur Z, tilt → 0, turnT), 0.8-1.0 (dispersion, spreadT) et « Passage de relais à Projects ».
// Mesures du GLB : docs/models.md (prism.glb). Groupes : cadrage > flottement > quart de tour > tilt.
// Après le hero (fenêtres dans lib/journey.ts) : docs/storyboards/projects.md §2, projects 0.1 « Le
// groupe du prisme monte (y 0 → +3.4) » et 0.2–0.9 « son rayon se réoriente vers l'objet » (prismFocus) ;
// docs/storyboards/services-contact.md §2, 2.3 « Les rayons se rétractent » et 3.0–3.5 « Le prisme
// redescend au centre, rotation z → 0 [...] lumière blanche seule. Flottement lent. » (timeline +1).
// Retours de Mathis et de la review : pendant les projets, seul le rayon actif (fanOutT) ; le spectre
// naît sur la face de sortie du prisme (buildRays, exit). Mobile : pas de visée des objets (prismFocus).
// docs/storyboards/story-v2.md : « Chargement : des éclats s'assemblent en prisme » (getPrismReveal) ;
// Work : levé, il suit la descente de la caméra (prismPath.ts) ; « Contact (arrivée) : vide, ni faisceau
// ni rayons » ; « Contact (envoi réussi) : le spectre jaillit (≈ 2 s), puis se pose » (lib/burst.ts).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { type Fan, burstFan, burstRay } from '../../lib/burst'
import { ScrollTrigger } from '../../lib/gsap'
import { SPREAD, rayT, spreadT, turnT } from '../../lib/hero'
import { fanOutT, retractT, untwistT } from '../../lib/journey'
import { clamp, easeInOut, lerp } from '../../lib/math'
import { PrismGlass } from '../materials/PrismGlass'
import { setEmissive } from '../materials/emissive'
import { getPrismReveal } from '../intro'
import { prismY } from '../prismPath'
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
import { burstWeight, ideaElapsed, usePrismLoop } from './prismLoop'

type PrismProps = { mobile: boolean; reducedMotion: boolean }

/** Cadrage : à la clé caméra 0, le prisme (1.47 de haut) occupe ~40 % de la hauteur d'écran. */
const SCALE = 1.15
/** Portrait étroit : à p 0, l'échelle suit la largeur (prisme ~55 % de la largeur d'écran), puis revient
 *  à SCALE pendant le quart de tour pour que l'éventail final sorte de l'écran par le bas. */
const SCALE_PER_ASPECT = 1.37
const TILT = { x: 0.1, y: -0.35 }
/** Quart de tour du hero ; au Contact (écran large), léger angle : le faisceau arrive sous le texte. */
const TURN = { hero: -Math.PI / 2, contact: 0.3 }
/** Rayons affinés (section du GLB 0.05) : des traits de lumière plutôt que des tubes. */
const RAY_WIDTH = 0.6

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
/** Apparition (intro d'assemblage) : échelle de départ et quart de tour sur y rattrapé en arrivant. */
const REVEAL = { scale: 0.3, spin: 1.2 }
const fan: Fan = { opening: 1, length: 1, flash: 0 }

export function Prism({ mobile, reducedMotion }: PrismProps) {
  const { nodes, materials } = useModel('prism')
  const invalidate = useThree((s) => s.invalidate)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const bloom = !mobile && !reducedMotion
  const floating = !mobile && !reducedMotion
  const fitScale = Math.min(SCALE, SCALE_PER_ASPECT * aspect)
  const landscape = clamp((aspect - 0.9) / 0.5)

  const frame = useRef<Group>(null)
  const float = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const glass = useRef<Mesh>(null)
  const focus = useRef(createRayFocus())
  const pivots = useRef<(Group | null)[]>([])
  const rayMeshes = useRef<(Mesh | null)[]>([])

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

  // Flottement (hero ou Contact à l'écran) et rafale de 2 s à l'envoi du formulaire
  usePrismLoop(floating, reducedMotion)

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
    // Intro d'assemblage (ShardField) : le prisme grandit et se tourne en place pendant que les éclats
    // arrivent ; 1 sans intro (reduced-motion, page rechargée plus bas)
    const reveal = getPrismReveal()
    const r = 1 - (1 - reveal) ** 3

    const k = easeInOut(turnT(p))
    f.scale.setScalar(lerp(fitScale, SCALE, k) * lerp(REVEAL.scale, 1, r))
    f.position.y = prismY()
    fl.position.y = floating ? Math.sin(state.clock.elapsedTime * 0.9) * 0.05 : 0

    const u = untwistT(contact)
    tu.rotation.z = TURN.hero * k * (1 - u) + TURN.contact * landscape * u
    ti.rotation.set(TILT.x * (1 - k), TILT.y * (1 - k) + REVEAL.spin * (1 - r), 0)

    // Hors cadre (projets, services, à propos) : plus de transmission ; plus rien une fois rétracté
    f.visible = reveal > 0.01 && (cullGlass(gl, state.camera) || retract < 1)

    // Rayons : croissance, dispersion (hero) ; seul le rayon actif, couleur de l'accent (projets) ;
    // rétractation (services) ; au Contact, après l'envoi, l'éventail jaillit puis se pose (burstFan).
    const elapsed = ideaElapsed(reducedMotion)
    const burst = burstWeight(elapsed)
    burstFan(elapsed, fan)
    beginAim(ti, exit)
    // Mobile : pas de visée (objets 3D montés depuis le 2026-10-10, rayon peu lisible en une colonne)
    updateRayFocus(focus.current, state, delta, !mobile)
    const mode = fanOutT(getProgress('projects')) * (1 - burst)
    const s = easeInOut(spreadT(p))
    const spread = lerp(lerp(1, SPREAD.length, s), fan.length, burst)
    const opening = lerp(lerp(1, SPREAD.angle, s), fan.opening, burst)
    const open = lerp(1 - retract, 1, burst)
    rays.forEach((ray, i) => {
      const pivot = pivots.current[i]
      const mesh = rayMeshes.current[i]
      if (!pivot || !mesh) return
      const g = lerp(rayT(p, i), burstRay(elapsed, i), burst)
      const rest = (ray.theta + Math.PI / 2) * opening - Math.PI / 2
      const pose = aimRay(focus.current, i, ray, rest, spread + ray.extra, mode, pivot.rotation.z)
      const length = easeOut(g) * pose.length * open
      const intensity =
        lerp(ray.peak, ray.accentPeak, mode) * pose.show * g * (1 + fan.flash * burst)
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
            <Beam
              beamIn={nodes.BeamIn}
              exit={exit}
              source={materials.BeamWhite}
              bloom={bloom}
              reducedMotion={reducedMotion}
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
