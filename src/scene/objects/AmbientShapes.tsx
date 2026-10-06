// Couche de formes d'ambiance. Pas de storyboard dédié : demande de Mathis (« quand je scrolle, que
// d'autres formes géométriques comme au début continuent de descendre, que ça s'anime tout le temps »).
// Rôle : fond vivant après le hero. Petites formes de la famille du prisme (prisme triangulaire,
// tétraèdre, octaèdre, icosaèdre), arêtes fines + voile de verre sans transmission, sur les côtés
// derrière les objets des projets (z ∈ [−9, −2]). Rotation lente continue, parallaxe au scroll
// (getPageScroll, les proches plus vite) et bouclage vertical : une descente sans fin.
// Invisibles pendant le hero, fondu sur 'hero' 0.85 -> 1. Rien en reduced-motion.
// Placement pur et testé : ambientLayout.ts (src/lib/ambient.test.ts). Matériaux : ambientMaterials.ts.
// Passe « motion » : dérive en sens inverse du pointeur (pointer.ts), plus forte pour les formes proches.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, LineSegments, Mesh } from 'three'
import { gsap } from '../../lib/gsap'
import { range } from '../../lib/math'
import { useContinuousInvalidate } from '../hooks'
import { getPageScroll, getProgress } from '../store'
import { usePointerDamp } from '../usePointerDamp'
import {
  EDGE_OPACITY,
  FILL_OPACITY,
  TINT,
  createGeometries,
  createMaterials,
  setOpacity,
} from './ambientMaterials'
import { AMBIENT, columnY, layoutAmbientShapes, visibleHalfHeight } from './ambientLayout'

type AmbientShapesProps = { mobile: boolean; reducedMotion: boolean }

/** Dérive maximale (unités monde) au pointeur, pour la forme la plus proche (× parallaxe). */
const POINTER_DRIFT = { x: 0.6, y: 0.4 }

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
  const drift = usePointerDamp(2)

  // Rendu continu dès que les formes apparaissent (le hook coupe quand l'onglet est masqué)
  useContinuousInvalidate(useHeroPast(AMBIENT.fadeIn[0]))

  useFrame(({ camera, size, clock }, delta) => {
    const r = root.current
    if (!r) return
    const fade = range(getProgress('hero'), AMBIENT.fadeIn[0], AMBIENT.fadeIn[1])
    r.visible = fade > 0
    if (fade <= 0) return
    const d = drift.follow(delta)

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
      // Pointeur : sens inverse, freiné par la profondeur (les lointaines bougent moins)
      const px = -d.x * POINTER_DRIFT.x * s.parallax
      const py = -d.y * POINTER_DRIFT.y * s.parallax
      g.position.set(
        camera.position.x + s.side * s.xFrac * halfH * aspect + s.driftAmp * Math.sin(phase) + px,
        camera.position.y +
          columnY(s.yFrac, rise, column) +
          s.driftAmp * Math.cos(0.8 * phase) +
          py,
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
