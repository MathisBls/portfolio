// CameraRig : une seule PerspectiveCamera, pilotée par les keyframes de cameraPath.ts selon la
// timeline (somme des progress de section, écrits par ScrollTrigger). Pas d'OrbitControls.
// Storyboard : docs/storyboards/hero.md (colonne Caméra).
// Passe « motion » (sans storyboard) : parallaxe au pointeur (pointer.ts), ajoutée aux keyframes et
// amortie. Pointeur au centre ou débranché (mobile, reduced-motion) : pose identique aux keyframes.
// Les objets ancrés aux cards déprojettent leur emplacement avec cette caméra : ils restent alignés.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Vec3, sampleKeyframes } from '../lib/math'
import { CAMERA_PATH } from './cameraPath'
import { getTimeline } from './store'
import { usePointerDamp } from './usePointerDamp'

/** Décalage maximal (unités monde) de la position et du point visé, pointeur au bord de l'écran. */
const PARALLAX = { x: 0.35, y: 0.2 }
const LOOK = { x: 0.1, y: 0.06 }

export function CameraRig() {
  const pose = useRef({ position: [0, 0, 8] as Vec3, lookAt: [0, 0, 0] as Vec3 })
  const parallax = usePointerDamp(2.5)

  useFrame(({ camera }, delta) => {
    const { position, lookAt } = pose.current
    sampleKeyframes(CAMERA_PATH, getTimeline(), pose.current)
    const d = parallax.follow(delta)
    camera.position.set(position[0] + d.x * PARALLAX.x, position[1] + d.y * PARALLAX.y, position[2])
    camera.lookAt(lookAt[0] + d.x * LOOK.x, lookAt[1] + d.y * LOOK.y, lookAt[2])
  })

  return null
}
