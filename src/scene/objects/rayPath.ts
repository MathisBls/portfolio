// Chemin du rayon actif pendant les projets (docs/storyboards/projects.md §2, 0.2–0.9 : « son rayon [...]
// s'allonge jusqu'à lui »). Retour de Mathis : le rayon va du prisme jusqu'au bord de l'objet, sans le
// traverser (reachToEdge), et ne croise jamais une card : tant que la card précédente, qui sort par le
// haut du même côté que l'objet visé, est sur son chemin à l'écran, il reste éteint (crossesPreviousCard).
// Les cards sont mesurées au refresh de ScrollTrigger (measureCards), jamais dans useFrame. Aucune
// allocation par frame.
import type { RootState } from '@react-three/fiber'
import { Vector3 } from 'three'
import { projects } from '../../content/projects'
import { slotCenterY } from '../../lib/projects'
import { getAnchor, getAnchorMetrics, getProgress } from '../store'
import type { AnchoredTarget } from './useAnchoredObject'

/**
 * Corps de chaque card (texte, liens), relevé au refresh : bords gauche et droit (px, viewport), haut et
 * bas en décalage depuis le haut de son emplacement (invariants au scroll, la card et l'emplacement
 * défilent ensemble).
 */
type CardBox = { left: number; right: number; top: number; bottom: number }
const cards = new Map<string, CardBox>()

/** Relève le corps des cards : le frère de l'emplacement [data-slot] dans son <article>. */
export function measureCards() {
  for (const { slug } of projects) {
    const slot = getAnchor(`project:${slug}`)
    const body = slot?.parentElement
      ? Array.from(slot.parentElement.children).find((el) => el !== slot)
      : undefined
    if (!slot || !body) {
      cards.delete(slug)
      continue
    }
    const s = slot.getBoundingClientRect()
    const b = body.getBoundingClientRect()
    cards.set(slug, { left: b.left, right: b.right, top: b.top - s.top, bottom: b.bottom - s.top })
  }
}

const slab = { enter: 0, leave: 1 }

/** Restreint [enter, leave] à la tranche [min, max] d'un axe ; false si le segment la manque. */
function clip(d: number, s0: number, min: number, max: number) {
  if (Math.abs(d) < 1e-9) return s0 >= min && s0 <= max
  const a = (min - s0) / d
  const b = (max - s0) / d
  slab.enter = Math.max(slab.enter, Math.min(a, b))
  slab.leave = Math.min(slab.leave, Math.max(a, b))
  return slab.enter <= slab.leave
}

/**
 * Longueur monde du départ du rayon jusqu'à son entrée dans la boîte de l'objet (plan XY, méthode des
 * tranches sur le segment départ → centre) : le rayon touche le bord dessiné, sans le traverser. Boîte
 * vide (objet pas encore dessiné) ou départ dans la boîte : 0. Segment qui manque la boîte : le centre.
 */
export function reachToEdge(start: Vector3, target: Readonly<AnchoredTarget>) {
  const { bounds, position } = target
  if (bounds.isEmpty()) return 0
  const dx = position.x - start.x
  const dy = position.y - start.y
  slab.enter = 0
  slab.leave = 1
  const hit =
    clip(dx, start.x, bounds.min.x, bounds.max.x) && clip(dy, start.y, bounds.min.y, bounds.max.y)
  return Math.hypot(dx, dy) * (hit ? slab.enter : 1)
}

const from = new Vector3()
const to = new Vector3()

/** Point monde → px CSS du canvas (origine en haut à gauche). */
function toScreen(state: RootState, out: Vector3) {
  out.project(state.camera)
  out.x = ((out.x + 1) / 2) * state.size.width
  out.y = ((1 - out.y) / 2) * state.size.height
  return out
}

/**
 * true si le rayon du projet j (de `start` au bord de son objet) passe, à l'écran, sur le corps de la
 * card du projet précédent (mise en page alternée : même côté que l'objet visé, juste au-dessus). Sa
 * position suit celle de son emplacement (slotCenterY), sans lire le DOM.
 */
export function crossesPreviousCard(
  j: number,
  start: Vector3,
  target: Readonly<AnchoredTarget>,
  state: RootState,
) {
  const previous = projects[j - 1]
  if (!previous) return false
  const id = `project:${previous.slug}` as const
  const m = getAnchorMetrics(id)
  const card = cards.get(previous.slug)
  const p = getProgress(id)
  if (!m || !card || p <= 0 || p >= 1) return false

  const dx = target.position.x - start.x
  const dy = target.position.y - start.y
  const k = reachToEdge(start, target) / Math.max(Math.hypot(dx, dy), 1e-6)
  toScreen(state, from.copy(start))
  toScreen(state, to.copy(start).lerp(target.position, k))

  const top = slotCenterY(p, m) - m.height / 2
  slab.enter = 0
  slab.leave = 1
  return (
    clip(to.x - from.x, from.x, card.left, card.right) &&
    clip(to.y - from.y, from.y, top + card.top, top + card.bottom)
  )
}
