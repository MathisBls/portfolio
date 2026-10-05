// Monte la scène 3D après l'hydratation et seulement si WebGL 2 existe. Ce fichier est dans le bundle
// initial : il ne doit pas importer three.
// - Desktop : au premier moment libre du navigateur.
// - Mobile : à la première interaction (scroll, toucher, clavier), puis au premier moment libre. Le
//   poster SVG du hero tient lieu de visuel en attendant ; le chargement de la scène ne pèse plus sur
//   le premier rendu (review Phase 1 : TBT mobile de 3 s).
import { Suspense, lazy, useEffect, useState } from 'react'
import { whenIdle } from '../lib/idle'
import { MOBILE_QUERY, matches, useIsMobile } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import { hasWebGL2 } from '../lib/webgl'

const Scene = lazy(() => import('./Scene'))

const INTERACTIONS = ['scroll', 'touchstart', 'pointerdown', 'keydown'] as const

function afterFirstInteraction(fn: () => void): () => void {
  const opts = { once: true, passive: true } as const
  const fire = () => {
    stop()
    fn()
  }
  const stop = () => {
    INTERACTIONS.forEach((type) => {
      window.removeEventListener(type, fire)
    })
  }
  INTERACTIONS.forEach((type) => {
    window.addEventListener(type, fire, opts)
  })
  return stop
}

export function SceneMount() {
  const [ready, setReady] = useState(false)
  const mobile = useIsMobile()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!hasWebGL2()) return
    let cancelIdle: (() => void) | null = null
    const mount = () => {
      cancelIdle = whenIdle(() => {
        setReady(true)
      })
    }
    let stopWaiting: (() => void) | null = null
    if (matches(MOBILE_QUERY)) stopWaiting = afterFirstInteraction(mount)
    else mount()
    return () => {
      stopWaiting?.()
      cancelIdle?.()
    }
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <Scene mobile={mobile} reducedMotion={reducedMotion} />
    </Suspense>
  )
}
