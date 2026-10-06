// Géométries et matériaux des formes d'ambiance (AmbientShapes.tsx), sortis du composant pour le garder
// court. Pas de storyboard dédié : demande de Mathis (formes géométriques de la famille du prisme).
// Arêtes fines + voile de verre sans transmission (le prisme est le seul objet en transmission).
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  LineBasicMaterial,
  type LineSegments,
  type Material,
  type Mesh,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  TetrahedronGeometry,
} from 'three'
import { SPECTRUM, type ShapeKind } from './ambientLayout'

/** Opacités par palier de profondeur (lointain -> proche). Pas de transmission : le prisme l'a déjà. */
export const FILL_OPACITY = [0.04, 0.06, 0.08] as const
export const EDGE_OPACITY = [0.25, 0.35, 0.45] as const
/** Arêtes teintées : opacité, luminance visée avant fondu (bloom à seuil 1 : à peine au-dessus une fois
 *  mélangé au fond, halo léger, très en dessous des rayons) et intensité max (rouge, violet). */
export const TINT = { opacity: 0.7, luminance: 1.5, maxIntensity: 7 } as const

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/** Opacité par frame via la ref de l'objet (les matériaux mémoïsés ne sont pas mutés directement). */
export function setOpacity(object: Mesh | LineSegments | null | undefined, value: number) {
  const material = object?.material
  if (material && !Array.isArray(material)) material.opacity = value
}

/** --fg (tokens.css), lu une fois : la couleur des arêtes suit le DOM. */
const foreground = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#ededf0'

/** Géométries unitaires (rayon englobant ~1), partagées par toutes les formes du même type. */
export function createGeometries() {
  const fill: Record<ShapeKind, BufferGeometry> = {
    prism: new CylinderGeometry(0.7, 0.7, 1.4, 3),
    tetra: new TetrahedronGeometry(1),
    octa: new OctahedronGeometry(1),
    ico: new IcosahedronGeometry(1, 0),
  }
  const edges: Record<ShapeKind, BufferGeometry> = {
    prism: new EdgesGeometry(fill.prism),
    tetra: new EdgesGeometry(fill.tetra),
    octa: new EdgesGeometry(fill.octa),
    ico: new EdgesGeometry(fill.ico),
  }
  return { fill, edges, all: [...Object.values(fill), ...Object.values(edges)] }
}

export function createMaterials(bloom: boolean) {
  const fg = new Color(foreground())
  const glass = (opacity: number) =>
    new MeshPhysicalMaterial({
      color: fg,
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity,
      depthWrite: false,
    })
  const line = (opacity: number) =>
    new LineBasicMaterial({ color: fg, transparent: true, opacity, depthWrite: false })

  const fills = [glass(FILL_OPACITY[0]), glass(FILL_OPACITY[1]), glass(FILL_OPACITY[2])] as const
  const edges = [line(EDGE_OPACITY[0]), line(EDGE_OPACITY[1]), line(EDGE_OPACITY[2])] as const

  // Arêtes teintées : non tone-mappées. Avec bloom, intensité HDR calée sur la luminance (le violet
  // est plus sombre que le bleu) ; sans bloom, teinte exacte (canal le plus fort à 1).
  const tints = SPECTRUM.map((hex) => {
    const color = new Color(hex)
    const intensity = bloom
      ? Math.min(TINT.maxIntensity, Math.max(1, TINT.luminance / luminance(color)))
      : 1 / Math.max(color.r, color.g, color.b, 1e-3)
    const material = line(TINT.opacity)
    material.color.copy(color).multiplyScalar(intensity)
    material.toneMapped = false
    return material
  })

  const all: Material[] = [...fills, ...edges, ...tints]
  return { fills, edges, tints, all }
}
