// CameraRig : une seule PerspectiveCamera, pilotée par les keyframes de cameraPath.ts selon la
// timeline (somme des progress de section, écrits par ScrollTrigger). Pas d'OrbitControls.
// Storyboard : docs/storyboards/hero.md (colonne Caméra).
// Passe « motion » (sans storyboard) : parallaxe au pointeur (pointer.ts), ajoutée aux keyframes et
// amortie. Pointeur au centre ou débranché (mobile, reduced-motion) : pose identique aux keyframes.
// Les objets ancrés aux cards déprojettent leur emplacement avec cette caméra : ils restent alignés.
// docs/storyboards/story-v2.md, Contact (arrivée) : en portrait (mobile), pas de décalage latéral des
// clés (x de la clé Contact) : le prisme sortirait de l'écran par la gauche ; il reste centré.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Vec3, clamp, sampleKeyframes } from '../lib/math'
import { CAMERA_PATH } from './cameraPath'
import { getTimeline } from './store'
import { usePointerDamp } from './usePointerDamp'

/** Décalage maximal (unités monde) de la position et du point visé, pointeur au bord de l'écran. */
const PARALLAX = { x: 0.35, y: 0.2 }
const LOOK = { x: 0.1, y: 0.06 }
/** Part du décalage latéral des clés gardée selon l'aspect : 0 en portrait, 1 dès 1.4 (paysage). */
const lateral = (aspect: number) => clamp((aspect - 0.9) / 0.5)

export function CameraRig() {
  const pose = useRef({ position: [0, 0, 8] as Vec3, lookAt: [0, 0, 0] as Vec3 })
  const parallax = usePointerDamp(2.5)

  useFrame(({ camera, size }, delta) => {
    const { position, lookAt } = pose.current
    sampleKeyframes(CAMERA_PATH, getTimeline(), pose.current)
    const d = parallax.follow(delta)
    const k = lateral(size.width / Math.max(1, size.height))
    camera.position.set(
      position[0] * k + d.x * PARALLAX.x,
      position[1] + d.y * PARALLAX.y,
      position[2],
    )
    camera.lookAt(lookAt[0] * k + d.x * LOOK.x, lookAt[1] + d.y * LOOK.y, lookAt[2])
  })

  return null
}
