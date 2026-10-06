// Projet Fitness Kass (docs/storyboards/projects.md §2, ajouté le 2026-10-06 avec les captures de
// Mathis) : téléphone qui fait défiler les 5 vrais écrans de l'app en fondu, deux écrans flottants
// (Programmes, Progression) qui s'ouvrent en éventail au survol, anneau de progression qui tourne
// (écran Nutrition), haltère qui roule. Modèle : scripts/blender/model_fitness.py.
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { lerp } from '../../lib/math'
import { useModel } from '../useModel'
import { Part } from './Part'
import { useAnchoredObject } from './useAnchoredObject'

type FitnessProps = { slug: string }

const SCREENS = ['home', 'programs', 'nutrition', 'progress', 'profile'].map(
  (name) => `/textures/fitness/${name}.webp`,
)
/** Durée d'affichage d'un écran puis du fondu vers le suivant (s, temps de la phase). */
const HOLD = 2.6
const FADE = 0.45
/** Écrans un peu en dessous du blanc pur : un écran plein éblouirait sur fond noir. */
const SCREEN_TINT = 0.88
/** Éventail des écrans flottants au survol : décalage x et rotation y par cran. */
const FAN = { x: 0.32, rotY: -0.18 }
const SWAY = { base: -0.28, amplitude: 0.16, frequency: 0.55 }

/** Matériau d'écran d'un mesh (passé par la ref : le lint interdit de muter l'objet du useMemo). */
const basic = (mesh: Mesh | null) =>
  mesh?.material instanceof MeshBasicMaterial ? mesh.material : null

function screenMaterial(map: Texture, opacity = 1) {
  return new MeshBasicMaterial({
    map,
    color: new Color(SCREEN_TINT, SCREEN_TINT, SCREEN_TINT),
    transparent: opacity < 1,
    opacity,
    side: DoubleSide,
    toneMapped: false,
  })
}

export function Fitness({ slug }: FitnessProps) {
  const { nodes } = useModel('fitness')
  const textures = useTexture(SCREENS)
  // Téléphone, écrans flottants, anneau et haltère : x ∈ [−1.15, 1.35], y ∈ [−0.94, 0.94]
  const {
    ref: anchor,
    offset,
    phase,
    hover,
    visibleRef,
  } = useAnchoredObject({
    slug,
    width: 2.5,
    height: 1.95,
    center: [0.1, 0, 0],
  })

  // UV du GLB (glTF) : pas de retournement vertical ; captures en sRGB
  const mats = useMemo(() => {
    textures.forEach((t) => {
      t.flipY = false
      t.colorSpace = SRGBColorSpace
      t.needsUpdate = true
    })
    const [home, programs, , progress] = textures
    if (!home || !programs || !progress) throw new Error('textures fitness manquantes')
    return {
      screen: screenMaterial(home),
      next: screenMaterial(home, 0),
      card1: screenMaterial(programs, 0.92),
      card2: screenMaterial(progress, 0.85),
    }
  }, [textures])

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        m.dispose()
      })
    },
    [mats],
  )

  const phone = useRef<Group>(null)
  const screen = useRef<Mesh>(null)
  const next = useRef<Mesh>(null)
  const cards = useRef<(Mesh | null)[]>([])
  const ring = useRef<Mesh>(null)
  const dumbbell = useRef<Group>(null)
  const current = useRef(0)

  useFrame(() => {
    const ph = phone.current
    if (!ph || !visibleRef.current) return
    const t = phase.current
    const h = hover.current

    ph.rotation.y = SWAY.base + SWAY.amplitude * Math.sin(t * SWAY.frequency)

    // Diaporama : l'écran suivant apparaît en fondu par-dessus, puis devient l'écran courant
    const cycle = HOLD + FADE
    const index = Math.floor(t / cycle) % SCREENS.length
    const local = t % cycle
    const shown = basic(screen.current)
    const fading = basic(next.current)
    if (shown && index !== current.current) {
      current.current = index
      shown.map = textures[index] ?? null
    }
    if (fading && next.current) {
      const upcoming = textures[(index + 1) % SCREENS.length] ?? null
      if (fading.map !== upcoming) fading.map = upcoming
      fading.opacity = local > HOLD ? (local - HOLD) / FADE : 0
      next.current.visible = fading.opacity > 0
    }

    cards.current.forEach((card, i) => {
      if (!card) return
      const step = i + 1
      card.position.x = (step === 1 ? 0.55 : 1.05) + step * FAN.x * h
      card.rotation.y = step * FAN.rotY * h
      card.position.y = (step === 1 ? 0.12 : 0.22) + 0.04 * Math.sin(t * 0.9 + step)
    })

    if (ring.current) ring.current.rotation.z = -t * lerp(0.6, 1.6, h)
    const db = dumbbell.current
    if (db) {
      db.rotation.x = t * 0.8
      db.position.y = -0.7 + 0.05 * Math.sin(t * 1.3) + 0.12 * h
    }
  })

  const { Fit_Dumbbell_Root: root } = nodes

  return (
    <group ref={anchor} visible={false}>
      <group position={offset}>
        <group ref={phone} rotation-y={SWAY.base}>
          <Part node={nodes.Fit_Body} />
          <Part ref={screen} node={nodes.Fit_Screen} material={mats.screen} />
          <Part
            ref={next}
            node={nodes.Fit_Screen}
            material={mats.next}
            position-z={nodes.Fit_Screen.position.z + 0.001}
            visible={false}
          />
          {[nodes.Fit_Card1, nodes.Fit_Card2].map((node, i) => (
            <Part
              key={node.name}
              node={node}
              material={i === 0 ? mats.card1 : mats.card2}
              ref={(m: Mesh | null) => {
                cards.current[i] = m
              }}
            />
          ))}
        </group>
        <Part node={nodes.Fit_RingTrack} />
        <Part ref={ring} node={nodes.Fit_RingArc} />
        <group ref={dumbbell} position={root.position}>
          <Part node={nodes.Fit_Bar} />
          <Part node={nodes.Fit_PlateL0} />
          <Part node={nodes.Fit_PlateL1} />
          <Part node={nodes.Fit_PlateR0} />
          <Part node={nodes.Fit_PlateR1} />
        </group>
      </group>
    </group>
  )
}
