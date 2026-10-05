// Storyboard hero (docs/storyboards/hero.md) §7 : bloom à seuil 1, seuls les rayons, le faisceau et les
// bords de dissolution dépassent 1. Matériaux émissifs du GLB clonés (BeamWhite, Spec0..6).
import { type Color, type Mesh, MeshStandardMaterial } from 'three'
import { clamp } from '../../lib/math'

/** Luminance visée (> seuil de bloom 1) et bornes de l'intensité, pour garder la teinte des rayons. */
const TARGET_LUMINANCE = 1.1
const INTENSITY: readonly [number, number] = [1.8, 8]

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/**
 * Clone un matériau émissif, non tone-mappé. Avec bloom : intensité HDR (fixe, ou calculée pour
 * dépasser le seuil quelle que soit la couleur : le rouge et le violet ont une faible luminance).
 * Sans bloom : canal le plus fort à 1, teinte exacte. `peak` = intensité une fois allumé.
 */
export function cloneEmissive(source: MeshStandardMaterial, bloom: boolean, fixed?: number) {
  const material = source.clone()
  material.toneMapped = false
  const { r, g, b } = material.emissive
  const peak = bloom
    ? (fixed ?? clamp(TARGET_LUMINANCE / luminance(material.emissive), ...INTENSITY))
    : 1 / Math.max(r, g, b, 1e-3)
  material.emissiveIntensity = peak
  return { material, peak }
}

/** Intensité émissive par frame, via la ref du mesh (les objets mémoïsés ne sont pas mutés). */
export function setEmissiveIntensity(mesh: Mesh, value: number) {
  const { material } = mesh
  if (material instanceof MeshStandardMaterial) material.emissiveIntensity = value
}
