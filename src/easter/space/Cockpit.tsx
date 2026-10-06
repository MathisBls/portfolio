// Easter egg v3, beats 4 à 9 (docs/storyboards/easter-park.md, beat 4 : « Le cockpit de l'Explorer
// apparaît autour de nous », beat 5 : « Sur le HUD, un radar dont le point se rapproche ») : le cockpit,
// enfant de la caméra (portail dans la caméra, ajoutée à la scène par EasterCamera), visible de la sortie
// du warp jusqu'à la fin, parc compris. Ses liserés et ses écrans s'allument avec E.cockpit. HUD
// (cockpitRig.ts, hud.ts) : distance de la porte qui décroît, point du radar qui se rapproche, voix de
// Houston, identité révélée au mot. Reduced-motion : balayage et barres figés. Mobile : HUD simplifié.
// Second niveau (docs/storyboards/easter-majestic.md) : visible aussi dans le Sanctuaire ; au final, le
// HUD attend le mot de passe (cases remplies par majestic/password.ts), puis tape ACCESS GRANTED ; dans
// le Sanctuaire, altitude, vitesse (déduite du déplacement de la caméra) et signal.
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { clamp } from '../../lib/math'
import { useScene } from '../../scene/store'
import { input } from '../majestic/password'
import { M } from '../majestic/state'
import { E, SHOT } from '../state'
import { type CockpitRig, buildCockpit, updateCockpit } from './cockpitRig'
import { GATE_DIRECTION, GATE_DISTANCE, HUD_KM_PER_UNIT, gateDistance } from './layout'
import type { SpaceNodes } from './useSpaceParts'

/** Vitesse de la lumière (km/s) et dérive de l'Explorer une fois sorti du warp. */
const LIGHT = 299792
const DRIFT = 12.4
const BEARING = Math.atan2(GATE_DIRECTION.x, -GATE_DIRECTION.z)

/** Vitesse du Sanctuaire : position précédente de la caméra et vitesse lissée (m/s). */
const last = new Vector3()
const motion = { speed: 0, primed: false }

function trackSpeed(position: Vector3, delta: number) {
  if (!motion.primed || delta <= 0) {
    last.copy(position)
    motion.primed = true
    return
  }
  const speed = last.distanceTo(position) / delta
  last.copy(position)
  motion.speed += (speed - motion.speed) * Math.min(1, delta * 3)
}

/** Second niveau : invite du mot de passe au final, accès accordé, puis le Sanctuaire. */
function feedMajestic(rig: CockpitRig): boolean {
  const d = rig.data
  const scene = useScene.getState()
  if (scene.easterStage === 'majestic') {
    d.mode = E.shot === SHOT.majestic ? 'majestic' : 'granted'
    d.granted = M.access
    d.altitude = M.altitude
    d.velocity = motion.speed
    d.signal = clamp(0.42 + 0.18 * M.plain + 0.2 * M.choir + 0.2 * M.spectrum)
    return d.mode === 'majestic'
  }
  d.mode = scene.easterStage === 'finale' && scene.easterPlayed ? 'password' : 'flight'
  d.password = input.progress
  return false
}

/** Données du HUD selon la séquence (écrites dans le rig, hors React). */
function feedHud(rig: CockpitRig, time: number, still: boolean) {
  const d = rig.data
  const majestic = feedMajestic(rig)
  d.time = time
  d.still = still
  d.power = E.cockpit
  if (majestic) return
  const park = E.shot === SHOT.park
  const distance = park ? 0 : Math.max(0, gateDistance(E))
  d.distance = distance * HUD_KM_PER_UNIT
  d.range = clamp((distance / GATE_DISTANCE.far) * 0.92)
  d.bearing = BEARING
  d.speaking = useScene.getState().easterSubtitle >= 0
  d.identified = park ? 1 : E.gate
  d.velocity = DRIFT + (LIGHT - DRIFT) * E.speed + 4200 * Math.sin(Math.PI * E.leap)
}

type CockpitProps = {
  /** Nœuds résolus (park.glb ou remplacements) et ceux de park.glb seuls (UV glTF des écrans). */
  nodes: SpaceNodes
  model: SpaceNodes | null
  mobile: boolean
  bloom: boolean
  reducedMotion: boolean
}

export function Cockpit({ nodes, model, mobile, bloom, reducedMotion }: CockpitProps) {
  const camera = useThree((s) => s.camera)
  const rig = useMemo(
    () => buildCockpit(nodes, model, mobile, bloom),
    [nodes, model, mobile, bloom],
  )
  useEffect(() => rig.dispose, [rig])
  const group = useRef<Group>(null)

  useFrame(({ clock, camera: eye }, delta) => {
    const g = group.current
    if (!g) return
    g.visible = E.shot === SHOT.space || E.shot === SHOT.park || E.shot === SHOT.majestic
    if (!g.visible) return
    if (E.shot === SHOT.majestic) trackSpeed(eye.position, delta)
    else motion.primed = false
    feedHud(rig, clock.elapsedTime, reducedMotion || mobile)
    updateCockpit(rig, clock.elapsedTime, E.cockpit)
  })

  // Visible au montage : la précompilation des shaders (stage 'compiling') ne voit que le visible
  return createPortal(
    <group ref={group}>
      <primitive object={rig.root} />
    </group>,
    camera,
  )
}
