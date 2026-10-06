// Projet Zephyr (docs/storyboards/projects.md §2, « Animations continues » ; refonte du 2026-10-06
// demandée par Mathis : gestionnaire de mods open source, plus de 25 étoiles GitHub) : le logo Zephyr
// en relief flotte et oscille de trois quarts, un reflet passe sur sa face ; l'étoile GitHub orbite
// autour du logo en tournant sur elle-même, avec une pulsation émissive ; le logo Git flotte de l'autre
// côté en rotation lente. Survol : l'étoile vient se poser devant le logo avec un éclat (« star »).
// Modèle : scripts/blender/model_zephyr.py (docs/models.md, zephyr.glb).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, type Group, type IUniform, type Mesh, ShaderMaterial } from 'three'
import { easeInOut, lerp } from '../../lib/math'
import { setEmissiveIntensity } from '../materials/emissive'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type ZephyrProps = { slug: string }

const TAU = Math.PI * 2
/** Angle ramené dans [−π, π] : l'étoile a deux faces bombées identiques, le saut ne se voit pas. */
const wrapPi = (a: number) => a - TAU * Math.round(a / TAU)

/** Logo : lacet de trois quarts qui oscille, flottement, léger hochement ; presque de face au survol. */
const LOGO = { yaw: -0.3, swing: 0.22, swingRate: 0.45, hoverYaw: -0.08, bob: 0.05, bobRate: 0.9 }
const NOD = { amplitude: 0.05, rate: 0.7 }
/** Reflet : bande diagonale qui traverse la face (coordonnée 0..1.23) en `sweep` s, toutes les `period` s. */
const SHEEN = { period: 4.5, sweep: 1.2, from: -0.3, to: 1.6, strength: 0.34 }
/**
 * Orbite de l'étoile : ellipse autour de l'axe Y (devant puis derrière le logo), basse à droite et
 * haute à gauche pour passer au-dessus du logo Git. rx dégage les bouts des barres (0.8 + 0.28) ;
 * rz la fait passer derrière le bout gauche, qui recule jusqu'à z −0.5 quand le logo pivote.
 */
const ORBIT = { rx: 1.12, rz: 0.85, y: 0.2, lift: 0.25, rate: 0.5, spin: 1.4 }
/** Intensité émissive (multiplie l'émissif du GLB, 0.35 × or) : pulsation, survol, éclat à l'arrivée. */
const GLOW = { base: 1, pulse: 0.7, rate: 2.4, hover: 0.8, flash: 2.6, decay: 4 }
/** Survol : l'étoile se pose devant le logo, agrandie ; l'éclat part quand le survol dépasse `at`. */
const LANDING = { x: 0, y: 0.02, z: 0.62, scale: 1.25, pop: 0.3, at: 0.9, reset: 0.5 }
/** Logo Git : flottement déphasé et rotation continue (graphe en relief sur les deux faces). */
const GIT = { bob: 0.06, bobRate: 0.8, shift: 1.3, spin: 0.45 }

const sheenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`

// UV glTF de la face : celles de l'image, v vers le bas. Bande « / » qui avance vers la droite.
const sheenFragment = /* glsl */ `
uniform float uSweep;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float d = vUv.x * 0.8 + vUv.y * 0.45 - uSweep;
  gl_FragColor = vec4(vec3(exp(-d * d * 220.0) * uStrength), 1.0);
}
`

/** Reflet additif posé sur la géométrie de la face avant (même maillage, décalage de profondeur). */
class SheenMaterial extends ShaderMaterial {
  declare uniforms: { uSweep: IUniform<number>; uStrength: IUniform<number> }

  constructor() {
    super({
      uniforms: { uSweep: { value: SHEEN.from }, uStrength: { value: SHEEN.strength } },
      vertexShader: sheenVertex,
      fragmentShader: sheenFragment,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    })
  }
}

export function Zephyr({ slug }: ZephyrProps) {
  const { nodes, materials } = useModel('zephyr')
  // Logo 1.6 × 1.66 centré ; orbite de l'étoile x ∈ [−1.4, 1.4], y ∈ [−0.29, 0.74] ; logo Git
  // x ∈ [−1.36, −0.65], y ∈ [−0.83, 0] ; flottement du logo ±0.05
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 2.8,
    height: 1.8,
    center: [0, 0, 0],
  })

  // Étoile : matériau cloné (son intensité émissive varie, le GLB en cache n'est pas muté)
  const starMaterial = useMemo(() => materials.ZepStar.clone(), [materials])
  const sheenMaterial = useMemo(() => new SheenMaterial(), [])
  useEffect(
    () => () => {
      starMaterial.dispose()
      sheenMaterial.dispose()
    },
    [starMaterial, sheenMaterial],
  )

  const logo = useRef<Group>(null)
  const sheen = useRef<Mesh>(null)
  const star = useRef<Mesh>(null)
  const git = useRef<Group>(null)
  /** Angle d'orbite (ralenti au survol), cap vers l'avant figé au début du survol, éclat. */
  const orbit = useRef(0)
  const lastT = useRef(0)
  const target = useRef<number | null>(null)
  const flashAt = useRef(-Infinity)
  const landed = useRef(false)
  const logoY = nodes.Zep_Logo_Root.position.y
  const gitY = nodes.Zep_Git_Root.position.y
  const gitYaw = nodes.Zep_Git_Root.rotation.y

  useFrame(() => {
    const lg = logo.current
    const st = star.current
    const gt = git.current
    if (!lg || !st || !gt || !visibleRef.current) return
    const t = phase.current
    const h = easeInOut(hover.current)

    const swing = LOGO.yaw + LOGO.swing * Math.sin(t * LOGO.swingRate)
    lg.rotation.set(NOD.amplitude * Math.sin(t * NOD.rate), lerp(swing, LOGO.hoverYaw, h), 0)
    lg.position.y = logoY + LOGO.bob * Math.sin(t * LOGO.bobRate)
    const sh = sheen.current?.material
    if (sh instanceof SheenMaterial) {
      sh.uniforms.uSweep.value =
        SHEEN.from + ((t % SHEEN.period) / SHEEN.sweep) * (SHEEN.to - SHEEN.from)
    }

    // Étoile : rejoint l'avant de l'orbite (a = π/2) par le plus court chemin, sans traverser le logo,
    // puis se pose ; le cap est figé tant que le survol dure (pas de saut quand l'orbite avance)
    orbit.current += (t - lastT.current) * ORBIT.rate * (1 - h)
    lastT.current = t
    if (h < 1e-3) target.current = null
    else target.current ??= orbit.current + wrapPi(Math.PI / 2 - orbit.current)
    const a = lerp(orbit.current, target.current ?? orbit.current, h)
    const land = h * h
    st.position.set(
      lerp(ORBIT.rx * Math.cos(a), LANDING.x, land),
      lerp(ORBIT.y - ORBIT.lift * Math.cos(a), LANDING.y, land),
      lerp(ORBIT.rz * Math.sin(a), LANDING.z, land),
    )
    if (!landed.current && h > LANDING.at) flashAt.current = t
    landed.current = h > (landed.current ? LANDING.reset : LANDING.at)
    const flash = Math.exp(-(t - flashAt.current) * GLOW.decay)
    st.rotation.set(0, wrapPi(t * ORBIT.spin) * (1 - h), 0)
    st.scale.setScalar(lerp(1, LANDING.scale, h) + LANDING.pop * flash)
    const pulse = 0.5 + 0.5 * Math.sin(t * GLOW.rate)
    setEmissiveIntensity(st, GLOW.base + GLOW.pulse * pulse + GLOW.hover * h + GLOW.flash * flash)

    gt.position.y = gitY + GIT.bob * Math.sin(t * GIT.bobRate + GIT.shift)
    gt.rotation.y = gitYaw + t * GIT.spin
  })

  return (
    <group ref={anchor} visible={false}>
      <group position={offset}>
        <group ref={logo} position={nodes.Zep_Logo_Root.position} rotation-y={LOGO.yaw}>
          <Part node={nodes.Zep_Logo_Face} />
          <Part node={nodes.Zep_Logo_Side} />
          <Part ref={sheen} node={nodes.Zep_Logo_Face} material={sheenMaterial} />
        </group>
        <Part ref={star} node={nodes.Zep_Star} material={starMaterial} />
        <group
          ref={git}
          position={nodes.Zep_Git_Root.position}
          rotation={nodes.Zep_Git_Root.rotation}
        >
          <Part node={nodes.Zep_Git_Diamond} />
          <Part node={nodes.Zep_Git_Graph} />
        </group>
      </group>
    </group>
  )
}
