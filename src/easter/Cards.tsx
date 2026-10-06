// Easter egg, beat 3 (7–14 s) : « Les 3 cartes sont distribuées depuis le deck, glissent sur la table et
// se retournent l'une après l'autre : COMMON (argent), RARE (bleu), puis LEGENDARY (or, cornes,
// couronne, éclat de lumière et bloom). » Et beat 4 (14–16 s) : la légendaire se lève et montre son dos,
// où se trouve le B (repère de la plongée : LOGO_FRAME). Préparation : cardRig.ts ; pose : cardPose.ts.
// Auras additives posées sur la table sous chaque carte (un halo face caméra voilait la face), ombres de
// contact sur le tapis (arena/cardShadows.ts), une carte face cachée sur la pile du sabot (le paquet
// continue après la distribution) et une lumière ponctuelle qui prend la couleur de la carte révélée.
// Reduced-motion : cartes déjà retournées, elles apparaissent en fondu (E.cards[i].alpha), sans vol.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group, type Mesh, type Object3D, type PointLight, Quaternion, Vector3 } from 'three'
import { clamp } from '../lib/math'
import { createCardShadow, updateCardShadow } from './arena/cardShadows'
import { fadeCards, poseCards } from './cardPose'
import { buildCards } from './cardRig'
import { DECK, DECK_SCALE, TABLE_Y, setLogoFrame } from './layout'
import { useEasterModel } from './models'
import { type GlowMaterial, createGlow, updateGlow } from './shaders'
import { E, type EasterState, SHOT } from './state'

const LOOKS = [
  { color: '#dfe6f2', size: 1, gain: 0.8, light: 40 },
  { color: '#4d8dff', size: 1, gain: 1, light: 55 },
  { color: '#ffb347', size: 1.25, gain: 1.2, light: 45 },
] as const

const LIGHT_COLORS = LOOKS.map((look) => new Color(look.color))
/** Aura sous une carte (2.6 × 3.7) : largeur, longueur. */
const AURA = [5.6, 7.2] as const

type CardsProps = { bloom: boolean; reducedMotion: boolean }

/** Carte face cachée sur la pile du sabot, sous les trois cartes distribuées (même pose qu'au départ). */
function deckCard(source: Object3D | undefined): Object3D | null {
  if (!source) return null
  const card = source.clone(true)
  const y = new Vector3(0, 1, 0)
  card.position.set(DECK[0], DECK[1] - 0.03, DECK[2])
  card.quaternion
    .setFromAxisAngle(y, Math.PI)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2))
    .multiply(new Quaternion().setFromAxisAngle(y, Math.PI))
  card.scale.setScalar(DECK_SCALE)
  return card
}

function glowOf(e: EasterState, i: number): number {
  const base = (e.cards[i]?.glow ?? 0) * (LOOKS[i]?.gain ?? 1)
  if (i !== 2) return base
  return (base + 0.5 * e.charge + 0.9 * e.burst) * (1 - e.approach)
}

function updateCardLight(light: PointLight, glows: readonly Group[], e: EasterState) {
  let best = -1
  let value = 0
  for (let i = 0; i < 3; i++) {
    const g = glowOf(e, i)
    if (g > value) {
      value = g
      best = i
    }
  }
  const look = LOOKS[best]
  const color = LIGHT_COLORS[best]
  const target = glows[best]
  light.intensity = look ? value * look.light : 0
  if (!color || !target) return
  light.color.copy(color)
  light.position.copy(target.position)
  light.position.y += 4
}

export function Cards({ bloom, reducedMotion }: CardsProps) {
  const gltf = useEasterModel('cards')
  const rig = useMemo(() => buildCards(gltf, bloom, reducedMotion), [gltf, bloom, reducedMotion])
  const glows = useMemo(() => LOOKS.map((look) => createGlow(look.color, 1.8)), [])
  const shadows = useMemo(() => LOOKS.map(() => createCardShadow()), [])
  const deck = useMemo(() => deckCard(rig.cards[0]), [rig])
  useEffect(() => {
    setLogoFrame(rig.logoLocal)
    return rig.dispose
  }, [rig])
  useEffect(
    () => () => {
      glows.forEach((glow) => {
        glow.dispose()
      })
    },
    [glows],
  )
  useEffect(
    () => () => {
      shadows.forEach((shadow) => {
        shadow.material.dispose()
      })
    },
    [shadows],
  )

  const root = useRef<Group>(null)
  const anchors = useRef<Group[]>([])
  const sprites = useRef<Mesh[]>([])
  const light = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    const r = root.current
    if (!r) return
    r.visible = E.shot === SHOT.arena
    if (light.current) light.current.intensity = 0
    if (!r.visible) return
    poseCards(rig, E, clock.elapsedTime)
    if (reducedMotion) fadeCards(rig, E)
    for (let i = 0; i < rig.cards.length; i++) {
      const card = rig.cards[i]
      const anchor = anchors.current[i]
      const sprite = sprites.current[i]
      const material: GlowMaterial | undefined = glows[i]
      if (!card || !anchor || !sprite || !material) continue
      anchor.position.set(card.position.x, TABLE_Y + 0.04, card.position.z)
      updateGlow(sprite, material, null, glowOf(E, i))
      const shadow = shadows[i]
      const state = E.cards[i]
      if (shadow && state) {
        const onDeck = 1 - clamp(state.deal / 0.12)
        const lifted = i === 2 ? 1 - E.lift : 1
        updateCardShadow(shadow, card, onDeck, clamp(state.alpha) * lifted)
      }
    }
    if (light.current) updateCardLight(light.current, anchors.current, E)
  })

  return (
    <>
      <pointLight ref={light} intensity={0} decay={2} />
      <group ref={root}>
        {rig.cards.map((card) => (
          <primitive key={card.uuid} object={card} />
        ))}
        {deck && <primitive object={deck} />}
        {shadows.map((shadow) => (
          <primitive key={shadow.mesh.uuid} object={shadow.mesh} />
        ))}
        {LOOKS.map((look, i) => (
          <group
            key={look.color}
            ref={(el) => {
              if (el) anchors.current[i] = el
            }}
          >
            <mesh
              ref={(el) => {
                if (el) sprites.current[i] = el
              }}
              rotation-x={-Math.PI / 2}
              scale={[AURA[0] * look.size, AURA[1] * look.size, 1]}
              material={glows[i]}
            >
              <planeGeometry />
            </mesh>
          </group>
        ))}
      </group>
    </>
  )
}
