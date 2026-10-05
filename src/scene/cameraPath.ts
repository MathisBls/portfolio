// Keyframes caméra sur le progress global 'page' (0 = haut de page, 1 = bas).
// Source : storyboards de l'architecte (docs/storyboards/). Phase 0 : caméra fixe.
import type { CameraKey } from '../lib/math'

export const CAMERA_PATH: readonly CameraKey[] = [{ at: 0, position: [0, 0, 8], lookAt: [0, 0, 0] }]
