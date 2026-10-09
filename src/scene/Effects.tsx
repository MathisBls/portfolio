// Storyboard hero (docs/storyboards/hero.md §2) : p 0.4 « Spec0..3 allumés, bloom (desktop) » ;
// §5 Budget (desktop) et §7 Décisions : bloom à seuil haut (1, mipmapBlur), seuls les rayons, le faisceau
// et les bords de dissolution dépassent 1. Monté seulement si !mobile && !reducedMotion (Scene.tsx).
// Tone mapping : @react-three/postprocessing v3 coupe celui du renderer tant que le composer est monté.
// Les courbes filmiques (Neutral, ACES, AgX) écrasent --bg en noir et assombrissent le titre : on
// n'applique que l'épaule de Khronos PBR Neutral, identité sous 0.86. Le fond, le titre et le DOM
// gardent la même couleur, et les rayons HDR sont compressés en gardant leur teinte.
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction, Effect } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { registerComposer } from './warm'

const shoulder = /* glsl */ `
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  const float start = 0.86;
  const float desaturation = 0.15;
  vec3 color = inputColor.rgb;
  float peak = max(color.r, max(color.g, color.b));
  if (peak > start) {
    float d = 1.0 - start;
    float newPeak = 1.0 - d * d / (peak + d - start);
    color *= newPeak / peak;
    float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
    color = mix(color, vec3(newPeak), g);
  }
  outputColor = vec4(color, inputColor.a);
}
`

class HighlightShoulder extends Effect {
  constructor() {
    super('HighlightShoulder', shoulder, { blendFunction: BlendFunction.SET })
  }
}

export function Effects() {
  const toneMapping = useMemo(() => new HighlightShoulder(), [])

  useEffect(
    () => () => {
      toneMapping.dispose()
    },
    [toneMapping],
  )

  return (
    // Ref callback : enregistré pour le préchauffage de ses programmes (warm.ts, appelé par Warmup)
    <EffectComposer ref={registerComposer} multisampling={4}>
      {/* levels/radius : halo serré autour des rayons, pas de voile sur tout l'écran */}
      <Bloom
        luminanceThreshold={1}
        luminanceSmoothing={0.1}
        mipmapBlur
        intensity={1.2}
        levels={6}
        radius={0.7}
      />
      <primitive object={toneMapping} />
      <Vignette offset={0.3} darkness={0.55} />
      <Noise premultiply opacity={0.2} />
    </EffectComposer>
  )
}
