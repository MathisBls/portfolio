// Easter egg v3, beats 5 à 7 (docs/storyboards/easter-park.md : la forme lointaine, la révélation au mot
// « BoulardTV », l'ouverture) : la porte du parc dans l'espace. Posée sur GATE_DIRECTION à la distance
// gateDistance(E) (layout.ts), tournée vers la caméra. Éteinte pendant la voix de Houston (silhouette sur
// la Voie lactée, quelques reflets roses), allumée en rampe au mot (E.gate), portes ouvertes sur
// « MAINTENANT » (E.doors), lumière derrière elles (E.glare). gateRig.ts fait le travail sans React.
// Sans bloom (mobile, reduced-motion) : émissifs plafonnés (tuneEmissive, comme l'arène).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { E, SHOT } from '../state'
import { type GateInput, type GateRig, buildGate, updateGate } from './gateRig'
import { GATE_DIRECTION, GATE_FACING, gateDistance } from './layout'
import type { SpaceNodes } from './useSpaceParts'

const input: GateInput = { distance: 0, lights: 0, doors: 0, glare: 0, glints: 0, time: 0 }

/** Place la porte (distance selon la séquence, face à la caméra) et règle lumières, portes, reflets. */
function frameGate(rig: GateRig, time: number) {
  const root = rig.root
  root.visible = E.shot === SHOT.space && E.sky > 0.001
  if (!root.visible) return
  const distance = gateDistance(E)
  root.position.copy(GATE_DIRECTION).multiplyScalar(distance)
  root.quaternion.copy(GATE_FACING)
  input.distance = Math.abs(distance)
  input.lights = E.gate
  input.doors = E.doors
  input.glare = E.glare
  input.glints = E.cockpit * (1 - E.gate)
  input.time = time
  updateGate(rig, input)
}

type GateProps = { nodes: SpaceNodes; bloom: boolean }

export function Gate({ nodes, bloom }: GateProps) {
  const rig = useMemo(() => buildGate(nodes, bloom), [nodes, bloom])
  useEffect(() => rig.dispose, [rig])

  useFrame(({ clock }) => {
    frameGate(rig, clock.elapsedTime)
  })

  return <primitive object={rig.root} />
}
