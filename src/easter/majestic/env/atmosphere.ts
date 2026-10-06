// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 2 : « immense plaine au
// crépuscule ») : le même modèle d'atmosphère que le bloc ATMOSPHERE de glsl.ts, en TypeScript pur
// (testé), pour ce que le CPU doit connaître à chaque frame sans lire le GPU :
// - la couleur de l'horizon tout autour (texture 64×1 de la brume : la plaine se fond dans le ciel) ;
// - la couleur du soleil au sol (transmittance), l'ambiance du ciel ;
// - la couleur de brume exportée pour le FogExp2 de D3 (montagne, chœur).
// Diffusion simple de Rayleigh et de Mie, profondeur optique vers le soleil par l'approximation de
// Chapman de C. Schüler (GPU Pro 3). Aucune allocation : sorties dans des objets fournis.

export type Rgb = { r: number; g: number; b: number }
export type Dir = { x: number; y: number; z: number }

export type AtmosphereParams = {
  /** Diffusion de Rayleigh (1/m) par canal : plus de rouge que sur Terre, ciel lavande et magenta. */
  betaR: Rgb
  /** Absorption (1/m) qui suit la densité de Rayleigh (bande de Chappuis de l'ozone sur Terre) : elle
   *  retire du vert sur les longs trajets, d'où les crépuscules pourpres. Extinction seule. */
  betaA: Rgb
  /** Diffusion de Mie (1/m) et anisotropie. */
  betaM: number
  mieG: number
  /** Puissance du soleil (unités HDR de la scène). */
  sunPower: number
  /** Altitude de l'observateur (m). */
  viewHeight: number
}

export const R_PLANET = 6360e3
export const R_ATMO = 6420e3
const H50_R = 5545.2
const H50_M = 831.8
const XR = R_PLANET / H50_R
const XM = R_PLANET / H50_M

/** Réglage du ciel du sanctuaire (lu aussi par les uniforms du GLSL). */
export const SKY_PARAMS: AtmosphereParams = {
  betaR: { r: 10.5e-6, g: 11e-6, b: 26e-6 },
  betaA: { r: 3e-6, g: 12e-6, b: 0.4e-6 },
  betaM: 7e-6,
  mieG: 0.8,
  sunPower: 9,
  viewHeight: 30,
}

/** Fonction de Chapman approchée (en hauteurs de demi-densité), exposant borné comme en GLSL. */
export function chapman(X: number, h: number, cosChi: number): number {
  const c = Math.sqrt(X + h)
  if (cosChi >= 0) return (c / (c * cosChi + 1)) * Math.pow(2, -h)
  const x0 = Math.sqrt(Math.max(1 - cosChi * cosChi, 0)) * (X + h)
  const c0 = Math.sqrt(x0)
  return 2 * c0 * Math.pow(2, Math.min(X - x0, 60)) - (c / (1 - c * cosChi)) * Math.pow(2, -h)
}

function raySphereFar(oy: number, dy: number, radius: number): number {
  // Origine (0, oy, 0), direction unitaire de composante verticale dy
  const b = oy * dy
  const c = oy * oy - radius * radius
  return Math.max(-b + Math.sqrt(Math.max(b * b - c, 0)), 0)
}

const tmp = { x: 0, y: 0, z: 0 }

/**
 * Lumière du ciel dans la direction `dir` (unitaire), soleil `sun` (unitaire). Directions sous
 * l'horizon relevées juste au-dessus (comme en GLSL). `trans` (facultatif) : transmittance de la vue.
 */
export function scatter(
  dir: Dir,
  sun: Dir,
  p: AtmosphereParams,
  samples: number,
  out: Rgb,
  trans?: Rgb,
): Rgb {
  const y = Math.max(dir.y, 0.0015)
  const l = Math.hypot(dir.x, y, dir.z)
  tmp.x = dir.x / l
  tmp.y = y / l
  tmp.z = dir.z / l
  const oy = R_PLANET + p.viewHeight
  const tMax = raySphereFar(oy, tmp.y, R_ATMO)
  const mu = tmp.x * sun.x + tmp.y * sun.y + tmp.z * sun.z
  const phaseR = 0.0596831 * (1 + mu * mu)
  const g = p.mieG
  const g2 = g * g
  const phaseM =
    (0.1193662 * (1 - g2) * (1 + mu * mu)) /
    ((2 + g2) * Math.pow(Math.max(1 + g2 - 2 * g * mu, 1e-4), 1.5))
  let sr = 0
  let sg = 0
  let sb = 0
  let mr = 0
  let mg = 0
  let mb = 0
  let odR = 0
  let odM = 0
  let prev = 0
  const { betaR, betaA, betaM } = p
  const er = betaR.r + betaA.r
  const eg = betaR.g + betaA.g
  const eb = betaR.b + betaA.b
  for (let i = 0; i < samples; i++) {
    const s = (i + 1) / samples
    const next = s * s * tMax
    const ds = next - prev
    const t = prev + 0.5 * ds
    prev = next
    const px = tmp.x * t
    const py = oy + tmp.y * t
    const pz = tmp.z * t
    const r = Math.hypot(px, py, pz)
    const h = Math.max(r - R_PLANET, 0)
    const dR = Math.pow(2, -h / H50_R) * ds
    const dM = Math.pow(2, -h / H50_M) * ds
    odR += dR
    odM += dM
    const cosChi = (px * sun.x + py * sun.y + pz * sun.z) / r
    const sunR = H50_R * chapman(XR, h / H50_R, cosChi)
    const sunM = H50_M * chapman(XM, h / H50_M, cosChi)
    const kR = odR - 0.5 * dR + sunR
    const kM = 1.1 * betaM * (odM - 0.5 * dM + sunM)
    const ar = Math.exp(-Math.min(er * kR + kM, 80))
    const ag = Math.exp(-Math.min(eg * kR + kM, 80))
    const ab = Math.exp(-Math.min(eb * kR + kM, 80))
    sr += dR * ar
    sg += dR * ag
    sb += dR * ab
    mr += dM * ar
    mg += dM * ag
    mb += dM * ab
  }
  const k = p.sunPower
  out.r = k * (sr * betaR.r * phaseR + mr * betaM * phaseM)
  out.g = k * (sg * betaR.g * phaseR + mg * betaM * phaseM)
  out.b = k * (sb * betaR.b * phaseR + mb * betaM * phaseM)
  if (trans) {
    const m = 1.1 * betaM * odM
    trans.r = Math.exp(-Math.min(er * odR + m, 80))
    trans.g = Math.exp(-Math.min(eg * odR + m, 80))
    trans.b = Math.exp(-Math.min(eb * odR + m, 80))
  }
  return out
}

/** Transmittance de l'air entre l'observateur et le soleil (couleur de la lumière directe au sol). */
export function sunTransmittance(sun: Dir, p: AtmosphereParams, out: Rgb): Rgb {
  const h = p.viewHeight
  const cosChi = sun.y
  const kR = H50_R * chapman(XR, h / H50_R, cosChi)
  const kM = 1.1 * p.betaM * H50_M * chapman(XM, h / H50_M, cosChi)
  out.r = Math.exp(-Math.min((p.betaR.r + p.betaA.r) * kR + kM, 80))
  out.g = Math.exp(-Math.min((p.betaR.g + p.betaA.g) * kR + kM, 80))
  out.b = Math.exp(-Math.min((p.betaR.b + p.betaA.b) * kR + kM, 80))
  return out
}

/** Direction du soleil : azimut de `base` gardé, élévation (rad) imposée. */
export function sunAt(base: Dir, elevation: number, out: Dir): Dir {
  const h = Math.hypot(base.x, base.z) || 1
  const c = Math.cos(elevation)
  out.x = (base.x / h) * c
  out.y = Math.sin(elevation)
  out.z = (base.z / h) * c
  return out
}
