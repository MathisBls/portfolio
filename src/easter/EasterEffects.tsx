// Easter egg : postprocessing de la séquence (desktop hors reduced-motion seulement, comme Effects.tsx).
// Bloom à seuil haut (seuls flammes, gemmes, cristaux, halos et traînées dépassent), qui gonfle avec
// l'éclat de la légendaire (E.burst), le rouge du vol (E.red) et le halo du final ; tone mapping
// Neutral (garde la teinte des rouges) ; vignette qui se resserre avec la vitesse ; grain léger.
// Pas d'aberration chromatique (réservée au hero).
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { type BloomEffect, ToneMappingMode, type VignetteEffect } from 'postprocessing'
import { useRef } from 'react'
import { E, SHOT } from './state'

export function EasterEffects() {
  const bloom = useRef<BloomEffect>(null)
  const vignette = useRef<VignetteEffect>(null)

  useFrame(() => {
    const flight = E.shot === SHOT.flight
    const finale = E.shot === SHOT.finale
    if (bloom.current) {
      bloom.current.intensity =
        1 + 0.4 * E.flash + 0.5 * E.burst + (flight ? 1.1 * E.red : 0) + (finale ? 0.7 * E.halo : 0)
    }
    if (vignette.current) {
      vignette.current.darkness = 0.55 + (flight ? 0.3 * E.speed : 0)
    }
  })

  return (
    <EffectComposer multisampling={4}>
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
