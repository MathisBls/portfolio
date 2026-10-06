// Storyboard hero (docs/storyboards/hero.md §2) : p 0.1 « Le faisceau entre depuis la gauche » (beamT),
// p 0.2 « à mi-course », p 0.3 « Faisceau sur la face gauche », puis à l'état final « lumière blanche
// par le haut ». Le faisceau est prolongé vers la gauche (REACH) pour entrer hors champ, et une lumière
// interne relie son extrémité à l'origine du spectre : vue à travers le verre (réfractée sur desktop),
// elle rattache les rayons au prisme quand le titre derrière lui a disparu. Elle s'arrête sur la face de
// sortie (exit, calculé par exitPoint), là où naît le spectre : jamais dans le vide.
// docs/storyboards/story-v2.md : « Contact (arrivée) : le prisme redescend dans le cadre, vide : ni
// faisceau ni rayons » ; « Contact (envoi réussi) : le faisceau blanc entre dans le prisme » (burstBeam),
// puis se pose à mi-intensité (burstBeamLevel) : il longe le texte des coordonnées sans l'éblouir.
// Le relais du hero au Contact se fait pendant Projets (SWITCH), prisme hors cadre.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { burstBeam, burstBeamLevel, burstInner } from '../../lib/burst'
import { HERO, beamT } from '../../lib/hero'
import { lerp, range } from '../../lib/math'
import { cloneEmissive, setEmissiveIntensity } from '../materials/emissive'
import { getProgress, getTimeline } from '../store'
import { ideaElapsed } from './prismLoop'
import { type Point, segment } from './segment'

type BeamProps = {
  beamIn: Mesh
  exit: Point
  source: MeshStandardMaterial
  bloom: boolean
  reducedMotion: boolean
}

/** Longueur du faisceau en multiples de BeamIn (2.6) : l'entrée sort du cadre à gauche. */
const REACH = 2
const WIDTH = 0.7
const INTENSITY = 2
/** Lumière interne : part de l'intensité du faisceau. */
const INNER = 0.5
/** Timeline : le faisceau passe de l'état du hero à celui du Contact (éteint avant l'envoi). */
const SWITCH: readonly [number, number] = [1.5, 2]

export function Beam({ beamIn, exit, source, bloom, reducedMotion }: BeamProps) {
  const beam = useRef<Mesh>(null)
  const inner = useRef<Mesh>(null)

  const data = useMemo(() => {
    const s = segment(beamIn)
    // Lumière interne : de l'extrémité droite du faisceau à l'origine du spectre, sur la face de sortie
    const ix = exit.x - s.x1
    const iy = exit.y - s.y1
    return {
      s,
      beam: cloneEmissive(source, bloom, INTENSITY),
      inner: cloneEmissive(source, bloom, INTENSITY),
      innerPose: {
        position: [(s.x1 + exit.x) / 2, (s.y1 + exit.y) / 2, 0] as [number, number, number],
        theta: Math.atan2(iy, ix) - Math.PI / 2,
        length: Math.hypot(ix, iy) / (2 * s.half),
      },
    }
  }, [beamIn, exit, source, bloom])

  useEffect(
    () => () => {
      data.beam.material.dispose()
      data.inner.material.dispose()
    },
    [data],
  )

  useFrame(() => {
    const be = beam.current
    const inn = inner.current
    if (!be || !inn) return
    const p = getProgress('hero')
    const { s } = data
    const contact = range(getTimeline(), ...SWITCH)
    const elapsed = ideaElapsed(reducedMotion)

    // Croît depuis son extrémité gauche, jusqu'à la face gauche du prisme
    const b = lerp(beamT(p), burstBeam(elapsed), contact)
    setEmissiveIntensity(be, data.beam.peak * lerp(1, burstBeamLevel(elapsed), contact))
    const left = 2 * s.half * REACH
    be.visible = b > 0
    be.scale.y = Math.max(b, 1e-4) * REACH
    be.position.set(
      s.x1 - s.dx * left + s.dx * s.half * REACH * b,
      s.y1 - s.dy * left + s.dy * s.half * REACH * b,
      0,
    )

    // S'allume quand le faisceau touche la face gauche, avant le premier rayon
    const l = lerp(range(p, HERO.beam[1] - 0.03, HERO.rays[0] + 0.04), burstInner(elapsed), contact)
    inn.visible = l > 0
    setEmissiveIntensity(inn, data.inner.peak * INNER * l)
  })

  return (
    <>
      <mesh
        ref={beam}
        geometry={beamIn.geometry}
        material={data.beam.material}
        rotation-z={data.s.theta}
        scale={[WIDTH, 1e-4, WIDTH]}
        visible={false}
      />
      <mesh
        ref={inner}
        geometry={beamIn.geometry}
        material={data.inner.material}
        position={data.innerPose.position}
        rotation-z={data.innerPose.theta}
        scale={[WIDTH, data.innerPose.length, WIDTH]}
        visible={false}
      />
    </>
  )
}
