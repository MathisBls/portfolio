// Mesures des barres émissives de prism.glb (docs/models.md) : BeamIn et Spec0..6 sont des barres le
// long de leur Y local, centrées sur leur node, tournées sur Z seulement. Utilisé par Prism et Beam
// (storyboard hero, docs/storyboards/hero.md §2, p 0.1 à 1.0).
import type { Mesh } from 'three'

export type Segment = {
  /** Demi-longueur (Y local). */
  half: number
  /** Rotation Z du node : le Y local pointe dans la direction (dx, dy). */
  theta: number
  dx: number
  dy: number
  /** Extrémité de départ (côté −Y local) et d'arrivée (côté +Y local). */
  x0: number
  y0: number
  x1: number
  y1: number
}

export function segment(mesh: Mesh): Segment {
  const { geometry, position, rotation } = mesh
  geometry.computeBoundingBox()
  const half = geometry.boundingBox ? geometry.boundingBox.max.y : 1.3
  const theta = rotation.z
  const dx = -Math.sin(theta)
  const dy = Math.cos(theta)
  return {
    half,
    theta,
    dx,
    dy,
    x0: position.x - dx * half,
    y0: position.y - dy * half,
    x1: position.x + dx * half,
    y1: position.y + dy * half,
  }
}
