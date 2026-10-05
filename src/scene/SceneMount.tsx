// Monte la scène 3D après l'hydratation, quand le navigateur est libre, et seulement si WebGL 2 est
// disponible. Ce fichier est dans le bundle initial : il ne doit pas importer three.
import { Suspense, lazy, useEffect, useState } from 'react'
import { whenIdle } from '../lib/idle'
import { useIsMobile } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import { hasWebGL2 } from '../lib/webgl'

const Scene = lazy(() => import('./Scene'))

export function SceneMount() {
  const [ready, setReady] = useState(false)
  const mobile = useIsMobile()
  const reducedMotion = useReducedMotion()

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
