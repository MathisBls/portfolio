// Monte la scène 3D après l'hydratation et seulement si WebGL 2 existe. Ce fichier est dans le bundle
// initial : il ne doit pas importer three.
// - Desktop et mobile : au premier moment libre du navigateur après le chargement, sans attendre
//   d'interaction (demande de Mathis du 2026-10-09 : le prisme 3D et son animation d'assemblage dès
//   l'arrivée, au lieu du poster 2D jusqu'au premier geste). Le poster SVG du hero tient lieu de visuel
//   le temps du chargement. Contrepartie : le TBT mobile remonte (review Phase 1), assumé.
// - Easter egg (code Konami, src/easter/) : montée tout de suite au déverrouillage, puis gardée.
// - Une erreur de la scène (GLB inattendu, WebGL perdu…) ne fait jamais tomber la page : la scène est
//   retirée et le site reste lisible sans 3D (CLAUDE.md, règle 3). Le 2026-10-10, un vieux GLB en cache a
//   fait planter tout l'accueil (écran noir) faute de ce garde-fou.
import { Component, type ReactNode, Suspense, lazy, useEffect, useState } from 'react'
import { whenIdle } from '../lib/idle'
import { useIsMobile } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import { hasWebGL2 } from '../lib/webgl'
import { useScene } from './store'

const loadScene = () => import('./Scene')
const Scene = lazy(loadScene)

/** Erreur dans la scène : on la retire (ses effets de démontage rendent les drapeaux html.has-*). */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: unknown) {
    console.error('Scène 3D désactivée après une erreur :', error)
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

export function SceneMount() {
  const [ready, setReady] = useState(false)
  const mobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  const easter = useScene((s) => s.easter === 'playing')
  // Mise à jour pendant le rendu (motif React « ajuster l'état ») : la scène reste montée après la sortie
  if (easter && !ready && hasWebGL2()) setReady(true)

  useEffect(() => {
    if (!hasWebGL2()) return
    // Téléchargement du chunk dès l'hydratation, en parallèle ; le montage attend le moment libre
    void loadScene()
    return whenIdle(() => {
      setReady(true)
    })
  }, [])

  if (!ready) return null
  return (
    <SceneBoundary>
      <Suspense fallback={null}>
        <Scene mobile={mobile} reducedMotion={reducedMotion} />
      </Suspense>
    </SceneBoundary>
  )
}
