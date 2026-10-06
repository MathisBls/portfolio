// Easter egg v3 (docs/storyboards/easter-park.md) : éclairage de la séquence (l'Environment local de
// Lighting.tsx reste monté pour les reflets de l'or). Toutes les lumières restent visibles du début à la
// fin, seule leur intensité change : le nombre de lumières ne varie jamais, les shaders précompilés
// restent valides (aucune recompilation en pleine séquence). Zoom : la lumière ambiante se resserre sur
// le prisme (beat 1). Arène : clé en douche sur la table, bougies, cristaux rose et bleu (beat 2). Route :
// clé venue de derrière la caméra sur les projets, du blanc au rouge (beat 3). Espace (beats 4 à 7) :
// soleil derrière la porte, lumière rose de la porte allumée (lights.ts). Le parc a ses propres lumières.
// Mobile : sans les lumières des bougies et des cristaux.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { DirectionalLight, HemisphereLight, PointLight, SpotLight } from 'three'
import { type LightRig, updateLights } from './lights'

type EasterLightsProps = { mobile: boolean }

export function EasterLights({ mobile }: EasterLightsProps) {
  const hemi = useRef<HemisphereLight>(null)
  const key = useRef<SpotLight>(null)
  const road = useRef<DirectionalLight>(null)
  const front = useRef<DirectionalLight>(null)
  const ambience = useRef<PointLight[]>([])
  const rig = useRef<LightRig>({ hemi: null, key: null, road: null, front: null, ambience: [] })

  useFrame(({ clock }) => {
    const r = rig.current
    r.hemi = hemi.current
    r.key = key.current
    r.road = road.current
    r.front = front.current
    r.ambience = ambience.current
    updateLights(r, clock.elapsedTime)
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
      <directionalLight ref={road} position={[10, 16, 40]} intensity={0} color="#f2efff" />
      <directionalLight ref={front} position={[280, 190, -900]} intensity={0} color="#fff4e6" />
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
