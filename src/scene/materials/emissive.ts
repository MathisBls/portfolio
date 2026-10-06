// Storyboard hero (docs/storyboards/hero.md) §7 : bloom à seuil 1, seuls les rayons, le faisceau et les
// bords de dissolution dépassent 1. Matériaux émissifs du GLB clonés (BeamWhite, Spec0..6).
// Storyboard projets (docs/storyboards/projects.md §2, 0.2–0.9) : la couleur du rayon actif tend vers
// l'accent du projet (setEmissive), son intensité suit le pic de la couleur affichée.
import { type Color, type Mesh, MeshStandardMaterial } from 'three'
import { clamp } from '../../lib/math'

/** Luminance visée (> seuil de bloom 1) et bornes de l'intensité, pour garder la teinte des rayons. */
const TARGET_LUMINANCE = 1.1
const INTENSITY: readonly [number, number] = [1.8, 8]

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/**
 * Intensité émissive d'une couleur une fois allumée. Avec bloom : HDR (fixe, ou calculée pour dépasser
 * le seuil quelle que soit la couleur : le rouge et le violet ont une faible luminance). Sans bloom :
 * canal le plus fort à 1, teinte exacte.
 */
export function emissivePeak(color: Color, bloom: boolean, fixed?: number) {
  const { r, g, b } = color
  return bloom
    ? (fixed ?? clamp(TARGET_LUMINANCE / luminance(color), ...INTENSITY))
    : 1 / Math.max(r, g, b, 1e-3)
}

/** Clone un matériau émissif, non tone-mappé. `peak` = intensité une fois allumé (emissivePeak). */
export function cloneEmissive(source: MeshStandardMaterial, bloom: boolean, fixed?: number) {
  const material = source.clone()
  material.toneMapped = false
  const peak = emissivePeak(material.emissive, bloom, fixed)
  material.emissiveIntensity = peak
  return { material, peak }
}

/** Intensité émissive par frame, via la ref du mesh (les objets mémoïsés ne sont pas mutés). */
export function setEmissiveIntensity(mesh: Mesh, value: number) {
  const { material } = mesh
  if (material instanceof MeshStandardMaterial) material.emissiveIntensity = value
}

/** Teinte d'un rayon : couleur de départ (émissive et diffuse du GLB) et couleur d'arrivée. */
export type RayTint = { emissive: Color; diffuse: Color; to: Color }

/**
 * Émissif entre `tint.emissive` et `tint.to` (t de 0 à 1) avec son intensité, et diffus teinté de même,
 * multiplié par `diffuseScale` : le diffus éclairé par l'Environment resterait vif sinon. Via la ref.
 */
export function setEmissive(
  mesh: Mesh,
  tint: RayTint,
  t: number,
  intensity: number,
  diffuseScale = 1,
) {
  const { material } = mesh
  if (!(material instanceof MeshStandardMaterial)) return
  material.emissive.lerpColors(tint.emissive, tint.to, t)
  material.emissiveIntensity = intensity
  material.color.lerpColors(tint.diffuse, tint.to, t).multiplyScalar(diffuseScale)
}
