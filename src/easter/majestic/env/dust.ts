// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 3 : « des nuages de
// poussière se lèvent » ; beat 4 : glissements de terrain ; beat 5 : les colosses surgissent) : poussière
// en particules GPU douces et volumineuses, sans React.
// - Nuages : quads face caméra instanciés (un draw), atlas de quatre bouffées généré une fois (bruit fbm,
//   bord éclairé par le haut). Chaque nuage a son cycle (naissance, montée, gonflement, fondu) calculé
//   dans le shader : aucune mise à jour CPU par particule. Trois familles pondérées par frame (M.dust) :
//   zone du séisme (fissures), base de la montagne (montée, glissements), pieds du chœur (levée).
//   Bouffées ponctuelles (impacts des roches, bas des cascades) : réserve tournante écrite par le CPU.
//   Éclairage : soleil (diffusion vers l'avant à contre-jour, ombre de la montagne), ciel, lueur rose des
//   fissures par en dessous, éclair local ; brume de distance. Fondu près de la caméra (jamais de grande
//   tache plein écran).
// - Sable : grains près de la caméra (boîte qui la suit), qui sautent avec le séisme et filent au vent.
// Reduced-motion : temps figé (bancs immobiles), sans grains. Mobile : trois fois moins de nuages.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NormalBlending,
  Points,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { seeded } from '../../shaders'
import { MOUNTAIN, QUAKE_ZONE, choirCount, choirSlot } from '../layout'
import {
  CRACKS,
  FINISH,
  GROUND_HEIGHT,
  HAZE,
  MOUNTAIN as MOUNTAIN_GLSL,
  NOISE2,
  UNIFORMS,
  VORONOI,
  glsl,
} from './glsl'
import { type Shared } from './shared'

// --- Atlas : quatre bouffées 128×128 (R densité, G bord éclairé par le haut) ---

const TILE = 128

function valueNoise(seed: number): (x: number, y: number) => number {
  const random = seeded(seed)
  const table = new Float32Array(256 * 256)
  for (let i = 0; i < table.length; i++) table[i] = random()
  const at = (x: number, y: number) => table[((y & 255) << 8) | (x & 255)] ?? 0
  return (x, y) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const a = at(ix, iy)
    const b = at(ix + 1, iy)
    const c = at(ix, iy + 1)
    const d = at(ix + 1, iy + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
  }
}

/** Pixels de l'atlas, calculés une fois par session (une relance du niveau ne les recalcule pas). */
let atlasPixels: Uint8Array | null = null

export function createDustAtlas(): DataTexture {
  const size = TILE * 2
  atlasPixels ??= computeAtlas(size)
  const texture = new DataTexture(atlasPixels, size, size, RGBAFormat, UnsignedByteType)
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

function computeAtlas(size: number): Uint8Array {
  const data = new Uint8Array(size * size * 4)
  const noise = valueNoise(13)
  const density = new Float32Array(TILE * TILE)
  for (let tile = 0; tile < 4; tile++) {
    const ox = (tile % 2) * TILE
    const oy = Math.floor(tile / 2) * TILE
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const u = ((x + 0.5) / TILE) * 2 - 1
        const v = ((y + 0.5) / TILE) * 2 - 1
        // Contour irrégulier : rayon déformé par un bruit angulaire (pas de disque reconnaissable)
        const angle = Math.atan2(v, u)
        const lobes =
          0.6 + 0.55 * noise(Math.cos(angle) * 1.8 + tile * 5 + 20, Math.sin(angle) * 1.8 + 20)
        const r = Math.hypot(u, v) / lobes
        const falloff = Math.max(0, 1 - r)
        let sum = 0
        let amp = 0.5
        let f = 2.2
        const wx = noise(u * 1.7 + tile * 9 + 3, v * 1.7) * 0.6
        const wy = noise(u * 1.7 + tile * 9 + 40, v * 1.7 + 11) * 0.6
        for (let o = 0; o < 5; o++) {
          sum += amp * noise((u + wx) * f + tile * 17, (v + wy) * f + 5)
          f *= 2.07
          amp *= 0.5
        }
        const d = Math.min(
          1,
          Math.max(0, falloff * falloff * (3 - 2 * falloff) * (0.05 + sum * 1.9) - 0.2),
        )
        density[y * TILE + x] = d
      }
    }
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const d = density[y * TILE + x] ?? 0
        // Bord du haut plus clair : densité moindre au-dessus (lumière qui vient d'en haut)
        const above = density[Math.min(TILE - 1, y + 10) * TILE + x] ?? 0
        const lit = Math.min(1, Math.max(0, 0.55 + (d - above) * 2.2))
        const i = ((oy + y) * size + ox + x) * 4
        data[i] = Math.round(d * 255)
        data[i + 1] = Math.round(lit * 255)
        data[i + 2] = 0
        data[i + 3] = 255
      }
    }
  }
  return data
}

// --- Nuages de poussière ---

const CLOUD_VERT = glsl(
  NOISE2,
  UNIFORMS,
  VORONOI,
  GROUND_HEIGHT,
  CRACKS,
  HAZE,
  MOUNTAIN_GLSL,
  /* glsl */ `
attribute vec3 aHome;
attribute vec4 aLife;
attribute vec4 aShape;
uniform float uDustTime;
uniform vec4 uGroups;
uniform vec2 uWind;
uniform vec4 uBolt;
uniform vec3 uBoltColor;
uniform vec3 uCrackGlowColor;
uniform float uCrackGlow;
uniform vec3 uDustTint;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
varying float vHaze;
varying vec3 vHazeColor;
varying float vLift;
varying float vClimb;
varying vec3 vAmbient;
varying vec3 vSun;
varying float vForward;
void main() {
  float life = aLife.y;
  float age = aLife.z > 0.5 ? mod(uDustTime + aLife.x * life, life) : uDustTime - aLife.x;
  float k = age / life;
  int group = int(aLife.w + 0.5);
  float weight = group == 0 ? uGroups.x : group == 1 ? uGroups.y : group == 2 ? uGroups.z : uGroups.w;
  float alive = step(0.0, k) * step(k, 1.0) * weight;
  if (alive <= 0.002) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    return;
  }
  vec3 center = aHome;
  center.xz += uWind * age;
  float size = mix(aShape.x, aShape.y, sqrt(k));
  // Au ras du sol (cœur dense à un tiers de sa taille), puis il monte ; le bas du panneau passe sous
  // la surface mais s'efface avant elle (vLift) : jamais de coupe nette avec le sol
  float ground = groundHeight(center.xz);
  float climb = aShape.z * age * (1.0 - 0.45 * k);
  center.y += ground + size * 0.36 + climb;
  // Panneau vertical tourné vers la caméra (autour de l'axe vertical) : jamais de coupe nette avec le
  // sol quand on le regarde d'en haut, et il s'efface vu à la verticale
  vec3 toCam = cameraPosition - center;
  vec2 level = vec2(toCam.x, toCam.z);
  float levelLength = length(level);
  vec2 side = levelLength > 1e-3 ? vec2(level.y, -level.x) / levelLength : vec2(1.0, 0.0);
  float stretch = group == 0 || group == 3 ? 1.5 : 1.15;
  float flip = fract(aShape.w * 7.0) > 0.5 ? 1.0 : -1.0;
  vec3 world = center + vec3(side.x, 0.0, side.y) * position.x * size * stretch + vec3(0.0, position.y * size, 0.0);
  vec4 mv = viewMatrix * vec4(world, 1.0);
  vLift = (world.y - ground) / size;
  vClimb = climb / size;
  float dist = max(length(toCam), 1.0);
  float facing = levelLength / dist;
  gl_Position = projectionMatrix * mv;
  float tile = floor(aShape.w * 3.999);
  vUv = (vec2(position.x * flip, position.y) * 0.5 + 0.5) * 0.5 + vec2(mod(tile, 2.0), floor(tile * 0.5)) * 0.5;
  vAlpha = smoothstep(0.0, 0.14, k) * (1.0 - smoothstep(0.45, 1.0, k)) * alive;
  // Jamais de grande tache floue devant la caméra ; effacé vu par-dessus
  vAlpha *= smoothstep(size * 0.3, size * 1.4, dist) * smoothstep(0.15, 0.55, facing);
  // Lumière : contre-jour (diffusion vers l'avant), ciel, fissures par en dessous, éclair
  vec3 toCenter = center - cameraPosition;
  vec3 view = toCenter / max(length(toCenter), 1e-3);
  float forward = pow(max(dot(view, uSunDir), 0.0), 6.0);
  float shade = mountainClear(center, uSunDir);
  vec4 crack = crackField(center.xz);
  float under = exp(-max(crack.x - crack.y, 0.0) / 160.0) * step(0.001, crack.y);
  under = max(under, (1.0 - smoothstep(uCrackFront * 0.4, uCrackFront + 1.0, length(center.xz))) * 0.25);
  float low = exp(-max(center.y, 0.0) / 70.0);
  vec3 glow = uCrackGlowColor * uCrackGlow * under * low * 0.2;
  float bolt = uBolt.w * exp(-dot(center - uBolt.xyz, center - uBolt.xyz) / (520.0 * 520.0));
  // Lumière désaturée (la poussière grise ne prend pas tout le magenta du ciel) : ambiance, soleil
  // (côté éclairé) et diffusion vers l'avant (bords fins à contre-jour), dosées par pixel
  vec3 sky = uSkyAmbient * 2.2;
  vAmbient = uDustTint * mix(sky, vec3(dot(sky, vec3(0.299, 0.587, 0.114))), 0.55);
  vec3 sunLight = uSunColor * shade;
  vSun = uDustTint * mix(sunLight, vec3(dot(sunLight, vec3(0.299, 0.587, 0.114))), 0.45);
  vForward = forward;
  vColor = glow + uBoltColor * bolt;
  vHaze = hazeAmount(center);
  vHazeColor = horizonColor(view);
}`,
)

const CLOUD_FRAG = glsl(
  UNIFORMS,
  FINISH,
  /* glsl */ `
uniform sampler2D uAtlas;
uniform float uOpacity;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
varying float vHaze;
varying vec3 vHazeColor;
varying float vLift;
varying float vClimb;
varying vec3 vAmbient;
varying vec3 vSun;
varying float vForward;
void main() {
  if (vAlpha <= 0.0) discard;
  vec2 t = texture2D(uAtlas, vUv).rg;
  // Bas fondu au-dessus du sol (hauteur relative à la taille), plus franc une fois le nuage monté
  float soft = smoothstep(0.0, 0.22, vLift) + smoothstep(0.0, 0.4, vClimb) * step(0.0, vLift);
  float a = t.r * vAlpha * uOpacity * 0.85 * min(soft, 1.0);
  if (a <= 0.002) discard;
  // Cœurs denses dans leur propre ombre, bords fins lumineux à contre-jour, dessus éclairé
  float thin = 1.0 - t.r;
  vec3 c = vAmbient * (0.5 + 0.6 * t.g) * (1.0 - 0.45 * t.r);
  c += vSun * (0.12 * t.g + vForward * thin * thin * 1.4);
  c += vColor;
  c = mix(c, vHazeColor, vHaze);
  // Prémultiplié après l'encodage de sortie (sRGB à l'écran sans bloom) : sRGB(c)·a, pas sRGB(c·a)
  gl_FragColor = vec4(finish(c), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`,
)

export type DustClouds = {
  mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>
  ambient: number
  /** Réserve des bouffées ponctuelles : premier index, taille, prochain emplacement. */
  puffs: { start: number; count: number; next: number }
  home: InstancedBufferAttribute
  life: InstancedBufferAttribute
  shape: InstancedBufferAttribute
  dispose: () => void
}

export function createDustClouds(shared: Shared, atlas: DataTexture, mobile: boolean): DustClouds {
  const random = seeded(61)
  const ambient = mobile ? 100 : 320
  const puffCount = mobile ? 40 : 140
  const total = ambient + puffCount
  const home = new Float32Array(total * 3)
  const life = new Float32Array(total * 4)
  const shape = new Float32Array(total * 4)
  const choir = choirCount(mobile)
  const slot: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < ambient; i++) {
    const pick = random()
    const group = pick < 0.5 ? 0 : pick < 0.86 ? 1 : 2
    let x = 0
    let z = 0
    let y = 0
    if (group === 0) {
      // Entre la montagne et le vaisseau (arrivée par +Z) : éventail devant la base, le long des fissures
      const a = Math.PI / 2 + (random() - 0.5) * 2.2
      const r = MOUNTAIN.radius + 80 + random() * (QUAKE_ZONE.radius + 300)
      x = MOUNTAIN.position[0] + Math.cos(a) * r
      z = MOUNTAIN.position[2] + Math.sin(a) * r
      y = 4 + random() * 30
      shape.set([40 + random() * 50, 110 + random() * 160, 2 + random() * 5, random()], i * 4)
      life.set([random(), 10 + random() * 7, 1, group], i * 4)
    } else if (group === 1) {
      // Plutôt côté +Z (face au B, d'où l'on regarde), autour de l'emprise de la montagne
      const a = (random() - 0.5) * Math.PI * 1.6 + Math.PI / 2
      const r = MOUNTAIN.radius * (0.8 + random() * 0.65)
      x = MOUNTAIN.position[0] + Math.cos(a) * r
      z = MOUNTAIN.position[2] + Math.sin(a) * r
      y = 10 + random() * 160
      shape.set([110 + random() * 110, 330 + random() * 330, 12 + random() * 18, random()], i * 4)
      life.set([random(), 16 + random() * 10, 1, group], i * 4)
    } else {
      choirSlot(Math.floor(random() * choir), choir, slot)
      const a = random() * Math.PI * 2
      const r = 15 + random() * 70
      x = slot[0] + Math.cos(a) * r
      z = slot[2] + Math.sin(a) * r
      y = 2 + random() * 20
      shape.set([25 + random() * 30, 110 + random() * 120, 4 + random() * 6, random()], i * 4)
      life.set([random(), 7 + random() * 4, 1, group], i * 4)
    }
    home.set([x, y, z], i * 3)
  }
  // Bouffées : cycle éteint jusqu'à ce que le CPU en lance une (naissance très loin dans le futur)
  for (let i = ambient; i < total; i++) {
    life.set([1e6, 7, 0, 3], i * 4)
    shape.set([20, 90, 3, random()], i * 4)
  }
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  const homeAttr = new InstancedBufferAttribute(home, 3)
  const lifeAttr = new InstancedBufferAttribute(life, 4)
  const shapeAttr = new InstancedBufferAttribute(shape, 4)
  geometry.setAttribute('aHome', homeAttr)
  geometry.setAttribute('aLife', lifeAttr)
  geometry.setAttribute('aShape', shapeAttr)
  geometry.instanceCount = total
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uAtlas: { value: atlas },
      uDustTime: { value: 0 },
      uGroups: { value: new Vector4() },
      uWind: { value: new Vector2(3.5, 1.2) },
      uBolt: { value: new Vector4() },
      uBoltColor: { value: new Color('#d9c8ff') },
      uDustTint: { value: new Color('#5f5450') },
      uOpacity: { value: 1 },
    },
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 20
  return {
    mesh,
    ambient,
    puffs: { start: ambient, count: puffCount, next: 0 },
    home: homeAttr,
    life: lifeAttr,
    shape: shapeAttr,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

/** Lance une bouffée (impact, bas de cascade) : position, instant, taille finale (m). */
export function spawnPuff(
  clouds: DustClouds,
  x: number,
  y: number,
  z: number,
  time: number,
  size: number,
): void {
  const { puffs } = clouds
  const i = puffs.start + puffs.next
  puffs.next = (puffs.next + 1) % puffs.count
  clouds.home.setXYZ(i, x, y, z)
  clouds.life.setXYZW(i, time, 5 + size / 40, 0, 3)
  clouds.shape.setXYZW(i, size * 0.25, size, 2 + size / 30, (i * 0.618) % 1)
  clouds.home.needsUpdate = true
  clouds.life.needsUpdate = true
  clouds.shape.needsUpdate = true
}

// --- Grains de sable près de la caméra ---

const SAND_VERT = glsl(
  NOISE2,
  UNIFORMS,
  GROUND_HEIGHT,
  /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCamera;
uniform float uBox;
uniform float uSand;
uniform float uHop;
uniform vec2 uWind;
uniform float uPixel;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 drift = uWind * uTime * (2.0 + 3.0 * aSeed.w);
  vec2 xz = uCamera.xz + mod(aSeed.xz * uBox + drift - uCamera.xz + 0.5 * uBox, uBox) - 0.5 * uBox;
  float cycle = floor(uTime * (1.1 + aSeed.w) + aSeed.y * 7.0);
  float phase = fract(uTime * (1.1 + aSeed.w) + aSeed.y * 7.0);
  float jump = step(hash12(vec2(cycle, aSeed.x * 91.0)), uHop) * 4.0 * phase * (1.0 - phase);
  float y = groundHeight(xz) + 0.05 + jump * (0.3 + 1.6 * aSeed.y * uHop) + aSeed.y * 2.5 * uSand;
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float d = max(-mv.z, 0.5);
  float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(xz - uCamera.xz));
  vec3 view = normalize(p - cameraPosition + vec3(0.0, 1e-3, 0.0));
  float forward = pow(max(dot(view, uSunDir), 0.0), 4.0);
  vColor = (uSunColor * (0.15 + 1.2 * forward) + uSkyAmbient) * vec3(1.0, 0.85, 0.8);
  vAlpha = edge * max(uSand, uHop) * smoothstep(1.0, 4.0, d);
  gl_PointSize = clamp(uPixel * (0.05 + 0.06 * aSeed.z) * 900.0 / d, 1.0, 4.0);
  gl_Position = projectionMatrix * mv;
  if (vAlpha <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`,
)

const SAND_FRAG = glsl(
  UNIFORMS,
  FINISH,
  /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = (1.0 - smoothstep(0.3, 1.0, dot(p, p))) * vAlpha * 0.7;
  gl_FragColor = vec4(finish(vColor), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`,
)

export function createSandGrains(
  shared: Shared,
  count: number,
  box: number,
): Points<BufferGeometry, ShaderMaterial> {
  const random = seeded(83)
  const seed = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) seed.set([random(), random(), random(), random()], i * 4)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 4))
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uCamera: { value: new Vector3() },
      uBox: { value: box },
      uSand: { value: 0 },
      uHop: { value: 0 },
      uWind: { value: new Vector2(3.5, 1.2) },
      uPixel: { value: 1 },
    },
    vertexShader: SAND_VERT,
    fragmentShader: SAND_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 15
  return points
}
