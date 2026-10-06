// Mesures des barres émissives de prism.glb (docs/models.md) : BeamIn et Spec0..6 sont des barres le
// long de leur Y local, centrées sur leur node, tournées sur Z seulement. Utilisé par Prism et Beam
// (storyboard hero, docs/storyboards/hero.md §2, p 0.1 à 1.0).
// Face de sortie (exitPoint) : le spectre naît sur la face droite du prisme, la lumière interne s'y
// arrête (docs/models.md : triangle sommet en haut, face droite de (0.851, −0.5) à (0, 0.974)).
import { Box3, Matrix4, type Mesh } from 'three'

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

export type Point = { x: number; y: number }

/**
 * Point où la droite du segment coupe la face droite du prisme (repère du prisme). La face est lue
 * dans la géométrie du node Prism, tournée par son transform : triangle sommet en haut, de
 * (xMax, yMin) au sommet (centre en x, yMax). Si la droite est parallèle à la face : son départ.
 */
export function exitPoint(prism: Mesh, s: Segment): Point {
  const { geometry, rotation } = prism
  geometry.computeBoundingBox()
  const box = (geometry.boundingBox ?? new Box3()).clone()
  box.applyMatrix4(new Matrix4().makeRotationFromEuler(rotation))
  const ax = box.max.x
  const ay = box.min.y
  const bx = (box.min.x + box.max.x) / 2
  const by = box.max.y
  // x0 + t dx = ax + u (bx − ax), y0 + t dy = ay + u (by − ay) : on résout t (Cramer)
  const ex = bx - ax
  const ey = by - ay
  const det = s.dx * -ey - s.dy * -ex
  if (Math.abs(det) < 1e-9) return { x: s.x0, y: s.y0 }
  const t = ((ax - s.x0) * -ey - (ay - s.y0) * -ex) / det
  return { x: s.x0 + t * s.dx, y: s.y0 + t * s.dy }
}
