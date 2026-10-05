// CameraRig : une seule PerspectiveCamera, pilotée par les keyframes de cameraPath.ts selon la
// timeline (somme des progress de section, écrits par ScrollTrigger). Pas d'OrbitControls.
// Storyboard : docs/storyboards/hero.md (colonne Caméra).
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Vec3, sampleKeyframes } from '../lib/math'
import { CAMERA_PATH } from './cameraPath'
import { getTimeline } from './store'

export function CameraRig() {
  const pose = useRef({ position: [0, 0, 8] as Vec3, lookAt: [0, 0, 0] as Vec3 })

  useFrame(({ camera }) => {
    const { position, lookAt } = pose.current
    sampleKeyframes(CAMERA_PATH, getTimeline(), pose.current)
    camera.position.set(...position)
    camera.lookAt(...lookAt)
  })

  return null
}
