// Visionneuse 3D des pages d'atterrissage (brief agent V du 2026-10-09, point 1). Chunk lazy chargé par
// src/app/pages/LandingModel.tsx au premier moment libre ; un seul Canvas pour la page (CLAUDE.md,
// règle 1), fond transparent par-dessus le poster.
// - Chargement : GLB (table src/app/pages/landingAssets.ts), recadrage (Fit), studio et ombre au sol,
//   puis précompilation des shaders et envoi des textures (warm.ts) en frameloop "never" ; une première
//   image est rendue à la main, puis LandingModel fait le fondu du poster vers le canvas.
// - Boucle : "always" seulement pendant l'animation continue visible (plateau automatique), "never" dès
//   que le visuel sort de l'écran (IntersectionObserver) ; onglet masqué : rAF suspendu par le navigateur.
// - Mobile : dpr 1.5 au plus, environnement 128 px, tache d'ombre fixe au lieu de l'ombre de contact,
//   variante légère des modèles (`mobile`). Reduced-motion et sans WebGL 2 : jamais chargé (poster).
import { Canvas, useThree } from '@react-three/fiber'
import {
  type CSSProperties,
  type ComponentType,
  type RefObject,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react'
import { LANDING_ASSETS } from '../../app/pages/landingAssets'
import type { LandingModelName } from '../../content/seo/types'
import { Fit } from './Fit'
import { Rig } from './Rig'
import { Ground, Studio } from './Studio'
import { Placeholder } from './models/Placeholder'
import { Vitrine } from './models/Vitrine'
import type { LandingObjectProps } from './types'
import { useViewerInput } from './useViewerInput'
import { VIEWS } from './views'
import { warmLanding } from './warm'

/** Modèles animés, par nom ; absent ou `placeholder` dans la table : modèle provisoire, sans animation. */
const MODELS: Partial<Record<LandingModelName, ComponentType<LandingObjectProps>>> = {
  vitrine: Vitrine,
}

export type LandingViewerProps = {
  model: LandingModelName
  mobile: boolean
  /** Visuel DOM (poster + canvas) : entrées pointeur et scroll, visibilité à l'écran. */
  container: RefObject<HTMLDivElement | null>
  className?: string
  /** Première image rendue, après précompilation : fondu du poster vers la 3D. */
  onLive: () => void
}

/** Le style en ligne du Canvas de R3F (position relative) l'emporterait sur une classe. */
const canvasStyle: CSSProperties = { position: 'absolute', inset: 0 }

function Warmup({
  container,
  onLive,
}: {
  container: RefObject<HTMLDivElement | null>
  onLive: RefObject<() => void>
}) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    let cancelled = false
    let raf = 0
    let io: IntersectionObserver | null = null
    const start = () => {
      if (cancelled) return
      // Première image rendue tout de suite, même hors écran (le fondu n'affiche jamais un canvas vide)
      advance(performance.now())
      const el = container.current
      if (el) {
        io = new IntersectionObserver(([entry]) => {
          if (entry) setFrameloop(entry.isIntersecting ? 'always' : 'never')
        })
        io.observe(el)
      } else {
        setFrameloop('always')
      }
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if (!cancelled) onLive.current()
        })
      })
    }
    warmLanding(gl, scene, camera).then(start, start)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      io?.disconnect()
      setFrameloop('never')
    }
  }, [gl, scene, camera, setFrameloop, advance, container, onLive])
  return null
}

export default function LandingViewer({
  model,
  mobile,
  container,
  className,
  onLive,
}: LandingViewerProps) {
  const view = VIEWS[model]
  const asset = LANDING_ASSETS[model]
  const Model = asset.model.placeholder ? undefined : MODELS[model]
  const input = useViewerInput(container)
  const progress = useRef(0)
  const hover = useRef(0)
  const [floor, setFloor] = useState<number | null>(null)
  const live = useRef(onLive)
  useEffect(() => {
    live.current = onLive
  }, [onLive])

  return (
    <Canvas
      className={className}
      style={canvasStyle}
      aria-hidden="true"
      // "never" jusqu'à la fin de la précompilation (Warmup)
      frameloop="never"
      dpr={[1, mobile ? 1.5 : 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: view.camera.fov, near: 0.1, far: 40, position: view.camera.position }}
      onCreated={({ camera }) => {
        camera.lookAt(...view.camera.target)
      }}
    >
      <Suspense fallback={null}>
        <Studio mobile={mobile} />
        <Rig inputRef={input} turntable={view.turntable} progressRef={progress} hoverRef={hover}>
          <group rotation-y={view.yaw}>
            <Fit size={view.size} onFloor={setFloor}>
              {Model ? (
                <Model progress={progress} hover={hover} mobile={mobile} />
              ) : (
                <Placeholder url={asset.model.url} />
              )}
            </Fit>
          </group>
        </Rig>
        {floor !== null && (
          <>
            <Ground mobile={mobile} y={floor} size={view.size} />
            <Warmup container={container} onLive={live} />
          </>
        )}
      </Suspense>
    </Canvas>
  )
}
