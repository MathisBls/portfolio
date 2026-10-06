// Easter egg, beat 5 (retour de Mathis du 2026-10-06) : « On dépasse les modèles des projets comme des
// repères, alternés gauche et droite, à bonne échelle. » Placement et passage : roadPath.ts (LANDMARKS, la
// distance de chaque repère, landmarkZ) ; modèles et animations légères : RoadsideWegir.tsx et
// roadsideMarks.tsx. Chaque repère est tourné vers la route, posé sur une aura discrète pour se
// détacher de la nuit. Reduced-motion : route immobile, repères rapprochés et figés.
import { useFrame } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { LANDMARKS, type LandmarkId, landmarkDistance, landmarkZ } from './roadPath'
import { FactoryMark, FitnessMark, PizzaMark, ZephyrMark } from './roadsideMarks'
import { RoadsideWegir } from './RoadsideWegir'
import { createGlow } from './shaders'
import { E, SHOT } from './state'

/** Repère dessiné seulement entre le brouillard (loin devant) et juste derrière la caméra. */
const DRAWN = { far: -420, behind: 40 }

type RoadsideProps = { reducedMotion: boolean }

function model(id: LandmarkId, still: boolean): ReactNode {
  if (id === 'wegir') return <RoadsideWegir still={still} />
  if (id === 'zephyr') return <ZephyrMark still={still} />
  if (id === 'fitness') return <FitnessMark still={still} />
  if (id === 'gamefactory') return <FactoryMark still={still} />
  return <PizzaMark still={still} />
}

export function Roadside({ reducedMotion }: RoadsideProps) {
  const distances = useMemo(
    () => LANDMARKS.map((_, i) => landmarkDistance(i, reducedMotion)),
    [reducedMotion],
  )
  const aura = useMemo(() => {
    const material = createGlow('#ffd2c8', 1.8)
    material.uniforms.uIntensity.value = 0.3
    return material
  }, [])
  useEffect(
    () => () => {
      aura.dispose()
    },
    [aura],
  )
  const marks = useRef<(Group | null)[]>([])

  useFrame(() => {
    const onRoad = E.shot === SHOT.road
    for (let i = 0; i < LANDMARKS.length; i++) {
      const group = marks.current[i]
      if (!group) continue
      const z = landmarkZ(distances[i] ?? 0, E.road)
      group.position.z = z
      group.visible = onRoad && z > DRAWN.far && z < DRAWN.behind
    }
  })

  return (
    <>
      {LANDMARKS.map((mark, i) => (
        <group
          key={mark.id}
          ref={(g) => {
            marks.current[i] = g
          }}
          position-x={mark.side * mark.x}
          visible={false}
        >
          <mesh rotation-x={-Math.PI / 2} position-y={0.03} scale={20} material={aura}>
            <planeGeometry />
          </mesh>
          <group position-y={mark.y} rotation-y={mark.yaw} scale={mark.scale}>
            <group rotation-x={mark.tilt}>{model(mark.id, reducedMotion)}</group>
          </group>
        </group>
      ))}
    </>
  )
}
