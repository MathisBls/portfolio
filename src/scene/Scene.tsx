// Canvas global unique (CLAUDE.md, règle 1). Chargé en lazy par SceneMount : three/R3F ne pèsent pas
// sur le JS initial. frameloop="demand" : on ne rend que quand ScrollTrigger ou une animation invalide.
// Storyboard hero (docs/storyboards/hero.md) §3 (Scene.tsx : monte Prism, HeroTitle3D, Effects ;
// antialias selon composer) et §5 Budget (desktop / mobile / reduced-motion).
// Storyboard projets (docs/storyboards/projects.md §3) : monte ProjectObjects (objets 3D des cards,
// desktop hors reduced-motion, quand la section approche). AmbientShapes : formes d'ambiance (demande
// de Mathis, sans storyboard), derrière les objets (z −9 à −2).
// Passe « motion » (sans storyboard) : PointerBridge branche le pointeur (pointer.ts) sur desktop à
// pointeur fin hors reduced-motion ; PrismLook oriente le prisme vers lui et le fait réagir au clic.
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { useMediaQuery } from '../lib/media'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { AmbientShapes } from './objects/AmbientShapes'
import { HeroTitle3D } from './objects/HeroTitle3D'
import { Prism } from './objects/Prism'
import { PrismLook } from './objects/PrismLook'
import { ProjectObjects } from './objects/ProjectObjects'
import { FINE_POINTER_QUERY, bindPointer } from './pointer'
import { setInvalidate, setSceneLive } from './store'

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

/** Pointeur de la scène : desktop à pointeur fin, jamais sur mobile ni en reduced-motion. */
function PointerBridge({ enabled }: { enabled: boolean }) {
  const fine = useMediaQuery(FINE_POINTER_QUERY)
  useEffect(() => (enabled && fine ? bindPointer() : undefined), [enabled, fine])
  return null
}

/**
 * Précompile les shaders en asynchrone (KHR_parallel_shader_compile) avant la première frame : la
 * liaison synchrone des programmes bloquait le thread principal ~400 ms (review Phase 1, TBT). Le
 * Canvas démarre en frameloop "never" ; Warmup est monté après le chargement du GLB (dans le
 * Suspense), puis passe en "demand".
 */
function Warmup() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let cancelled = false
    let raf = 0
    const start = () => {
      if (cancelled) return
      setFrameloop('demand')
      invalidate()
      // Deux rAF : la première image est rendue, les drapeaux en attente (poster, titre) s'appliquent
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          setSceneLive(true)
        })
      })
    }
    gl.compileAsync(scene, camera).then(start, start)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      setSceneLive(false)
    }
  }, [gl, scene, camera, setFrameloop, invalidate])
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
      // "never" jusqu'à la fin de la précompilation (Warmup), puis "demand"
      frameloop="never"
      // Pas de tone mapping au renderer : --bg et le titre 3D restent identiques au DOM, les émissifs
      // sans bloom sont déjà dans [0, 1]. Avec composer, Effects compresse seulement les HDR.
      flat
      gl={{ antialias: !composer, powerPreference: 'high-performance' }}
      camera={{ fov: 35, near: 0.1, far: 50, position: [0, 0, 8] }}
    >
      <color attach="background" args={[background()]} />
      <InvalidateBridge />
      <PointerBridge enabled={!mobile && !reducedMotion} />
      <CameraRig />
      <Suspense fallback={null}>
        <Lighting />
        <PrismLook>
          <Prism mobile={mobile} reducedMotion={reducedMotion} />
        </PrismLook>
        <AmbientShapes mobile={mobile} reducedMotion={reducedMotion} />
        {composer && <HeroTitle3D reducedMotion={reducedMotion} />}
        {composer && <Effects />}
        <Warmup />
      </Suspense>
      <ProjectObjects mobile={mobile} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
