// Easter egg, beat 5 (« on parcourt le B en volant le long de ses courbes ») : trajectoire dans le repère
// local du maillage B_Logo (b_logo.glb, 1.16 × 1.75 × 0.05, centré). Le B se lit depuis −Z : la caméra
// vole du côté z < 0, au-dessus de la face avant (z = −0.025). Points relevés sur la géométrie décodée
// (milieu des croissants roses et du dos blanc) : moitié gauche du croissant du haut, sa pointe, le dos
// blanc vers le bas, la barre du milieu, tout le croissant du bas, sa pointe, puis le vide (climax).
// Même repère pour la carte (dos de la légendaire) et pour le B géant : le passage de l'un à l'autre est
// invisible à l'écran (seule la matrice monde change, voir camera.ts).
import { CatmullRomCurve3, Vector3 } from 'three'

/** Face avant du B (lisible), en unités locales. */
export const FACE_Z = -0.025

const POINTS: readonly (readonly [number, number])[] = [
  [-0.39, 0.43],
  [-0.365, 0.546],
  [-0.302, 0.645],
  [-0.22, 0.72],
  [-0.13, 0.776],
  [-0.035, 0.82],
  [0.07, 0.85],
  [0.187, 0.867],
  [0.32, 0.87],
  [0.45, 0.8],
  [0.505, 0.68],
  [0.486, 0.56],
  [0.458, 0.44],
  [0.425, 0.32],
  [0.383, 0.2],
  [0.33, 0.08],
  [0.2, 0.02],
  [0.07, 0],
  [-0.05, -0.03],
  [-0.235, -0.125],
  [-0.315, -0.208],
  [-0.374, -0.311],
  [-0.394, -0.43],
  [-0.37, -0.548],
  [-0.309, -0.649],
  [-0.226, -0.726],
  [-0.134, -0.783],
  [-0.036, -0.826],
  [0.07, -0.854],
  [0.186, -0.865],
  [0.32, -0.861],
  [0.52, -0.85],
]

const curve = new CatmullRomCurve3(
  POINTS.map(([x, y]) => new Vector3(x, y, FACE_Z)),
  false,
  'centripetal',
)
curve.arcLengthDivisions = 400

/** Point de départ du vol (cible de la plongée). */
export const FLIGHT_START = curve.getPointAt(0)

/** Point du tracé à l'abscisse u (0 -> 1, longueur d'arc), sur la face avant. Sans allocation. */
export function flightPoint(u: number, out: Vector3): Vector3 {
  return curve.getPointAt(Math.min(1, Math.max(0, u)), out)
}

const before = new Vector3()

/** Tangente unitaire du tracé à u (différence finie : getTangentAt de three alloue). */
export function flightTangent(u: number, out: Vector3): Vector3 {
  const a = Math.min(0.998, Math.max(0, u))
  flightPoint(a, before)
  return flightPoint(a + 0.002, out)
    .sub(before)
    .normalize()
}
