// Easter egg v3 (docs/storyboards/easter-park.md, tous les beats) : pilote la caméra unique pendant la
// séquence (CameraRig est démonté). Beats 1 à 7 : pose calculée par camera.ts selon l'état E, appliquée
// ici avec le tremblement (bruit lisse, coupé en reduced-motion) et le FOV. Beat 8 et 9 : délégation au
// parc (parkCamera de D2, sur le temps du parc), FOV élargi en portrait comme ailleurs. Plan lointain
// repoussé le temps de la séquence (ciel de l'espace à 700 unités, parc jusqu'à PARK_FAR) ; la caméra
// est ajoutée à la scène pour porter le cockpit (space/Cockpit.tsx, enfant de la caméra). Réglages
// d'origine rendus au démontage.
// Second niveau (docs/storyboards/easter-majestic.md, « Caméra ») : pose de majestic/camera.ts sur M.t,
// plans proche et lointain à l'échelle kilométrique (MAJESTIC_NEAR, MAJESTIC_FAR), tremblement du
// séisme en rampes (deux couches de bruit lisse : grondement rapide et faible balancement, plafonnées,
// coupées en reduced-motion), FOV élargi en portrait ; l'altitude et l'amplitude du tremblement sont
// écrites dans M (HUD, D4).
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { type PerspectiveCamera, type Scene, Vector3 } from 'three'
import { type CameraPose, portraitFov, shakeAmount, solveCamera } from './camera'
import { altitudeOf, createMajesticPose, majesticCamera, majesticShake } from './majestic/camera'
import { MAJESTIC_FAR, MAJESTIC_NEAR } from './majestic/layout'
import { M } from './majestic/state'
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
const majestic = createMajesticPose()

/** Bruit lisse (somme de sinus), sans aléatoire par frame. */
const wobble = (x: number) =>
  Math.sin(x) * 0.6 + Math.sin(x * 2.3 + 1.7) * 0.3 + Math.sin(x * 5.1 + 4.2) * 0.1

/** Plan proche du reste de la séquence (celui du Canvas), relevé seulement sur le Sanctuaire. */
const NEAR = 0.1

function setFar(camera: PerspectiveCamera, far: number, near = NEAR) {
  if (camera.far === far && camera.near === near) return
  camera.far = far
  camera.near = near
  camera.updateProjectionMatrix()
}

function setFov(camera: PerspectiveCamera, fov: number) {
  if (Math.abs(camera.fov - fov) <= 0.01) return
  camera.fov = fov
  camera.updateProjectionMatrix()
}

/** Second niveau : trajectoire (ou plan fixe), roulis, tremblement en deux couches, FOV. */
function applyMajestic(camera: PerspectiveCamera, time: number): void {
  setFar(camera, MAJESTIC_FAR, MAJESTIC_NEAR)
  majesticCamera(M.t, majestic, M.reduced)
  camera.position.copy(majestic.position)
  camera.up.set(0, 1, 0)
  camera.lookAt(majestic.target)
  if (majestic.roll !== 0) camera.rotateZ(majestic.roll)
  const shake = majesticShake(M)
  M.shake = shake
  M.altitude = altitudeOf(majestic)
  if (shake > 0) {
    // Grondement (≈ 4 à 5 Hz) et faible balancement (≈ 1.5 Hz), jamais de saut
    camera.rotateX(shake * (0.75 * wobble(time * 29) + 0.25 * wobble(time * 9 + 1)))
    camera.rotateY(shake * (0.7 * wobble(time * 25 + 3) + 0.3 * wobble(time * 7 + 2)))
    camera.rotateZ(shake * 0.5 * wobble(time * 17 + 5))
  }
  setFov(camera, portraitFov(majestic.fov, camera.aspect))
}

/** Applique la pose de la séquence à la caméra (appelé dans useFrame). */
function applyCamera(camera: PerspectiveCamera, e: EasterState, time: number): void {
  if (e.shot === SHOT.majestic) {
    applyMajestic(camera, time)
    return
  }
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
  setFov(camera, pose.fov)
}

/**
 * Réglages de la séquence : plan lointain, caméra dans la scène (pour le cockpit qui lui est attaché).
 * Renvoie la restauration pour CameraRig.
 */
function takeCamera(camera: PerspectiveCamera, scene: Scene): () => void {
  const { far, fov, near } = camera
  const parent = camera.parent
  camera.far = FAR
  camera.updateProjectionMatrix()
  if (!parent) scene.add(camera)
  return () => {
    if (!parent) scene.remove(camera)
    camera.far = far
    camera.near = near
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
