// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7) : assemblage de
// l'environnement hors React (D4). buildEnv construit tout une fois (matériaux, géométries, réserves) ;
// updateEnv règle uniforms et objets par frame à partir de M, sans allocation ni setState.
// Ce que chaque valeur de M pilote :
// - entry : plasma autour de la verrière, nuages denses (on les traverse) ;
// - plain : nuages qui s'ouvrent sur la plaine ;
// - quake : ondes et frémissement du sol, dôme qui se soulève, cailloux puis rochers qui sautent, sable ;
// - cracks : front, largeur et lueur des fissures ;
// - dust : nuages de poussière (zone du séisme, base), brume brune, éclairs, force des rayons ;
// - rise : bourrelet de la base, ombre et reflet de la montagne, débris, cascades, soleil qui baisse ;
// - slide : débit des débris et des cascades ;
// - choir : poussière aux pieds des colosses, départ des faisceaux ;
// - beams : faisceaux du chœur ; prism : halo du sommet ; spectrum : éventail du spectre, teinte de
//   l'aurore ; aurora : nuit, étoiles, aurore ; outro : mer de nuages et trouée ; sculpt : lueur du B
//   dans le reflet du sel.
// Ordre de dessin : ciel (opaque, sans profondeur, en premier), crêtes, sol (opaques), puis rayons,
// nuages, poussière, cascades, faisceaux, plasma. Tout est visible au montage (précompilation).
import {
  type BufferGeometry,
  Color,
  Group,
  Mesh,
  type Object3D,
  type PerspectiveCamera,
  type PlaneGeometry,
  type Points,
  type ShaderMaterial,
  type SphereGeometry,
  type Texture,
  Vector3,
} from 'three'
import { CHOIR, MOUNTAIN, SUMMIT, choirCount, choirSlot } from '../layout'
import { type MajesticState } from '../state'
import { type Clouds, createClouds, createPlasma, createVeil, placeClouds } from './clouds'
import {
  type Cascades,
  type FallFrame,
  type Falling,
  type Hoppers,
  createCascades,
  createFalling,
  createHoppers,
  placeResting,
  rockShapes,
  updateFalling,
} from './debris'
import {
  type DustClouds,
  createDustAtlas,
  createDustClouds,
  createSandGrains,
  spawnPuff,
} from './dust'
import { createGroundGeometry, createGroundMaterial, createRidges } from './ground'
import {
  type Beams,
  type Lightning,
  SPECTRUM,
  boltPulse,
  createChoirBeams,
  createHalo,
  createLightning,
  createRays,
  createSpectrum,
  setBeam,
  spectrumDirection,
  strike,
} from './light'
import { type SharedRig, createShared, nightOf, updateShared } from './shared'
import { createSkyDome, createStars } from './sky'
import { type MountainField, fieldFromMesh, proceduralField } from './terrain'

export type EnvOptions = {
  mobile: boolean
  reduced: boolean
  bloom: boolean
  /** Nœud Mountain de majestic.glb (relief des débris et des cascades) ; sinon relief approché. */
  mountain?: Object3D | null
  /** Nœuds Rock_A, Rock_B, Rock_C (formes des débris) ; sinon roches procédurales. */
  rocks?: readonly (Object3D | undefined)[]
}

export type EnvRig = {
  root: Group
  options: EnvOptions
  shared: SharedRig
  follow: Group
  dome: Mesh<SphereGeometry, ShaderMaterial>
  stars: Points<BufferGeometry, ShaderMaterial>
  ground: Mesh<BufferGeometry, ShaderMaterial>
  ridges: Mesh<BufferGeometry, ShaderMaterial>
  rays: Mesh<PlaneGeometry, ShaderMaterial>
  clouds: Clouds
  plasma: Mesh<PlaneGeometry, ShaderMaterial>
  veil: Mesh<PlaneGeometry, ShaderMaterial>
  dust: DustClouds
  sand: Points<BufferGeometry, ShaderMaterial>
  hoppers: Hoppers
  falling: Falling
  cascades: Cascades
  choirBeams: Beams
  spectrum: Beams
  halo: Mesh<PlaneGeometry, ShaderMaterial>
  lightning: Lightning
  field: MountainField
  /** État d'une frame à l'autre (vitesse de montée, bouffées des cascades, roches posées). */
  memory: { rise: number; riseSpeed: number; cascadePuff: number; resting: number }
  /** Textures à envoyer au GPU au préchauffage (en plus de celles des matériaux). */
  textures: Texture[]
  dispose: () => void
}

export type EnvFrame = {
  camera: PerspectiveCamera
  /** Temps continu (s) et pas de la frame (s). */
  time: number
  delta: number
  /** Rapport de pixels et hauteur du canvas (px), pour la taille des points. */
  dpr: number
  height: number
  visible: boolean
}

/** Rayon du dôme et des étoiles : sous le plan lointain de la caméra. */
const DOME_MAX = 55000
/** Côté où naissent les cascades (atan2(z, x)) : entre l'arrivée (+Z) et le recul (flanc +X). */
const FACING_ARRIVAL = Math.PI / 4
/** Longueur des rayons du spectre (m). */
const SPECTRUM_LENGTH = 24000

export function buildEnv(options: EnvOptions): EnvRig {
  const { mobile, bloom } = options
  const root = new Group()
  root.name = 'MajesticEnv'
  const shared = createShared(bloom)
  const u = shared.uniforms
  const field = options.mountain ? fieldFromMesh(options.mountain) : proceduralField()

  const follow = new Group()
  const dome = createSkyDome(u, mobile)
  const stars = createStars(mobile ? 1100 : 2800, 0.96, u, bloom)
  follow.add(dome, stars)

  const ground = new Mesh(createGroundGeometry(mobile), createGroundMaterial(u, mobile))
  ground.frustumCulled = false
  ground.renderOrder = -500
  const ridges = createRidges(u, mobile)
  const rays = createRays(u)
  const clouds = createClouds(u, mobile)
  const plasma = createPlasma(u)
  const veil = createVeil(u)
  const atlas = createDustAtlas()
  const dust = createDustClouds(u, atlas, mobile)
  const sand = createSandGrains(u, mobile ? 1200 : 4000, 120)
  const shapes = rockShapes(options.rocks ?? [])
  const hoppers = createHoppers(u, shapes[0], mobile)
  const falling = createFalling(u, shapes, mobile)
  const cascades = createCascades(u, field, FACING_ARRIVAL, mobile)
  const choirBeams = createChoirBeams(u, choirCount(mobile))
  const spectrum = createSpectrum(u)
  const halo = createHalo(u)
  const lightning = createLightning()

  root.add(
    follow,
    ridges,
    ground,
    rays,
    clouds.mesh,
    dust.mesh,
    sand,
    hoppers.pebbles,
    hoppers.boulders,
    ...falling.meshes,
    cascades.points,
    choirBeams.mesh,
    spectrum.mesh,
    halo,
    lightning.lines,
    veil,
    plasma,
  )

  return {
    root,
    options,
    shared,
    follow,
    dome,
    stars,
    ground,
    ridges,
    rays,
    clouds,
    plasma,
    veil,
    dust,
    sand,
    hoppers,
    falling,
    cascades,
    choirBeams,
    spectrum,
    halo,
    lightning,
    field,
    memory: { rise: 0, riseSpeed: 0, cascadePuff: 0, resting: -1 },
    textures: [shared.horizon.texture, atlas, cascades.texture],
    dispose: () => {
      shared.dispose()
      dome.geometry.dispose()
      dome.material.dispose()
      stars.geometry.dispose()
      stars.material.dispose()
      ground.geometry.dispose()
      ground.material.dispose()
      ridges.geometry.dispose()
      ridges.material.dispose()
      rays.geometry.dispose()
      rays.material.dispose()
      clouds.dispose()
      plasma.geometry.dispose()
      plasma.material.dispose()
      veil.geometry.dispose()
      veil.material.dispose()
      atlas.dispose()
      dust.dispose()
      sand.geometry.dispose()
      sand.material.dispose()
      hoppers.dispose()
      falling.dispose()
      shapes.forEach((shape) => {
        shape.dispose()
      })
      cascades.dispose()
      choirBeams.dispose()
      spectrum.dispose()
      halo.geometry.dispose()
      halo.material.dispose()
      lightning.dispose()
    },
  }
}

// --- Mise à jour par frame ---

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const toward = { x: 0, z: -1 }
const from = new Vector3()
const to = new Vector3()
const focus = new Vector3()
const ray = new Vector3()
const bolt = new Vector3()
const slot: [number, number, number] = [0, 0, 0]
const fall: FallFrame = {
  time: 0,
  dt: 0,
  rise: 0,
  slide: 0,
  riseSpeed: 0,
  facing: FACING_ARRIVAL,
  plain: { bulge: 0, collar: 0, collarRadius: MOUNTAIN.radius * 0.97 },
  reduced: false,
  rate: 0,
}
const boltColor = new Color('#e6dcff')

/** Uniform d'un matériau (existant par construction). */
function uniform(material: ShaderMaterial, name: string): { value: unknown } {
  const found = material.uniforms[name]
  if (!found) throw new Error(`uniform ${name}`)
  return found
}

function setNumber(material: ShaderMaterial, name: string, value: number): void {
  uniform(material, name).value = value
}

/**
 * Marge angulaire (rad) entre le soleil et la silhouette de la montagne vue de la caméra : positive si
 * le soleil est dégagé, négative s'il est caché (cône concave de glsl.ts).
 */
function sunMargin(camera: Vector3, sun: Vector3, rise: number): number {
  if (rise < 0.02) return 1
  const lh = Math.hypot(sun.x, sun.z)
  if (lh < 1e-4 || sun.y <= -0.2) return 1
  const dx = sun.x / lh
  const dz = sun.z / lh
  const px = camera.x - MOUNTAIN.position[0]
  const pz = camera.z - MOUNTAIN.position[2]
  const t = -(px * dx + pz * dz)
  if (t <= 0) return 1
  const closest = Math.hypot(px + dx * t, pz + dz * t)
  const height = camera.y + (sun.y * t) / lh + MOUNTAIN.sunk * (1 - rise)
  const radius = MOUNTAIN.radius * Math.pow(Math.max(1 - height / (MOUNTAIN.height + 60), 0), 1.25)
  return (closest - radius) / t
}

export function updateEnv(rig: EnvRig, m: MajesticState, f: EnvFrame): void {
  rig.root.visible = f.visible
  if (!f.visible) return
  const { camera, time } = f
  const { reduced, bloom, mobile } = rig.options
  const u = rig.shared.uniforms
  const dt = Math.max(f.delta, 1e-4)

  // Direction caméra -> montagne (couleur du brouillard exporté), azimut de la caméra vu du centre
  const dx = MOUNTAIN.position[0] - camera.position.x
  const dz = MOUNTAIN.position[2] - camera.position.z
  const l = Math.hypot(dx, dz)
  toward.x = l > 1 ? dx / l : 0
  toward.z = l > 1 ? dz / l : -1
  updateShared(rig.shared, m, {
    time,
    cameraY: camera.position.y,
    towardX: toward.x,
    towardZ: toward.z,
    reduced,
    bloom,
  })
  const night = nightOf(m)
  const sun = u.uSunDir.value

  // Ciel et étoiles centrés sur la caméra, sous le plan lointain
  const radius = Math.min(DOME_MAX, camera.far * 0.9)
  rig.follow.position.copy(camera.position)
  rig.follow.scale.setScalar(radius)
  setNumber(rig.stars.material, 'uPixel', f.dpr)

  // Vitesse de montée (m/s), lissée
  const memory = rig.memory
  const speed = ((m.rise - memory.rise) * MOUNTAIN.sunk) / dt
  memory.riseSpeed += (Math.max(0, Math.min(speed, 120)) - memory.riseSpeed) * Math.min(1, dt * 4)
  memory.rise = m.rise
  const sunk = MOUNTAIN.sunk * (1 - m.rise)
  focus.set(SUMMIT.focus[0], SUMMIT.focus[1] - sunk, SUMMIT.focus[2])

  // Rayons crépusculaires : loin derrière la montagne, face caméra
  const margin = sunMargin(camera.position, sun, m.rise)
  const visible = smooth(-0.004, 0.012, margin)
  const limb = Math.exp(-((margin / 0.05) ** 2))
  const rays =
    (0.05 * visible + 1.0 * limb + 0.3 * (1 - visible)) * (1 - night) * (0.55 + 0.6 * m.dust)
  rig.rays.visible = rays > 0.003
  if (rig.rays.visible) {
    ray.copy(sun).multiplyScalar(Math.min(40000, radius * 0.8))
    rig.rays.position.copy(camera.position).add(ray)
    rig.rays.quaternion.copy(camera.quaternion)
    rig.rays.scale.setScalar(Math.min(52000, radius))
    setNumber(rig.rays.material, 'uIntensity', rays * (bloom ? 1 : 0.6))
  }

  // Nuages (réglages dans shared.ts) : tranches centrées sur la caméra, voile si on est dedans
  placeClouds(rig.clouds, camera.position, 70000)
  rig.clouds.mesh.visible = u.uCloudOpacity.value > 0.002
  rig.veil.visible = u.uVeil.value > 0.002
  setNumber(rig.veil.material, 'uAspect', camera.aspect)
  setNumber(rig.veil.material, 'uVeilTime', reduced ? 0 : time)

  // Plasma de l'entrée
  const plasma = rig.plasma.material
  rig.plasma.visible = m.entry > 0.002
  setNumber(plasma, 'uEntry', m.entry * (bloom ? 1 : 0.7))
  setNumber(plasma, 'uAspect', camera.aspect)
  setNumber(plasma, 'uPlasmaTime', reduced ? 0 : time)
  const jitter = uniform(plasma, 'uJitter').value as { set: (x: number, y: number) => void }
  const shake = reduced ? 0 : 0.004 * m.entry
  jitter.set(shake * Math.sin(time * 61), shake * Math.sin(time * 47 + 1.3))

  // Poussière : familles pondérées, temps figé en reduced-motion, éclair local
  const dust = rig.dust.mesh.material
  setNumber(dust, 'uDustTime', reduced ? 37 : time)
  setNumber(dust, 'uOpacity', reduced ? 0.6 : 1)
  const groups = uniform(dust, 'uGroups').value as {
    set: (x: number, y: number, z: number, w: number) => void
  }
  const base = Math.max(m.slide, smooth(0.02, 0.25, m.rise) * (1 - 0.6 * smooth(0.85, 1, m.rise)))
  const feet = smooth(0.02, 0.2, m.choir) * (1 - 0.7 * smooth(0.8, 1, m.choir))
  const quakeDust = Math.min(1, m.dust * 1.6) * smooth(0, 0.3, m.cracks + m.quake)
  groups.set(quakeDust, m.dust * base, Math.max(feet, m.dust * 0.2 * m.choir), 1)

  // Grains de sable, cailloux, rochers
  const sand = rig.sand.material
  ;(uniform(sand, 'uCamera').value as Vector3).copy(camera.position)
  setNumber(sand, 'uSand', reduced ? 0 : (0.25 * m.dust + 0.25 * m.quake) * m.plain)
  setNumber(sand, 'uHop', reduced ? 0 : smooth(0.02, 0.3, m.quake))
  setNumber(sand, 'uPixel', f.dpr)
  rig.sand.visible = !reduced && m.plain > 0.01
  const hop = reduced ? 0 : smooth(0.005, 0.25, m.quake) * (0.35 + 0.65 * m.quake)
  const pebbles = rig.hoppers.pebbles.material
  ;(uniform(pebbles, 'uCamera').value as Vector3).copy(camera.position)
  setNumber(pebbles, 'uHop', hop)
  setNumber(rig.hoppers.boulders.material, 'uHop', reduced ? 0 : smooth(0.25, 0.75, m.quake) * 0.8)
  rig.hoppers.pebbles.visible = camera.position.y < 400 && m.plain > 0.01

  // Débris des flancs et cascades de sable
  fall.time = time
  fall.dt = Math.min(dt, 1 / 20)
  fall.rise = m.rise
  fall.slide = m.slide
  fall.riseSpeed = memory.riseSpeed
  fall.facing = Math.atan2(-dz, -dx)
  fall.plain.bulge = u.uBulge.value
  fall.plain.collar = u.uCollar.value
  fall.reduced = reduced
  fall.rate = mobile ? 14 : 45
  if (reduced) {
    // Plan fixe : roches posées une fois la montagne levée (recalculées seulement au changement)
    const state = m.rise > 0.6 ? 1 : 0
    if (state !== memory.resting) {
      memory.resting = state
      placeResting(rig.falling, rig.field, m.rise, fall.plain)
    }
  } else {
    updateFalling(rig.falling, rig.field, fall, rig.dust)
  }
  const cascade = reduced
    ? 0
    : Math.max(m.slide, Math.min(1, memory.riseSpeed / 30)) * smooth(0.04, 0.2, m.rise)
  rig.cascades.points.visible = cascade > 0.002 && rig.cascades.paths > 0
  setNumber(rig.cascades.points.material, 'uCascade', cascade)
  setNumber(rig.cascades.points.material, 'uSunk', sunk)
  setNumber(
    rig.cascades.points.material,
    'uScale',
    (f.height * f.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360)),
  )
  if (cascade > 0.2 && time - memory.cascadePuff > (mobile ? 1.6 : 0.7) && rig.cascades.paths > 0) {
    memory.cascadePuff = time
    const k = Math.floor((time * 7.3) % rig.cascades.paths)
    const ends = rig.cascades.ends
    spawnPuff(
      rig.dust,
      ends[k * 3] ?? 0,
      Math.max((ends[k * 3 + 1] ?? 0) - sunk, 0),
      ends[k * 3 + 2] ?? 0,
      time,
      90 + 60 * cascade,
    )
  }

  // Faisceaux du chœur : des mains et visages vers le centre du prisme
  const beams = rig.choirBeams
  rig.choirBeams.mesh.visible = m.beams > 0.002
  if (rig.choirBeams.mesh.visible) {
    const count = beams.count
    for (let i = 0; i < count; i++) {
      choirSlot(i, count, slot)
      // Mains jointes et visage (Choir_Glow), un peu devant l'axe : la statue regarde vers l'extérieur
      from.set(slot[0], CHOIR.glowHeight - CHOIR.sunk * (1 - m.choir), slot[2])
      to.set(slot[0] - MOUNTAIN.position[0], 0, slot[2] - MOUNTAIN.position[2]).normalize()
      from.addScaledVector(to, 6)
      setBeam(beams, i, from, focus)
    }
    beams.mesh.instanceMatrix.needsUpdate = true
    setNumber(beams.mesh.material, 'uGrow', Math.min(1.02, m.beams * 1.15))
    setNumber(
      beams.mesh.material,
      'uIntensity',
      m.beams * (bloom ? 1.35 : 0.8) * (1 - 0.3 * m.spectrum),
    )
  }

  // Spectre : éventail depuis le prisme, qui cède la place à l'aurore
  const spectrum = rig.spectrum
  const spectral = m.spectrum * (1 - 0.85 * smooth(0.1, 0.9, m.aurora))
  spectrum.mesh.visible = spectral > 0.002
  if (spectrum.mesh.visible) {
    for (let k = 0; k < SPECTRUM.length; k++) {
      spectrumDirection(k, SPECTRUM.length, to)
      from.copy(focus).addScaledVector(to, SPECTRUM_LENGTH)
      setBeam(spectrum, k, focus, from)
    }
    spectrum.mesh.instanceMatrix.needsUpdate = true
    setNumber(spectrum.mesh.material, 'uGrow', Math.min(1.02, m.spectrum * 1.25))
    setNumber(spectrum.mesh.material, 'uIntensity', spectral * (bloom ? 2.2 : 1))
  }

  // Halo du sommet
  const halo = 0.5 * m.beams + 0.9 * m.prism + 0.7 * m.spectrum
  rig.halo.visible = halo > 0.002
  if (rig.halo.visible) {
    rig.halo.position.copy(focus)
    rig.halo.quaternion.copy(camera.quaternion)
    rig.halo.scale.setScalar(240 + 160 * m.prism)
    setNumber(rig.halo.material, 'uIntensity', halo * (bloom ? 1.5 : 0.8))
  }

  // Éclairs : au plus un par seconde, dans la poussière face à la caméra, jamais en reduced-motion
  const lightning = rig.lightning
  const storm =
    !reduced && m.dust > 0.3 && (m.quake > 0.3 || (m.rise > 0.05 && m.rise < 0.97) || m.slide > 0.3)
  if (storm && time >= lightning.next && time - lightning.start > 1.1) {
    const a = fall.facing + (lightning.random() - 0.5) * 1.8
    const r = MOUNTAIN.radius + 200 + lightning.random() * 1000
    bolt.set(
      MOUNTAIN.position[0] + Math.cos(a) * r,
      380 + lightning.random() * 320,
      MOUNTAIN.position[2] + Math.sin(a) * r,
    )
    strike(lightning, bolt, time)
    lightning.next = time + 1.3 + lightning.random() * 2.6
  }
  const pulse = storm || time - lightning.start < 0.6 ? boltPulse(lightning, time) : 0
  lightning.lines.visible = pulse > 0.01
  // Sans bloom, l'écran mélange en sRGB : courbe au carré (comme finishAdd)
  lightning.lines.material.color
    .copy(boltColor)
    .multiplyScalar(bloom ? pulse * 2.6 : pulse * pulse * 0.6)
  const boltUniform = uniform(dust, 'uBolt').value as {
    set: (x: number, y: number, z: number, w: number) => void
  }
  boltUniform.set(lightning.at.x, lightning.at.y - 150, lightning.at.z, pulse * (bloom ? 0.9 : 0.5))

  // Lueur du B sculpté dans le reflet du sel
  const glow = uniform(rig.ground.material, 'uMountainGlow').value as Color
  glow.setRGB(0.5, 0.06, 0.22).multiplyScalar(0.25 * m.sculpt)
}

/** Carte de la Lune (parc) posée sur les deux lunes. */
export function setMoonMap(rig: EnvRig, texture: Texture): void {
  const u = rig.shared.uniforms
  u.uMoonMap.value = texture
  u.uHasMoonMap.value = 1
}

/** Texture de sable de B2 (couleur ou normale) posée sur le sol. */
export function setSandMap(rig: EnvRig, slot: 'color' | 'normal', texture: Texture): void {
  const material = rig.ground.material
  if (slot === 'color') {
    uniform(material, 'uSandMap').value = texture
    uniform(material, 'uHasSand').value = 1
  } else {
    uniform(material, 'uSandNormal').value = texture
    uniform(material, 'uHasSandNormal').value = 1
  }
}
