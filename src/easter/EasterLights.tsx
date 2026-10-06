// Easter egg v3 (docs/storyboards/easter-park.md) : éclairage de la séquence (l'Environment local de
// Lighting.tsx reste monté pour les reflets de l'or). Toutes les lumières restent visibles du début à la
// fin, seule leur intensité change : le nombre de lumières ne varie jamais, les shaders précompilés
// restent valides (aucune recompilation en pleine séquence). Zoom : la lumière ambiante se resserre sur
// le prisme (beat 1). Arène (beat 2) : plafonnier en douche sur la table, bougies des chandeliers, contre-
// jour rose et lumière violette des projecteurs de la salle (allumage progressif, arena/ramps.ts). Route :
// clé venue de derrière la caméra sur les projets, du blanc au rouge (beat 3). Espace (beats 4 à 7) :
// soleil derrière la porte, lumière rose de la porte allumée (lights.ts). Le parc a ses propres lumières.
// Mobile : sans les lumières des bougies et des projecteurs. Desktop : deux ponctuelles seulement pour
// toute l'ambiance de l'arène (chaque lumière coûte sur chaque pixel éclairé de toute la séquence) ; les
// bougies, les projecteurs et les néons sont des émissifs sous bloom.
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
        position={[0, 26, 3]}
        angle={0.52}
        penumbra={0.75}
        decay={2}
        intensity={0}
        color="#ffe2c4"
      />
      <directionalLight ref={road} position={[10, 16, 40]} intensity={0} color="#f2efff" />
      <directionalLight ref={front} position={[280, 190, -900]} intensity={0} color="#fff4e6" />
      {!mobile &&
        (['#ffa040', '#ff2d78'] as const).map((color, i) => (
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
