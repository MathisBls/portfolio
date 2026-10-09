// Monte la scène 3D après l'hydratation et seulement si WebGL 2 existe. Ce fichier est dans le bundle
// initial : il ne doit pas importer three.
// - Desktop et mobile : au premier moment libre du navigateur après le chargement, sans attendre
//   d'interaction (demande de Mathis du 2026-10-09 : le prisme 3D et son animation d'assemblage dès
//   l'arrivée, au lieu du poster 2D jusqu'au premier geste). Le poster SVG du hero tient lieu de visuel
//   le temps du chargement. Contrepartie : le TBT mobile remonte (review Phase 1), assumé.
// - Easter egg (code Konami, src/easter/) : montée tout de suite au déverrouillage, puis gardée.
import { Suspense, lazy, useEffect, useState } from 'react'
import { whenIdle } from '../lib/idle'
import { useIsMobile } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import { hasWebGL2 } from '../lib/webgl'
import { useScene } from './store'

const Scene = lazy(() => import('./Scene'))

export function SceneMount() {
  const [ready, setReady] = useState(false)
  const mobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  const easter = useScene((s) => s.easter === 'playing')
  // Mise à jour pendant le rendu (motif React « ajuster l'état ») : la scène reste montée après la sortie
  if (easter && !ready && hasWebGL2()) setReady(true)

  useEffect(() => {
    if (!hasWebGL2()) return
    return whenIdle(() => {
      setReady(true)
    })
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <Scene mobile={mobile} reducedMotion={reducedMotion} />
    </Suspense>
  )
}
