// Easter egg v3 (docs/storyboards/easter-park.md, tous les beats) : postprocessing de la séquence (desktop
// hors reduced-motion seulement, comme Effects.tsx). Bloom à seuil haut (seuls flammes, gemmes, cristaux,
// halos, traînées, néons de la porte et du parc dépassent), qui gonfle avec l'éclat de la légendaire
// (E.burst), le rouge de la route (E.red) et la lumière des portes (E.glare) ; tone mapping Neutral (garde
// la teinte des rouges) ; vignette qui se resserre pendant le zoom sur le prisme et avec la vitesse, plus
// marquée dans le cockpit ; grain léger.
// Pas d'aberration chromatique (réservée au hero). Le composer est préchauffé avec la scène (warmup.ts).
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import {
  type BloomEffect,
  type EffectComposer as Composer,
  ToneMappingMode,
  type VignetteEffect,
} from 'postprocessing'
import { useEffect, useRef } from 'react'
import { E, SHOT } from './state'
import { registerComposer } from './warmup'

export function EasterEffects() {
  const bloom = useRef<BloomEffect>(null)
  const vignette = useRef<VignetteEffect>(null)
  const composer = useRef<Composer>(null)
  // Préchauffé avec la scène pendant 'compiling' (warmup.ts) : ses cibles existent avant la séquence
  useEffect(() => {
    registerComposer(composer.current)
    return () => {
      registerComposer(null)
    }
  }, [])

  useFrame(() => {
    const road = E.shot === SHOT.road
    const space = E.shot === SHOT.space
    if (bloom.current) {
      bloom.current.intensity =
        1 +
        0.4 * E.flash +
        0.5 * E.burst +
        (road ? 1.1 * E.red : 0) +
        (space ? 0.5 * E.glare : 0)
    }
    if (vignette.current) {
      const zoom = E.shot === SHOT.sky ? 0.35 * E.focus : 0
      vignette.current.darkness =
        0.55 + zoom + (road ? 0.3 * E.speed : 0) + (space ? 0.15 * (1 - E.glare) : 0)
    }
  })

  return (
    <EffectComposer ref={composer} multisampling={4}>
      <Bloom
        ref={bloom}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.2}
        mipmapBlur
        intensity={1}
        levels={7}
        radius={0.75}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette ref={vignette} offset={0.25} darkness={0.55} />
      <Noise premultiply opacity={0.16} />
    </EffectComposer>
  )
}
