// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md : feux d'artifice lents, vaisseaux
// réacteurs allumés ; consigne de Mathis : poussière d'anneaux qui scintille lentement, particules qui
// défilent près de la caméra) : particules calculées sur le GPU, sans React ni mise à jour par particule.
// - Feux d'artifice : N gerbes en boucle, chacune avec sa période et sa phase ; à chaque cycle, origine
//   et couleur tirées d'un hachage (cycle, gerbe). Montée de 0.35 s puis extinction lente sur plusieurs
//   secondes : jamais de flash (WCAG 2.3.1, aucune variation plein écran).
// - Poussière de vitesse : segments répartis dans une boîte qui suit la caméra (repliement modulo),
//   étirés selon la vitesse : c'est leur défilement qui donne la vitesse.
// - Poussière d'anneau : points dans l'anneau, scintillement lent (période de plusieurs secondes).
// - Traînées : deux plans croisés derrière chaque tuyère, dégradé additif (InstancedMesh).
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type ColorRepresentation,
  DoubleSide,
  ShaderMaterial,
  Vector3,
} from 'three'
import { seeded } from '../shaders'
import { NOISE } from './glsl'

// --- Feux d'artifice ---

const FIREWORK_VERT = /* glsl */ `
attribute float aSlot;
attribute vec3 aDir;
attribute float aRand;
attribute float aTrail;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uCenter;
uniform vec3 uSpread;
uniform float uScale;
uniform float uSize;
uniform vec3 uColors[4];
varying vec3 vColor;
varying float vAlpha;
${NOISE}
void main() {
  float period = 4.2 + 2.6 * hash11(aSlot * 7.13 + 0.5);
  float local = uTime + hash11(aSlot * 3.71 + 0.2) * period;
  float cycle = floor(local / period);
  float age = local - cycle * period - aTrail * 0.06;
  float seed = aSlot * 17.0 + cycle * 3.1;
  vec3 origin = uCenter + (hash31(seed) * 2.0 - 1.0) * uSpread;
  float speed = uSize * 9.0 * (0.7 + 0.6 * hash11(seed + 1.7)) * (0.82 + 0.36 * aRand);
  float drag = 1.25;
  float travel = speed * (1.0 - exp(-drag * age)) / drag;
  vec3 pos = origin + aDir * travel + vec3(0.0, -0.22 * uSize * age * age, 0.0);
  float life = period * 0.8;
  float fadeIn = smoothstep(0.0, 0.35, age);
  float fadeOut = 1.0 - smoothstep(life * 0.35, life, age);
  float tail = 1.0 - aTrail / 4.0;
  vAlpha = fadeIn * fadeOut * uIntensity * (0.6 + 0.4 * aRand) * tail * tail * step(0.0, age);
  int pick = int(floor(hash11(seed + 4.2) * 3.999));
  vec3 base = uColors[0];
  if (pick == 1) base = uColors[1];
  else if (pick == 2) base = uColors[2];
  else if (pick == 3) base = uColors[3];
  vColor = mix(base, vec3(1.0, 0.95, 0.9), (1.0 - smoothstep(0.0, 0.8, age)) * 0.6);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float d = max(-mv.z, 1.0);
  // Jamais de grosse tache floue près de la caméra : fondu et taille plafonnée
  vAlpha *= smoothstep(uSize * 2.5, uSize * 8.0, d);
  float head = aTrail < 0.5 ? 1.3 : 1.0 - aTrail * 0.15;
  gl_PointSize = clamp(0.16 * uSize * uScale * head * (0.55 + 0.45 * fadeOut) / d, 1.0, 14.0);
  gl_Position = projectionMatrix * mv;
}`

const SOFT_POINT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a = exp(-r * 3.5) * vAlpha;
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <colorspace_fragment>
}`

export type FireworksMaterial = ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uIntensity: { value: number }
    uCenter: { value: Vector3 }
    uSpread: { value: Vector3 }
    uScale: { value: number }
    uSize: { value: number }
    uColors: { value: Color[] }
  }
}

export type FireworksOptions = {
  bursts: number
  particles: number
  /** Taille d'une gerbe (unités) : vitesse, taille des points, gravité. */
  size: number
  colors: readonly [ColorRepresentation, ColorRepresentation, ColorRepresentation, ColorRepresentation]
  seed: number
}

export function createFireworks(options: FireworksOptions): {
  geometry: BufferGeometry
  material: FireworksMaterial
} {
  const TRAIL = 4
  const sparks = options.bursts * options.particles
  const count = sparks * TRAIL
  const slot = new Float32Array(count)
  const dir = new Float32Array(count * 3)
  const rand = new Float32Array(count)
  const trail = new Float32Array(count)
  const random = seeded(options.seed)
  for (let i = 0; i < sparks; i++) {
    slot[i] = Math.floor(i / options.particles)
    // Direction uniforme sur la sphère
    const u = random() * 2 - 1
    const a = random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    dir[i * 3] = s * Math.cos(a)
    dir[i * 3 + 1] = u
    dir[i * 3 + 2] = s * Math.sin(a)
    rand[i] = random()
  }
  // Échantillons de traînée : copies décalées dans le temps de chaque étincelle
  for (let k = 1; k < TRAIL; k++) {
    slot.copyWithin(k * sparks, 0, sparks)
    dir.copyWithin(k * sparks * 3, 0, sparks * 3)
    rand.copyWithin(k * sparks, 0, sparks)
    trail.fill(k, k * sparks, (k + 1) * sparks)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aTrail', new BufferAttribute(trail, 1))
  geometry.setAttribute('aSlot', new BufferAttribute(slot, 1))
  geometry.setAttribute('aDir', new BufferAttribute(dir, 3))
  geometry.setAttribute('aRand', new BufferAttribute(rand, 1))
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uCenter: { value: new Vector3() },
      uSpread: { value: new Vector3(1, 1, 1) },
      uScale: { value: 400 },
      uSize: { value: options.size },
      uColors: { value: options.colors.map((c) => new Color(c)) },
    },
    vertexShader: FIREWORK_VERT,
    fragmentShader: SOFT_POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  }) as FireworksMaterial
  return { geometry, material }
}

// --- Poussière de vitesse ---

const DUST_VERT = /* glsl */ `
attribute vec3 aSeed;
attribute float aEnd;
uniform vec3 uCamera;
uniform vec3 uVelocity;
uniform float uBox;
uniform float uStretch;
uniform float uIntensity;
varying float vAlpha;
void main() {
  vec3 p = uCamera + mod(aSeed * uBox - uCamera + 0.5 * uBox, uBox) - 0.5 * uBox;
  float d = length(p - uCamera);
  vAlpha = smoothstep(4.0, 14.0, d) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, d)) * uIntensity;
  p -= uVelocity * uStretch * aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`

const DUST_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor * vAlpha, 1.0);
  #include <colorspace_fragment>
}`

export type DustMaterial = ShaderMaterial & {
  uniforms: {
    uCamera: { value: Vector3 }
    uVelocity: { value: Vector3 }
    uBox: { value: number }
    uStretch: { value: number }
    uIntensity: { value: number }
    uColor: { value: Color }
  }
}

/** Segments de poussière (LineSegments, coordonnées monde). */
export function createSpeedDust(count: number, box: number): {
  geometry: BufferGeometry
  material: DustMaterial
} {
  const random = seeded(77)
  const seed = new Float32Array(count * 6)
  const end = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const x = random()
    const y = random()
    const z = random()
    for (let k = 0; k < 2; k++) {
      seed[i * 6 + k * 3] = x
      seed[i * 6 + k * 3 + 1] = y
      seed[i * 6 + k * 3 + 2] = z
      end[i * 2 + k] = k
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 6), 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 3))
  geometry.setAttribute('aEnd', new BufferAttribute(end, 1))
  const material = new ShaderMaterial({
    uniforms: {
      uCamera: { value: new Vector3() },
      uVelocity: { value: new Vector3() },
      uBox: { value: box },
      uStretch: { value: 0.05 },
      uIntensity: { value: 0 },
      uColor: { value: new Color('#ffd8ee') },
    },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  }) as DustMaterial
  return { geometry, material }
}

// --- Poussière d'anneau ---

const RING_DUST_VERT = /* glsl */ `
attribute float aPhase;
attribute float aSize;
uniform float uTime;
uniform float uScale;
uniform float uIntensity;
uniform vec3 uColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(-mv.z, 1.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.35 + 0.4 * aPhase) + aPhase * 6.2831);
  vAlpha = twinkle * uIntensity * (1.0 - smoothstep(120.0, 900.0, d));
  vColor = uColor;
  gl_PointSize = max(1.5, aSize * uScale / d);
  gl_Position = projectionMatrix * mv;
}`

export type RingDustMaterial = ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uScale: { value: number }
    uIntensity: { value: number }
    uColor: { value: Color }
  }
}

/** Points dans l'anneau (plan XY local, rayons inner -> outer), épaisseur `thickness`. */
export function createRingDust(
  count: number,
  inner: number,
  outer: number,
  thickness: number,
  color: ColorRepresentation,
): { geometry: BufferGeometry; material: RingDustMaterial } {
  const random = seeded(31)
  const position = new Float32Array(count * 3)
  const phase = new Float32Array(count)
  const size = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(inner * inner + random() * (outer * outer - inner * inner))
    const a = random() * Math.PI * 2
    position[i * 3] = r * Math.cos(a)
    position[i * 3 + 1] = r * Math.sin(a)
    position[i * 3 + 2] = (random() - 0.5) * thickness
    phase[i] = random()
    size[i] = 0.6 + random() * 1.6
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aPhase', new BufferAttribute(phase, 1))
  geometry.setAttribute('aSize', new BufferAttribute(size, 1))
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 400 },
      uIntensity: { value: 1 },
      uColor: { value: new Color(color) },
    },
    vertexShader: RING_DUST_VERT,
    fragmentShader: SOFT_POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  }) as RingDustMaterial
  return { geometry, material }
}

// --- Traînées des réacteurs ---

const TRAIL_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`

const TRAIL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float across = clamp(1.0 - abs(vUv.x * 2.0 - 1.0), 0.0, 1.0);
  float rest = clamp(1.0 - vUv.y, 0.0, 1.0);
  float along = pow(rest, 2.2);
  float a = across * across * along * uIntensity;
  vec3 hot = mix(uColor, vec3(1.0), pow(across, 6.0) * rest * 0.7);
  gl_FragColor = vec4(hot * a, 1.0);
  #include <colorspace_fragment>
}`

export type TrailMaterial = ShaderMaterial & {
  uniforms: { uColor: { value: Color }; uIntensity: { value: number } }
}

/** Deux plans croisés, de z 0 (tuyère) à z 1 (bout de la traînée), largeur 1. */
export function createTrailGeometry(): BufferGeometry {
  const position = new Float32Array([
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1, 0, -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1,
  ])
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  return geometry
}

export function createTrailMaterial(color: ColorRepresentation): TrailMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 1 } },
    vertexShader: TRAIL_VERT,
    fragmentShader: TRAIL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
  }) as TrailMaterial
}

/** Échelle des points (px par unité à 1 unité de distance) pour une hauteur d'écran et un FOV. */
export function pointScale(height: number, fov: number, dpr: number): number {
  return (height * dpr * 0.5) / Math.tan((fov * Math.PI) / 360)
}
