// Couche de formes d'ambiance. Pas de storyboard dédié : demande de Mathis (« quand je scrolle, que
// d'autres formes géométriques comme au début continuent de descendre, que ça s'anime tout le temps »).
// Rôle : fond vivant après le hero. Petites formes de la famille du prisme (prisme triangulaire,
// tétraèdre, octaèdre, icosaèdre), arêtes fines + voile de verre sans transmission, sur les côtés
// derrière les objets des projets (z ∈ [−9, −2]). Rotation lente continue, parallaxe au scroll
// (getPageScroll, les proches plus vite) et bouclage vertical : une descente sans fin.
// Invisibles pendant le hero, fondu sur 'hero' 0.85 -> 1. Rien en reduced-motion.
// Placement pur et testé : ambientLayout.ts (src/lib/ambient.test.ts).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  EdgesGeometry,
  type Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  type LineSegments,
  type Material,
  type Mesh,
  MeshPhysicalMaterial,
  OctahedronGeometry,
  TetrahedronGeometry,
} from 'three'
import { gsap } from '../../lib/gsap'
import { range } from '../../lib/math'
import { useContinuousInvalidate } from '../hooks'
import { getPageScroll, getProgress } from '../store'
import {
  AMBIENT,
  SPECTRUM,
  type ShapeKind,
  columnY,
  layoutAmbientShapes,
  visibleHalfHeight,
} from './ambientLayout'

type AmbientShapesProps = { mobile: boolean; reducedMotion: boolean }

/** Opacités par palier de profondeur (lointain -> proche). Pas de transmission : le prisme l'a déjà. */
const FILL_OPACITY = [0.04, 0.06, 0.08] as const
const EDGE_OPACITY = [0.25, 0.35, 0.45] as const
/** Arêtes teintées : opacité, luminance visée avant fondu (bloom à seuil 1 : à peine au-dessus une fois
 *  mélangé au fond, halo léger, très en dessous des rayons) et intensité max (rouge, violet). */
const TINT = { opacity: 0.7, luminance: 1.5, maxIntensity: 7 } as const

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/** Opacité par frame via la ref de l'objet (les matériaux mémoïsés ne sont pas mutés directement). */
function setOpacity(object: Mesh | LineSegments | null | undefined, value: number) {
  const material = object?.material
  if (material && !Array.isArray(material)) material.opacity = value
}

/** --fg (tokens.css), lu une fois : la couleur des arêtes suit le DOM. */
const foreground = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#ededf0'

/**
 * true quand le progress 'hero' a passé `threshold`. Vérifié sur le ticker GSAP (qui écrit ce progress
 * via le scrub) : état React modifié seulement au franchissement, jamais dans useFrame.
 */
function useHeroPast(threshold: number): boolean {
  const [past, setPast] = useState(() => getProgress('hero') >= threshold)
  useEffect(() => {
    const check = () => {
      setPast(getProgress('hero') >= threshold)
    }
    gsap.ticker.add(check)
    return () => {
      gsap.ticker.remove(check)
    }
  }, [threshold])
  return past
}

/** Géométries unitaires (rayon englobant ~1), partagées par toutes les formes du même type. */
function createGeometries() {
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

function createMaterials(bloom: boolean) {
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

function Shapes({ mobile }: { mobile: boolean }) {
  const layout = useMemo(
    () => layoutAmbientShapes(mobile ? AMBIENT.count.mobile : AMBIENT.count.desktop),
    [mobile],
  )
  const geometries = useMemo(() => createGeometries(), [])
  // Bloom (Effects) seulement sur desktop : reduced-motion ne monte pas cette couche
  const materials = useMemo(() => createMaterials(!mobile), [mobile])

  useEffect(
    () => () => {
      geometries.all.forEach((g) => {
        g.dispose()
      })
    },
    [geometries],
  )
  useEffect(
    () => () => {
      materials.all.forEach((m) => {
        m.dispose()
      })
    },
    [materials],
  )

  const root = useRef<Group>(null)
  const groups = useRef<(Group | null)[]>([])
  const fills = useRef<(Mesh | null)[]>([])
  const lines = useRef<(LineSegments | null)[]>([])

  // Rendu continu dès que les formes apparaissent (le hook coupe quand l'onglet est masqué)
  useContinuousInvalidate(useHeroPast(AMBIENT.fadeIn[0]))

  useFrame(({ camera, size, clock }) => {
    const r = root.current
    if (!r) return
    const fade = range(getProgress('hero'), AMBIENT.fadeIn[0], AMBIENT.fadeIn[1])
    r.visible = fade > 0
    if (fade <= 0) return

    const t = clock.elapsedTime
    const aspect = size.width / Math.max(1, size.height)
    const scroll = getPageScroll()

    for (let i = 0; i < layout.length; i++) {
      const s = layout[i]
      const g = groups.current[i]
      if (!s || !g) continue
      // Fondu : opacité de base du palier (ou de la teinte) × fade. Matériaux partagés : même valeur.
      setOpacity(fills.current[i], FILL_OPACITY[s.tier] * fade)
      setOpacity(lines.current[i], (s.tint === null ? EDGE_OPACITY[s.tier] : TINT.opacity) * fade)
      // Largeur et hauteur visibles à la profondeur de la forme (fov 35, aspect courant)
      const halfH = visibleHalfHeight(camera.position.z - s.z)
      const column = AMBIENT.columnScreens * 2 * halfH
      // px scrollés -> unités monde à cette profondeur, freinés par la parallaxe : la forme remonte
      const rise = ((scroll * 2 * halfH) / Math.max(1, size.height)) * s.parallax
      const phase = s.driftFreq * t + s.driftPhase
      g.position.set(
        camera.position.x + s.side * s.xFrac * halfH * aspect + s.driftAmp * Math.sin(phase),
        camera.position.y + columnY(s.yFrac, rise, column) + s.driftAmp * Math.cos(0.8 * phase),
        s.z,
      )
      g.rotation.set(s.rotX + s.spinX * t, s.rotY + s.spinY * t, s.rotZ)
    }
  })

  return (
    <group ref={root} visible={false}>
      {layout.map((s, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
          scale={s.size}
        >
          <mesh
            ref={(m) => {
              fills.current[i] = m
            }}
            geometry={geometries.fill[s.kind]}
            material={materials.fills[s.tier]}
          />
          <lineSegments
            ref={(l) => {
              lines.current[i] = l
            }}
            geometry={geometries.edges[s.kind]}
            material={
              (s.tint === null ? undefined : materials.tints[s.tint]) ?? materials.edges[s.tier]
            }
          />
        </group>
      ))}
    </group>
  )
}

export function AmbientShapes({ mobile, reducedMotion }: AmbientShapesProps) {
  if (reducedMotion) return null
  return <Shapes mobile={mobile} />
}
