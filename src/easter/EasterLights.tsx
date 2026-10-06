// Easter egg : éclairage de la séquence (l'Environment local de Lighting.tsx reste monté pour les
// reflets de l'or). Toutes les lumières restent visibles du début à la fin, seule leur intensité change :
// le nombre de lumières ne varie jamais, les shaders précompilés restent valides (aucune recompilation
// en pleine séquence). Arène : clé en douche sur la table, bougies, cristaux rose et bleu (beat 2).
// Vol : lumière qui suit la caméra, du blanc au rouge (beat 5). Final : face du B éclairée (beat 6).
// Mobile : sans les lumières des bougies et des cristaux.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { DirectionalLight, HemisphereLight, PointLight, SpotLight } from 'three'
import { type LightRig, updateLights } from './lights'

type EasterLightsProps = { mobile: boolean }

export function EasterLights({ mobile }: EasterLightsProps) {
  const hemi = useRef<HemisphereLight>(null)
  const key = useRef<SpotLight>(null)
  const follow = useRef<PointLight>(null)
  const front = useRef<DirectionalLight>(null)
  const ambience = useRef<PointLight[]>([])
  const rig = useRef<LightRig>({ hemi: null, key: null, follow: null, front: null, ambience: [] })

  useFrame(({ camera, clock }) => {
    const r = rig.current
    r.hemi = hemi.current
    r.key = key.current
    r.follow = follow.current
    r.front = front.current
    r.ambience = ambience.current
    updateLights(r, camera, clock.elapsedTime)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#4b3a78', '#120a10', 0.4]} />
      <spotLight
        ref={key}
        position={[0, 18, 7]}
        angle={0.5}
        penumbra={0.8}
        decay={2}
        intensity={0}
        color="#ffe2c4"
      />
      <pointLight ref={follow} intensity={0} decay={2} />
      <directionalLight ref={front} position={[0, 30, -120]} intensity={0} color="#fff1ee" />
      {!mobile &&
        (['#ff9a3c', '#ff9a3c', '#ff2d6f', '#2f7bff'] as const).map((color, i) => (
          <pointLight
            key={`${color}-${String(i)}`}
            ref={(el) => {
              if (el) ambience.current[i] = el
            }}
            color={color}
            intensity={0}
            decay={2}
          />
        ))}
    </>
  )
}
