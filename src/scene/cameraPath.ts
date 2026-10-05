// Keyframes caméra sur la timeline getTimeline() (somme des progress de section).
// Hero = [0, 1] (docs/storyboards/hero.md). Les phases suivantes ajoutent leurs clés au-delà de 1.
import type { CameraKey } from '../lib/math'

export const CAMERA_PATH: readonly CameraKey[] = [
  { at: 0, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 0.55, position: [0, 0, 8], lookAt: [0, 0, 0] },
  { at: 1, position: [0, -1.5, 12], lookAt: [0, -1.5, 0] },
]
