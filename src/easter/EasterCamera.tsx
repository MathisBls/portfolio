// Easter egg v3 (docs/storyboards/easter-park.md, tous les beats) : pilote la caméra unique pendant la
// séquence (CameraRig est démonté). Beats 1 à 7 : pose calculée par camera.ts selon l'état E, appliquée
// ici avec le tremblement (bruit lisse, coupé en reduced-motion) et le FOV. Beat 8 et 9 : délégation au
// parc (parkCamera de D2, sur le temps du parc), FOV élargi en portrait comme ailleurs. Plan lointain
// repoussé le temps de la séquence (ciel de l'espace à 700 unités, parc jusqu'à PARK_FAR) ; la caméra
// est ajoutée à la scène pour porter le cockpit (space/Cockpit.tsx, enfant de la caméra). Réglages
// d'origine rendus au démontage.
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { type PerspectiveCamera, type Scene, Vector3 } from 'three'
import { type CameraPose, portraitFov, shakeAmount, solveCamera } from './camera'
import { applyParkPose, createPose, parkCamera } from './park/camera'
import { PARK_FAR } from './park/layout'
import { parkTime } from './park/state'
import { E, type EasterState, SHOT } from './state'

/** Plan lointain hors du parc : le ciel de l'espace (sphère de 700) et la planète tiennent dedans. */
const FAR = 1200

const pose: CameraPose = {
  position: new Vector3(),
  look: new Vector3(),
  up: new Vector3(0, 1, 0),
  fov: 35,
}
const park = createPose()

/** Bruit lisse (somme de sinus), sans aléatoire par frame. */
const wobble = (x: number) =>
  Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 4.2) * 0.1

function setFar(camera: PerspectiveCamera, far: number) {
  if (camera.far === far) return
  camera.far = far
  camera.updateProjectionMatrix()
}

/** Applique la pose de la séquence à la caméra (appelé dans useFrame). */
function applyCamera(camera: PerspectiveCamera, e: EasterState, time: number): void {
  if (e.shot === SHOT.park) {
    setFar(camera, PARK_FAR)
    parkCamera(parkTime(), park, e.reduced)
    park.fov = portraitFov(park.fov, camera.aspect)
    applyParkPose(camera, park)
    return
  }
  setFar(camera, FAR)
  solveCamera(e, camera.aspect, pose)
  camera.position.copy(pose.position)
  camera.up.copy(pose.up)
  camera.lookAt(pose.look)
  const shake = shakeAmount(e)
  if (shake > 0) {
    camera.rotateX(shake * wobble(time * 23))
    camera.rotateY(shake * wobble(time * 19 + 3))
    camera.rotateZ(shake * 0.6 * wobble(time * 13 + 7))
  }
  if (Math.abs(camera.fov - pose.fov) > 0.01) {
    camera.fov = pose.fov
    camera.updateProjectionMatrix()
  }
}

/**
 * Réglages de la séquence : plan lointain, caméra dans la scène (pour le cockpit qui lui est attaché).
 * Renvoie la restauration pour CameraRig.
 */
function takeCamera(camera: PerspectiveCamera, scene: Scene): () => void {
  const { far, fov } = camera
  const parent = camera.parent
  camera.far = FAR
  camera.updateProjectionMatrix()
  if (!parent) scene.add(camera)
  return () => {
    if (!parent) scene.remove(camera)
    camera.far = far
    camera.fov = fov
    camera.up.set(0, 1, 0)
    camera.updateProjectionMatrix()
  }
}

export function EasterCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const scene = useThree((s) => s.scene)
  useLayoutEffect(() => takeCamera(camera, scene), [camera, scene])
  useFrame((state) => {
    applyCamera(state.camera as PerspectiveCamera, E, state.clock.elapsedTime)
  })
  return null
}
