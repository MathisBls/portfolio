// Easter egg, beats 3 et 4 : pose des cartes par frame (sans React, sans allocation).
// - Distribution : du sommet du deck (échelle des cartes du deck) à l'emplacement sur la table, en arc,
//   avec un demi-tour ; face cachée (dos vers le haut).
// - Retournement : autour du grand axe de la carte, elle se soulève le temps du retournement.
// - Légendaire : charge (vibre) avant le retournement, ornements qui poussent (couronne, cornes, côtés),
//   puis elle se lève, se redresse et montre son dos (le B) face à la caméra, en STAND (layout.ts).
import { type Object3D, Quaternion, Vector3 } from 'three'
import { clamp, lerp, range } from '../lib/math'
import type { CardRig } from './cardRig'
import { CARD_LIFT, DECK, DECK_SCALE, SLOTS, STAND } from './layout'
import type { EasterState } from './state'

const Y = new Vector3(0, 1, 0)
const X = new Vector3(1, 0, 0)
/** Couchée face visible : +Z local (face avant) vers le haut, haut de la carte vers −Z (côté adverse). */
const FLAT = new Quaternion().setFromAxisAngle(X, -Math.PI / 2)
const yaw = new Quaternion()
const flip = new Quaternion()
const stand = new Quaternion()
const start = new Vector3()
const slot = new Vector3()
const upright = new Vector3()

/** Retour élastique doux (pousse des ornements). */
const backOut = (t: number) => {
  const c = 1.6
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

function poseOnTable(card: Object3D, i: number, e: EasterState, time: number) {
  const state = e.cards[i]
  if (!state) return
  const k = state.deal
  start.fromArray(DECK)
  start.y += i * 0.03
  slot.fromArray(SLOTS[i] ?? DECK)
  slot.y += CARD_LIFT
  card.position.lerpVectors(start, slot, k)
  card.position.y += Math.sin(Math.PI * k) * 2.2 + Math.sin(Math.PI * state.flip) * 1.3
  card.scale.setScalar(lerp(DECK_SCALE, 1, k))
  yaw.setFromAxisAngle(Y, (1 - k) * Math.PI)
  flip.setFromAxisAngle(Y, Math.PI * (1 - state.flip))
  card.quaternion.copy(yaw).multiply(FLAT).multiply(flip)
  if (i === 2 && e.charge > 0 && !e.reduced) {
    const a = e.charge * e.charge
    card.position.x += a * 0.025 * Math.sin(time * 47)
    card.position.z += a * 0.02 * Math.sin(time * 39 + 1)
    card.rotateZ(a * 0.015 * Math.sin(time * 43 + 2))
  }
}

/** Légendaire levée : de couchée (face visible) à debout en STAND, puis demi-tour (dos face caméra). */
function poseStanding(card: Object3D, e: EasterState) {
  slot.fromArray(SLOTS[2] ?? STAND)
  slot.y += CARD_LIFT
  upright.fromArray(STAND)
  card.position.lerpVectors(slot, upright, e.lift)
  card.position.z += Math.sin(Math.PI * e.lift) * 0.6
  stand.setFromAxisAngle(Y, Math.PI * e.turn)
  card.quaternion.copy(FLAT).slerp(stand, e.lift)
  card.scale.setScalar(1)
}

export function poseCards(rig: CardRig, e: EasterState, time: number): void {
  rig.cards.forEach((card, i) => {
    if (i === 2 && e.lift > 0) poseStanding(card, e)
    else poseOnTable(card, i, e, time)
  })
  rig.ornaments.forEach(({ object, rest, delay }) => {
    const t = range(e.crown, delay, delay + 0.45)
    const s = t <= 0 ? 0.0001 : e.reduced ? 1 : backOut(t)
    object.scale.copy(rest).multiplyScalar(Math.max(0.0001, s))
    object.visible = t > 0
  })
}

/** Fondu des cartes (reduced-motion) : opacité des matériaux clonés de chaque carte. */
export function fadeCards(rig: CardRig, e: EasterState): void {
  rig.materials.forEach((materials, i) => {
    const alpha = clamp(e.cards[i]?.alpha ?? 1)
    const card = rig.cards[i]
    if (card) card.visible = alpha > 0.001
    for (const material of materials) material.opacity = alpha
  })
}
