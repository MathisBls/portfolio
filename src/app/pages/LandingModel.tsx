// Visuel du haut des pages d'atterrissage (brief agent V du 2026-10-09, « Visionneuse 3D ») : le poster
// s'affiche d'abord (image LCP, décrite par son alt), puis le modèle 3D se charge au premier moment
// libre, dans un seul Canvas pour la page (chunk lazy src/scene/landing/LandingViewer.tsx). Fondu du
// poster vers la 3D quand sa première image est rendue, après précompilation des shaders.
// Variantes : reduced-motion ou sans WebGL 2 -> le poster reste seul (aucun JS 3D téléchargé) ; si la
// scène échoue (contexte WebGL refusé, GLB introuvable), le poster reste aussi (ErrorBoundary).
// Ce fichier est dans le JS initial : il ne doit pas importer three.
import { Component, type ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { LandingModelName } from '../../content/seo/types'
import { whenIdle } from '../../lib/idle'
import { useIsMobile } from '../../lib/media'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { hasWebGL2 } from '../../lib/webgl'
import styles from './LandingModel.module.css'
import { LANDING_ASSETS } from './landingAssets'

const loadViewer = () => import('../../scene/landing/LandingViewer')
const LandingViewer = lazy(loadViewer)

/** Une erreur de la scène (WebGL, réseau) ne casse pas la page : le poster reste. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

type Stage = 'poster' | 'loading' | 'live'

export function LandingModel({
  model,
  alt,
  className,
}: {
  model: LandingModelName
  alt: string
  className?: string
}) {
  const asset = LANDING_ASSETS[model]
  const ref = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>('poster')
  const mobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  const enabled = !reducedMotion

  useEffect(() => {
    if (!enabled || !hasWebGL2()) return
    // Chunk téléchargé dès l'hydratation, en parallèle ; le montage attend le moment libre
    void loadViewer()
    return whenIdle(() => {
      setStage((s) => (s === 'poster' ? 'loading' : s))
    })
  }, [enabled])

  const live = enabled && stage === 'live'
  return (
    <div
      ref={ref}
      className={[styles.visual, className].filter(Boolean).join(' ')}
      data-landing-model={model}
      data-state={live ? 'live' : stage === 'loading' && enabled ? 'loading' : 'poster'}
    >
      <img
        className={styles.poster}
        src={asset.poster.src}
        width={asset.poster.width}
        height={asset.poster.height}
        alt={alt}
        fetchPriority="high"
        decoding="async"
      />
      {enabled && stage !== 'poster' && (
        <Fallback>
          <Suspense fallback={null}>
            <LandingViewer
              model={model}
              mobile={mobile}
              container={ref}
              className={styles.canvas}
              onLive={() => {
                setStage('live')
              }}
            />
          </Suspense>
        </Fallback>
      )}
    </div>
  )
}
