// CameraRig : une seule PerspectiveCamera, pilotée par les keyframes de cameraPath.ts selon le
// progress 'page' écrit par ScrollTrigger. Pas d'OrbitControls.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Vec3, sampleKeyframes } from '../lib/math'
import { CAMERA_PATH } from './cameraPath'
import { getProgress } from './store'

export function CameraRig() {
  const pose = useRef({ position: [0, 0, 8] as Vec3, lookAt: [0, 0, 0] as Vec3 })

  useFrame(({ camera }) => {
    const { position, lookAt } = pose.current
    sampleKeyframes(CAMERA_PATH, getProgress('page'), pose.current)
    camera.position.set(...position)
    camera.lookAt(...lookAt)
  })

  return null
}
