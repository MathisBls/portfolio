// Easter egg : pilote la caméra unique pendant la séquence (CameraRig est démonté). Pose calculée par
// camera.ts selon l'état E ; ici on l'applique, avec le tremblement (bruit lisse, coupé en
// reduced-motion) et le FOV. Plan lointain repoussé le temps de la séquence (B final à 125 unités),
// réglages d'origine rendus au démontage.
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { type PerspectiveCamera, Vector3 } from 'three'
import { type CameraPose, shakeAmount, solveCamera } from './camera'
import { E, type EasterState } from './state'

const pose: CameraPose = {
  position: new Vector3(),
  look: new Vector3(),
  up: new Vector3(0, 1, 0),
  fov: 35,
}

/** Bruit lisse (somme de sinus), sans aléatoire par frame. */
const wobble = (x: number) =>
  Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 4.2) * 0.1

/** Applique la pose de la séquence à la caméra (appelé dans useFrame). */
function applyCamera(camera: PerspectiveCamera, e: EasterState, time: number): void {
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

/** Réglages de la séquence (le B final est à 125 unités) ; renvoie la restauration pour CameraRig. */
function takeCamera(camera: PerspectiveCamera): () => void {
  const { far, fov } = camera
  camera.far = 900
  camera.updateProjectionMatrix()
  return () => {
    camera.far = far
    camera.fov = fov
    camera.up.set(0, 1, 0)
    camera.updateProjectionMatrix()
  }
}

export function EasterCamera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useLayoutEffect(() => takeCamera(camera), [camera])
  useFrame((state) => {
    applyCamera(state.camera as PerspectiveCamera, E, state.clock.elapsedTime)
  })
  return null
}
