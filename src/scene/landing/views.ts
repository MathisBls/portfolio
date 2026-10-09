// Mise en scène de chaque modèle de la visionneuse (brief agent V du 2026-10-09) : plateau automatique,
// orientation de présentation (trois quarts), taille après recadrage (Fit.tsx) et caméra. Le cadrage de
// départ suit celui du poster (public/posters/landing/*.webp) pour que le fondu de l'un à l'autre ne
// saute pas.
import type { LandingModelName } from '../../content/seo/types'
import type { Vec3 } from '../../lib/math'
import type { Turntable } from './Rig'

export type View = {
  turntable: Turntable
  /** Orientation de repos (rad, autour de y). */
  yaw: number
  /** Plus grande dimension visible du modèle recadré (unités monde). */
  size: number
  camera: { position: Vec3; target: Vec3; fov: number }
}

const CAMERA = { position: [0, 1.1, 7.2] as Vec3, target: [0, 0, 0] as Vec3, fov: 30 }

export const VIEWS: Record<LandingModelName, View> = {
  // Façade : on ne la regarde pas de dos, balancement de ±0.45 rad
  vitrine: {
    turntable: { mode: 'sway', amplitude: 0.45, speed: 0.22 },
    yaw: -0.35,
    size: 3,
    camera: CAMERA,
  },
  // Établi : diorama large et plat, vue plus plongeante pour lire le dessus et l'écran du téléphone ; 3.5
  // garde le modèle à 5 % du bord au moins sur tout le balancement, le quart de tour du scroll, le regard et
  // le soulèvement au survol (mesuré sur le GLB ; mêmes valeurs dans VIEW de
  // scripts/blender/model_landing_etabli.py, qui rend le poster)
  etabli: {
    turntable: { mode: 'sway', amplitude: 0.5, speed: 0.2 },
    yaw: -0.5,
    size: 3.5,
    camera: { position: [0, 3.9, 6.2], target: [0, -0.32, 0], fov: 30 },
  },
  smartphone: {
    turntable: { mode: 'sway', amplitude: 0.4, speed: 0.25 },
    yaw: -0.45,
    size: 2.9,
    camera: CAMERA,
  },
  // Part de pizza : tour complet, vue plus plongeante pour lire le dessus. Diorama rond : Fit ramène sa
  // diagonale au sol (5.4 pour une planche de 3.8) à `size` ; 4.6 met le bord de la planche à ~6 % du
  // bord du carré au pire du tour, sans coupe même incliné et soulevé au survol (mesuré sur le GLB ;
  // même valeur dans LANDING_VIEW de scripts/blender/model_pizza_real.py, qui rend le poster)
  pizza: {
    turntable: { mode: 'spin', speed: 0.25 },
    yaw: 0,
    size: 4.6,
    camera: { position: [0, 2.8, 6.6], target: [0, -0.1, 0], fov: 30 },
  },
}
