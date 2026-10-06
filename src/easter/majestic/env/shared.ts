// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7) : uniforms
// partagés par tous les matériaux de l'environnement (mêmes objets { value } posés dans chaque matériau :
// une écriture par frame les met tous à jour), et leur calcul à partir de M (state.ts, D3) et de la
// caméra. Aucune allocation par frame.
// Lecture de M : entry (densité des nuages traversés), plain (sortie des nuages), quake (ondes, dôme,
// frémissement), cracks (front et largeur des fissures, lueur), dust (brume brune), rise (bourrelet,
// ombre et reflet de la montagne, soleil qui baisse), aurora (nuit, étoiles, aurore), spectrum (teinte
// spectrale de l'aurore), outro (nuages de la sortie).
// Exporte aussi `majesticSky` pour D3 : soleil, ambiance et couleur du brouillard, cohérents avec le ciel.
import {
  Color,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { CLOUDS, MAJESTIC_FOG, MOUNTAIN, SUN_DIR } from '../layout'
import { type MajesticState } from '../state'
import { type Rgb, SKY_PARAMS, scatter, sunAt, sunTransmittance } from './atmosphere'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const sat = (x: number) => Math.min(1, Math.max(0, x))
const DEG = Math.PI / 180

/** Largeur de la texture d'horizon (azimuts). */
const HORIZON = 64

/** Ciel : lunes (direction, rayon angulaire), arc d'anneaux (latitude 30°, axe tourné de −70°). */
function direction(azimuthDeg: number, elevationDeg: number): Vector3 {
  // Azimut 0 = −Z (vers la montagne depuis l'arrivée), positif vers +X (droite)
  const a = azimuthDeg * DEG
  const e = elevationDeg * DEG
  return new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e))
}

function ringAxis(latitudeDeg: number, yawDeg: number): Vector3 {
  const phi = latitudeDeg * DEG
  const psi = yawDeg * DEG
  return new Vector3(Math.cos(phi) * Math.sin(psi), Math.sin(phi), Math.cos(phi) * Math.cos(psi))
}

export const SKY_BODIES = {
  moonA: direction(27, 13),
  moonB: direction(-16, 27),
  /** Rayons angulaires (rad) : une grande lune pâle, une petite rosée. */
  moonSize: new Vector2(2.3 * DEG, 0.95 * DEG),
  ringAxis: ringAxis(30, -70),
  ringRadii: new Vector2(1.6, 2.3),
} as const

/** Valeurs exportées pour D3 (lumières de la montagne et du chœur, FogExp2), mises à jour par frame. */
export const majesticSky = {
  /** Direction vers le soleil (baisse pendant la montée, passe sous l'horizon avec l'aurore). */
  sunDir: new Vector3(...SUN_DIR),
  /** Lumière directe du soleil au sol (linéaire, intensité comprise) : à poser sur une DirectionalLight. */
  sunColor: new Color(),
  sunIntensity: 0,
  /** Ambiance : ciel (dessus) et sol (dessous), pour une HemisphereLight. */
  skyAmbient: new Color(),
  groundAmbient: new Color(),
  /** Couleur et densité du FogExp2 du plan (horizon vers la montagne, poussière comprise). */
  fogColor: new Color(MAJESTIC_FOG.color),
  fogDensity: MAJESTIC_FOG.density as number,
  /** 0 crépuscule -> 1 nuit (aurore). */
  night: 0,
}

export type Shared = {
  uTime: { value: number }
  uSunDir: { value: Vector3 }
  uCrackFront: { value: number }
  uCrackWidth: { value: number }
  uBloom: { value: number }
  uMountainCone: { value: Vector4 }
  uBetaR: { value: Vector3 }
  uBetaA: { value: Vector3 }
  uBetaM: { value: number }
  uMieG: { value: number }
  uSunPower: { value: number }
  uViewHeight: { value: number }
  uRingAxis: { value: Vector3 }
  uRingRadii: { value: Vector2 }
  uRingColor: { value: Color }
  uRingGain: { value: number }
  uMoonDirA: { value: Vector3 }
  uMoonDirB: { value: Vector3 }
  uMoonSize: { value: Vector2 }
  uMoonMap: { value: Texture | null }
  uHasMoonMap: { value: number }
  uMoonTintA: { value: Color }
  uMoonTintB: { value: Color }
  uSunLight: { value: Color }
  uAurora: { value: number }
  uAuroraTime: { value: number }
  uSpectral: { value: number }
  uBulge: { value: number }
  uCollar: { value: number }
  uCollarRadius: { value: number }
  uWave: { value: number }
  uWaveFront: { value: number }
  uTremble: { value: number }
  uHorizon: { value: Texture }
  uHazeDensity: { value: number }
  uDustHaze: { value: number }
  uDustColor: { value: Color }
  uSunColor: { value: Color }
  uSkyAmbient: { value: Color }
  uGroundAmbient: { value: Color }
  uCrackGlowColor: { value: Color }
  uCrackGlow: { value: number }
  uNightGlow: { value: Color }
  uStars: { value: number }
  uCover: { value: number }
  uDomeClouds: { value: number }
  uCloudOpacity: { value: number }
  uHole: { value: number }
  uCloudWind: { value: Vector2 }
  uCloudSun: { value: Color }
  uCloudTint: { value: Color }
  /** Lumière de nuit sur les nuages (lunes, anneau, aurore). */
  uCloudNight: { value: Color }
  /** Voile de nuage plein écran quand la caméra est dans la couche (0 -> 1). */
  uVeil: { value: number }
}

/** Texture d'horizon (64×1, demi-flottants, filtrée, bouclée en azimut). */
function createHorizon(): { texture: DataTexture; data: Uint16Array } {
  const data = new Uint16Array(HORIZON * 4)
  const texture = new DataTexture(data, HORIZON, 1, RGBAFormat, HalfFloatType)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.wrapS = RepeatWrapping
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { texture, data }
}

export type SharedRig = {
  uniforms: Shared
  horizon: { texture: DataTexture; data: Uint16Array }
  /** Dernier soleil et altitude utilisés pour l'horizon (recalcul seulement s'ils bougent). */
  last: { sunY: number; sunX: number; height: number; dust: number }
  dispose: () => void
}

export function createShared(bloom: boolean): SharedRig {
  const horizon = createHorizon()
  const sun = new Vector3(...SUN_DIR).normalize()
  const uniforms: Shared = {
    uTime: { value: 0 },
    uSunDir: { value: sun },
    uCrackFront: { value: 0 },
    uCrackWidth: { value: 1 },
    uBloom: { value: bloom ? 1 : 0 },
    uMountainCone: { value: new Vector4(MOUNTAIN.radius, MOUNTAIN.height + 60, MOUNTAIN.sunk, 0) },
    uBetaR: { value: new Vector3(SKY_PARAMS.betaR.r, SKY_PARAMS.betaR.g, SKY_PARAMS.betaR.b) },
    uBetaA: { value: new Vector3(SKY_PARAMS.betaA.r, SKY_PARAMS.betaA.g, SKY_PARAMS.betaA.b) },
    uBetaM: { value: SKY_PARAMS.betaM },
    uMieG: { value: SKY_PARAMS.mieG },
    uSunPower: { value: SKY_PARAMS.sunPower },
    uViewHeight: { value: SKY_PARAMS.viewHeight },
    uRingAxis: { value: SKY_BODIES.ringAxis.clone() },
    uRingRadii: { value: SKY_BODIES.ringRadii.clone() },
    uRingColor: { value: new Color('#f3dcc9') },
    uRingGain: { value: 0.85 },
    uMoonDirA: { value: SKY_BODIES.moonA.clone() },
    uMoonDirB: { value: SKY_BODIES.moonB.clone() },
    uMoonSize: { value: SKY_BODIES.moonSize.clone() },
    uMoonMap: { value: null },
    uHasMoonMap: { value: 0 },
    uMoonTintA: { value: new Color('#e9e2f0') },
    uMoonTintB: { value: new Color('#ffc9bd') },
    uSunLight: { value: new Color('#fff3e6') },
    uAurora: { value: 0 },
    uAuroraTime: { value: 0 },
    uSpectral: { value: 0 },
    uBulge: { value: 0 },
    uCollar: { value: 0 },
    uCollarRadius: { value: MOUNTAIN.radius * 0.97 },
    uWave: { value: 0 },
    uWaveFront: { value: 0 },
    uTremble: { value: 0 },
    uHorizon: { value: horizon.texture },
    uHazeDensity: { value: MAJESTIC_FOG.density },
    uDustHaze: { value: 0 },
    uDustColor: { value: new Color() },
    uSunColor: { value: new Color() },
    uSkyAmbient: { value: new Color() },
    uGroundAmbient: { value: new Color() },
    uCrackGlowColor: { value: new Color('#ff3d8e') },
    uCrackGlow: { value: 0 },
    uNightGlow: { value: new Color() },
    uStars: { value: 0 },
    uCover: { value: 0 },
    uDomeClouds: { value: 0 },
    uCloudOpacity: { value: 0 },
    uHole: { value: 0 },
    uCloudWind: { value: new Vector2(0.004, 0.0015) },
    uCloudSun: { value: new Color() },
    uCloudTint: { value: new Color('#a596a8') },
    uCloudNight: { value: new Color() },
    uVeil: { value: 0 },
  }
  return {
    uniforms,
    horizon,
    last: { sunY: 99, sunX: 99, height: -1, dust: -1 },
    dispose: () => {
      horizon.texture.dispose()
    },
  }
}

export type FrameInput = {
  /** Temps continu (s) : animations lentes (aurore, ondes) ; figé en reduced-motion pour ce qui va vite. */
  time: number
  cameraY: number
  /** Direction caméra -> montagne (xz), pour la couleur du brouillard exporté. */
  towardX: number
  towardZ: number
  reduced: boolean
  bloom: boolean
}

const rgb: Rgb = { r: 0, g: 0, b: 0 }
const sunRgb: Rgb = { r: 0, g: 0, b: 0 }
const dir = { x: 0, y: 0, z: 0 }
const sunDir = { x: 0, y: 0, z: 0 }
const BASE_SUN = { x: SUN_DIR[0], y: SUN_DIR[1], z: SUN_DIR[2] }
/** Élévation de départ du soleil : 2° (azimut de SUN_DIR gardé), pour les couleurs du couchant. */
const BASE_ELEVATION = 2 * DEG
const NIGHT = new Color('#160b26')
/** Observateur à l'altitude des nuages (lumière du couchant sur leur dessous). */
const CLOUD_VIEW = { ...SKY_PARAMS, viewHeight: (CLOUDS.base + CLOUDS.top) / 2 }
const AURORA_TINT = new Color('#2f8f6a')
const MOON_LIGHT = new Color('#4a4a6e')
const AURORA_LIGHT = new Color('#3dffa0')
const DUST = new Color('#3a2a2c')
const scratch = new Color()

/** Nuit : l'aurore fait passer le crépuscule à la nuit, la sortie la garde. */
export function nightOf(m: MajesticState): number {
  return smooth(0.02, 0.85, Math.max(m.aurora, m.outro * 0.9))
}

/** Met à jour les uniforms partagés et majesticSky. */
export function updateShared(rig: SharedRig, m: MajesticState, f: FrameInput): void {
  const u = rig.uniforms
  const night = nightOf(m)
  u.uTime.value = f.time
  u.uBloom.value = f.bloom ? 1 : 0
  // Soleil : bas (2°), il touche l'horizon pendant la montée puis passe dessous avec la nuit
  const elevation = BASE_ELEVATION - 1.2 * DEG * smooth(0, 1, m.rise) - 14 * DEG * night
  sunAt(BASE_SUN, elevation, sunDir)
  u.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z)
  const height = Math.min(Math.max(f.cameraY, 2), 20000)
  u.uViewHeight.value = height
  SKY_PARAMS.viewHeight = height

  // Montagne simplifiée (ombre, reflet) : enfoncement selon la montée
  const sunk = MOUNTAIN.sunk * (1 - m.rise)
  u.uMountainCone.value.z = sunk
  u.uMountainCone.value.w = m.rise > 0.02 ? 1 : 0

  // Sol : dôme avant la montagne, bourrelet autour de sa base, ondes et frémissement du séisme
  u.uBulge.value = smooth(0, 0.5, m.quake) * (1 - smooth(0.12, 0.55, m.rise))
  u.uCollar.value = smooth(0, 0.45, m.rise)
  u.uWave.value = f.reduced ? 0 : m.quake * (1 - 0.5 * m.rise)
  u.uWaveFront.value = 1200 + 9000 * sat(m.quake * 3)
  u.uTremble.value = f.reduced ? 0 : m.quake

  // Fissures : front (m) et demi-largeur (m), lueur (atténuée sans bloom)
  u.uCrackFront.value = m.cracks > 0.001 ? 500 + 5000 * m.cracks : 0
  u.uCrackWidth.value = 1.2 + 1.8 * m.cracks + 1.4 * m.rise
  // Elles refroidissent un peu une fois la montagne dressée (le chœur et le prisme prennent le relais)
  u.uCrackGlow.value =
    smooth(0, 0.25, m.cracks) * (1 - 0.35 * smooth(0.6, 1, m.rise)) * (f.bloom ? 1 : 0.7)

  // Aurore et nuit
  u.uAurora.value = smooth(0, 1, m.aurora)
  u.uAuroraTime.value = f.time * (f.reduced ? 0.35 : 1)
  u.uSpectral.value = 0.55 * smooth(0, 1, m.spectrum)
  u.uStars.value = sat(night * 1.1 + 0.25 * (1 - smooth(-0.02, 0.09, sunDir.y)))
  u.uNightGlow.value.copy(NIGHT).multiplyScalar(0.4 + 0.6 * night)
  u.uRingGain.value = (f.bloom ? 0.5 : 0.42) * (1 - 0.8 * night)

  // Lumière directe au sol (transmittance), ambiance (zénith + horizon), brume
  sunTransmittance(sunDir, SKY_PARAMS, sunRgb)
  const sunGain = (f.bloom ? 3.2 : 2.4) * smooth(-0.03, 0.02, sunDir.y)
  u.uSunColor.value.setRGB(sunRgb.r * sunGain, sunRgb.g * sunGain, sunRgb.b * sunGain)
  dir.x = 0
  dir.y = 1
  dir.z = 0
  scatter(dir, sunDir, SKY_PARAMS, 8, rgb)
  const sky = u.uSkyAmbient.value
  sky.setRGB(rgb.r * 0.9, rgb.g * 0.9, rgb.b * 0.9)
  sky.r += NIGHT.r * 1.2 + AURORA_TINT.r * 0.05 * u.uAurora.value
  sky.g += NIGHT.g * 1.2 + AURORA_TINT.g * 0.05 * u.uAurora.value
  sky.b += NIGHT.b * 1.2 + AURORA_TINT.b * 0.05 * u.uAurora.value
  u.uGroundAmbient.value
    .copy(u.uSunColor.value)
    .multiplyScalar(Math.max(sunDir.y, 0) * 0.35)
    .add(sky)
    .multiplyScalar(0.3)
  u.uGroundAmbient.value.lerp(u.uCrackGlowColor.value, 0.05 * u.uCrackGlow.value)

  // Poussière : brume brune plus dense, éclairée par le soleil et les fissures
  u.uDustHaze.value = 0.00011 * m.dust
  u.uHazeDensity.value =
    MAJESTIC_FOG.density * (1 + 0.5 * m.dust) * (1 + 0.35 * (1 - m.plain) * m.entry)
  u.uDustColor.value
    .copy(DUST)
    .multiply(sky)
    .multiplyScalar(6)
    .add(scratch.copy(u.uSunColor.value).multiplyScalar(0.02))
    .add(scratch.copy(u.uCrackGlowColor.value).multiplyScalar(0.02 * u.uCrackGlow.value))

  updateHorizon(rig, f, m.dust)

  // Nuages : denses avant la plaine (traversée), épars au-dessus, mer de nuages trouée à la sortie.
  // Caméra loin sous la couche : couche plane dans le ciel ; près, dedans ou au-dessus : les tranches.
  const slab = smooth(CLOUDS.base - 700, CLOUDS.base - 150, f.cameraY)
  const cover = Math.max(0.12 + 0.6 * (1 - m.plain), 0.58 * m.outro)
  const opacity = Math.max(0.55 + 0.45 * (1 - m.plain), m.outro)
  u.uCover.value = cover
  u.uDomeClouds.value = opacity * (1 - slab)
  u.uCloudOpacity.value = opacity * slab
  u.uHole.value = smooth(0.1, 0.8, m.outro)
  const inside =
    smooth(CLOUDS.base - 60, CLOUDS.base + 160, f.cameraY) *
    (1 - smooth(CLOUDS.top - 160, CLOUDS.top + 60, f.cameraY))
  // Bouffées traversées : respiration lente du voile (moins d'une par seconde, jamais de saut)
  const puffs = f.reduced
    ? 0.85
    : 0.72 + 0.28 * Math.sin(f.time * 0.9) * Math.sin(f.time * 0.37 + 1)
  u.uVeil.value = inside * smooth(0.3, 0.6, cover) * opacity * puffs
  CLOUD_VIEW.viewHeight = (CLOUDS.base + CLOUDS.top) / 2
  sunTransmittance(sunDir, CLOUD_VIEW, sunRgb)
  const cloudGain = (f.bloom ? 2.4 : 1.8) * smooth(-0.1, 0.01, sunDir.y)
  u.uCloudSun.value.setRGB(sunRgb.r * cloudGain, sunRgb.g * cloudGain, sunRgb.b * cloudGain)
  u.uCloudNight.value
    .copy(MOON_LIGHT)
    .multiplyScalar(night)
    .add(scratch.copy(AURORA_LIGHT).multiplyScalar(0.07 * u.uAurora.value))

  // Export pour D3
  majesticSky.sunDir.copy(u.uSunDir.value)
  majesticSky.sunColor.copy(u.uSunColor.value)
  majesticSky.sunIntensity = Math.max(u.uSunColor.value.r, u.uSunColor.value.g, u.uSunColor.value.b)
  if (majesticSky.sunIntensity > 1e-4)
    majesticSky.sunColor.multiplyScalar(1 / majesticSky.sunIntensity)
  majesticSky.skyAmbient.copy(sky)
  majesticSky.groundAmbient.copy(u.uGroundAmbient.value)
  majesticSky.fogDensity = u.uHazeDensity.value
  majesticSky.night = night
  sampleHorizon(rig, f.towardX, f.towardZ, majesticSky.fogColor)
}

/** Recalcule l'horizon (64 azimuts) si le soleil, l'altitude ou la poussière ont bougé. */
function updateHorizon(rig: SharedRig, f: FrameInput, dust: number): void {
  const sun = rig.uniforms.uSunDir.value
  const last = rig.last
  const moved =
    Math.abs(sun.y - last.sunY) > 2e-4 ||
    Math.abs(sun.x - last.sunX) > 2e-4 ||
    Math.abs(f.cameraY - last.height) > Math.max(5, last.height * 0.05) ||
    Math.abs(dust - last.dust) > 0.01
  if (!moved) return
  last.sunY = sun.y
  last.sunX = sun.x
  last.height = f.cameraY
  last.dust = dust
  const night = rig.uniforms.uNightGlow.value
  const data = rig.horizon.data
  for (let i = 0; i < HORIZON; i++) {
    // u = atan(z, x) / 2π + 0.5 (même convention que horizonColor en GLSL)
    const a = ((i + 0.5) / HORIZON - 0.5) * Math.PI * 2
    dir.x = Math.cos(a)
    dir.y = 0.02
    dir.z = Math.sin(a)
    scatter(dir, sun, SKY_PARAMS, 8, rgb)
    data[i * 4] = DataUtils.toHalfFloat(Math.min(rgb.r + night.r, 60000))
    data[i * 4 + 1] = DataUtils.toHalfFloat(Math.min(rgb.g + night.g, 60000))
    data[i * 4 + 2] = DataUtils.toHalfFloat(Math.min(rgb.b + night.b, 60000))
    data[i * 4 + 3] = DataUtils.toHalfFloat(1)
  }
  rig.horizon.texture.needsUpdate = true
}

/** Couleur de l'horizon dans la direction (x, z) (pour le FogExp2 exporté). */
function sampleHorizon(rig: SharedRig, x: number, z: number, out: Color): void {
  const a = Math.atan2(z, x)
  const u = (a / (Math.PI * 2) + 0.5) * HORIZON - 0.5
  const i0 = ((Math.floor(u) % HORIZON) + HORIZON) % HORIZON
  const i1 = (i0 + 1) % HORIZON
  const t = u - Math.floor(u)
  const data = rig.horizon.data
  const read = (i: number, c: number) => DataUtils.fromHalfFloat(data[i * 4 + c] ?? 0)
  out.setRGB(
    read(i0, 0) * (1 - t) + read(i1, 0) * t,
    read(i0, 1) * (1 - t) + read(i1, 1) * t,
    read(i0, 2) * (1 - t) + read(i1, 2) * t,
  )
}
