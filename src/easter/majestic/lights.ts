// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 2 « crépuscule ») :
// éclairage du second niveau avec les lumières déjà montées de la séquence (EasterLights) : aucune
// lumière ajoutée au déclenchement, le nombre de lumières (clé des programmes) ne change pas et rien
// n'est recompilé. Appelé par lights.ts quand E.shot === SHOT.majestic, sans allocation.
// Couleurs et intensités : celles du ciel de D4 (env/shared.ts, majesticSky, mises à jour par frame
// d'après son modèle d'atmosphère) pour que montagne et chœur soient éclairés par le ciel qu'on voit :
// - hémisphère : ambiance du ciel et du sol, teintée de rose avec le spectre ;
// - `front` : le soleil couchant (direction, couleur et intensité de D4), qui passe sous l'horizon avec
//   l'aurore ;
// - `road` : faible lumière froide du ciel opposé, qui garde lisibles les faces à l'ombre (le B, le
//   chœur) même la nuit.
// Variations lentes seulement (rampes de la timeline).
import { Color, type DirectionalLight, type HemisphereLight } from 'three'
import { majesticSky } from './env'
import { M } from './state'

const SPECTRUM = new Color('#ff9fd0')
const AURORA = new Color('#59e0b0')
const FILL = new Color('#8ea6ff')

/** Distance des lumières directionnelles (seule la direction compte). */
const FAR = 1000

export function updateMajesticLights(
  hemi: HemisphereLight | null,
  sun: DirectionalLight | null,
  fill: DirectionalLight | null,
): void {
  const sky = majesticSky
  if (hemi) {
    hemi.color
      .copy(sky.skyAmbient)
      .lerp(SPECTRUM, 0.18 * M.spectrum)
      .lerp(AURORA, 0.15 * M.aurora)
    hemi.groundColor.copy(sky.groundAmbient)
    hemi.intensity = 1 + 0.4 * M.spectrum
  }
  if (sun) {
    sun.color.copy(sky.sunColor)
    sun.intensity = sky.sunIntensity
    sun.position.copy(sky.sunDir).multiplyScalar(FAR)
  }
  if (fill) {
    fill.color.copy(FILL)
    fill.intensity = (M.bloom ? 0.35 : 0.28) * (1 + 0.6 * sky.night)
    fill.position.set(-sky.sunDir.x * FAR, 420, -sky.sunDir.z * FAR)
  }
}
