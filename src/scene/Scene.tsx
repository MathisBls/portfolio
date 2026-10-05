// Canvas global unique (CLAUDE.md, règle 1). Chargé en lazy par SceneMount : three/R3F ne pèsent pas
// sur le JS initial. frameloop="demand" : on ne rend que quand ScrollTrigger ou une animation invalide.
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import styles from './Scene.module.css'
import { useScene } from './store'

export type SceneProps = { mobile: boolean; reducedMotion: boolean }

function InvalidateBridge() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    useScene.getState().setInvalidate(() => {
      invalidate()
    })
    return () => {
      useScene.getState().setInvalidate(() => undefined)
    }
  }, [invalidate])
  return null
}

export default function Scene({ mobile }: SceneProps) {
  return (
    <Canvas
      className={styles.canvas}
      aria-hidden="true"
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 35, near: 0.1, far: 50, position: [0, 0, 8] }}
    >
      <color attach="background" args={['#0a0a0c']} />
      <InvalidateBridge />
      <CameraRig />
      <Suspense fallback={null}>
        <Lighting />
      </Suspense>
    </Canvas>
  )
}
