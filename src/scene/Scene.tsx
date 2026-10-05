// Canvas global unique (CLAUDE.md, règle 1). Chargé en lazy par SceneMount : three/R3F ne pèsent pas
// sur le JS initial. frameloop="demand" : on ne rend que quand ScrollTrigger ou une animation invalide.
// Storyboard hero (docs/storyboards/hero.md) §3 (Scene.tsx : monte Prism, HeroTitle3D, Effects ;
// antialias selon composer) et §5 Budget (desktop / mobile / reduced-motion).
// Storyboard projets (docs/storyboards/projects.md §3) : monte ProjectObjects (objets 3D des cards,
// desktop hors reduced-motion, quand la section approche). AmbientShapes : formes d'ambiance (demande
// de Mathis, sans storyboard), derrière les objets (z −9 à −2).
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { AmbientShapes } from './objects/AmbientShapes'
import { HeroTitle3D } from './objects/HeroTitle3D'
import { Prism } from './objects/Prism'
import { ProjectObjects } from './objects/ProjectObjects'
import { setInvalidate } from './store'

export type SceneProps = { mobile: boolean; reducedMotion: boolean }

const canvasStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-scene)',
  pointerEvents: 'none',
} as const

/** Fond du canvas = --bg (tokens.css), lu une fois au montage pour ne pas dupliquer la couleur. */
const background = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0c'

function InvalidateBridge() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    setInvalidate(() => {
      invalidate()
    })
    return () => {
      setInvalidate(() => undefined)
    }
  }, [invalidate])
  return null
}

export default function Scene({ mobile, reducedMotion }: SceneProps) {
  // Postprocessing (bloom, vignette, grain) : desktop sans reduced-motion. Il fait son propre MSAA
  // (multisampling) : l'antialias du contexte ne sert que sans composer.
  const composer = !mobile && !reducedMotion
  return (
    <Canvas
      style={canvasStyle}
      aria-hidden="true"
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop="demand"
      // Pas de tone mapping au renderer : --bg et le titre 3D restent identiques au DOM, les émissifs
      // sans bloom sont déjà dans [0, 1]. Avec composer, Effects compresse seulement les HDR.
      flat
      gl={{ antialias: !composer, powerPreference: 'high-performance' }}
      camera={{ fov: 35, near: 0.1, far: 50, position: [0, 0, 8] }}
    >
      <color attach="background" args={[background()]} />
      <InvalidateBridge />
      <CameraRig />
      <Suspense fallback={null}>
        <Lighting />
        <Prism mobile={mobile} reducedMotion={reducedMotion} />
        <AmbientShapes mobile={mobile} reducedMotion={reducedMotion} />
        {composer && <HeroTitle3D reducedMotion={reducedMotion} />}
        {composer && <Effects />}
      </Suspense>
      <ProjectObjects mobile={mobile} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
