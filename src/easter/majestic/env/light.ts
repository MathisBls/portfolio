// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 4 : contre-jour derrière
// la montagne ; beat 5 : « des faisceaux partent vers le sommet » ; beat 6 : « il renvoie un spectre
// arc-en-ciel immense dans le ciel » ; beat 3 : orage sec dans la poussière) : les lumières, sans React.
// - Rayons crépusculaires : grand disque face caméra posé très loin dans la direction du soleil, testé en
//   profondeur : la montagne le masque, seuls les rayons qui dépassent de sa silhouette restent.
//   Intensité selon l'occultation du soleil (le plus fort quand il frôle la silhouette) et la poussière.
// - Faisceaux du chœur : cônes ouverts instanciés (un draw), de chaque colosse vers le centre du prisme ;
//   aspect volumétrique (plus dense au cœur vu de face), énergie qui monte (bruit), front qui avance.
// - Spectre : sept cônes en éventail depuis le prisme, couleurs du spectre du site, des kilomètres de
//   long ; il s'efface quand l'aurore prend le relais.
// - Halo du prisme : lumière qui se concentre au sommet (faisceaux, ouverture, spectre).
// - Éclairs : un trait brisé dans la poussière, une seule impulsion douce (montée 40 ms, extinction
//   300 ms), au plus un par seconde et jamais plein écran (WCAG 2.3.1) ; la poussière autour s'éclaire
//   localement. Aucun en reduced-motion.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { seeded } from '../../shaders'
import { FINISH, HAZE, NOISE2, UNIFORMS, glsl } from './glsl'
import { type Shared } from './shared'

// --- Rayons crépusculaires ---

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const RAYS_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  FINISH,
  /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = angleOf(p);
  // Rayons : bruit angulaire (périodique : coordonnées sur le cercle), qui tourne à peine
  vec2 ring = vec2(cos(a), sin(a));
  float shafts = fbm2(ring * 6.0 + vec2(uTime * 0.01, 0.0), 4);
  shafts = smoothstep(0.42, 0.78, shafts) + 0.35 * smoothstep(0.55, 0.9, vnoise2(ring * 23.0 + 4.0));
  float falloff = exp(-r * 4.0) * (1.0 - smoothstep(0.55, 1.0, r));
  float core = exp(-r * 18.0);
  vec3 c = uColor * (shafts * falloff * 0.9 + core * 0.6) * uIntensity;
  gl_FragColor = vec4(finishAdd(c), 1.0);
  #include <colorspace_fragment>
}`,
)

export function createRays(shared: Shared): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: new Color('#ffb98c') },
      uIntensity: { value: 0 },
    },
    vertexShader: BILLBOARD_VERT,
    fragmentShader: RAYS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(1, 1), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -400
  return mesh
}

// --- Faisceaux volumétriques (chœur et spectre) ---

/** Cône ouvert le long de +Y, de y = 0 (départ) à y = 1 (arrivée), rayon 1. */
function createBeamGeometry(radial: number): CylinderGeometry {
  const geometry = new CylinderGeometry(1, 1, 1, radial, 6, true)
  geometry.translate(0, 0.5, 0)
  return geometry
}

const BEAM_VERT = glsl(
  NOISE2,
  UNIFORMS,
  /* glsl */ `
attribute vec3 aTint;
uniform float uRadiusStart;
uniform float uRadiusEnd;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vTint;
varying float vAlong;
varying float vLength;
void main() {
  float along = position.y;
  float radius = mix(uRadiusStart, uRadiusEnd, along);
  vec3 local = vec3(position.x * radius, along, position.z * radius);
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 world = m * vec4(local, 1.0);
  vWorld = world.xyz;
  vNormalW = mat3(m) * vec3(position.x, 0.0, position.z);
  vLocal = vec3(position.x, along, position.z);
  vLength = length(mat3(m) * vec3(0.0, 1.0, 0.0));
  vAlong = along;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
)

const BEAM_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  HAZE,
  FINISH,
  /* glsl */ `
uniform float uGrow;
uniform float uIntensity;
uniform float uFlow;
uniform float uFar;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vTint;
varying float vAlong;
varying float vLength;
void main() {
  if (vAlong > uGrow) discard;
  vec3 n = safeNormalize(vNormalW, vec3(1.0, 0.0, 0.0));
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = dist > 1e-3 ? toCam / dist : vec3(0.0, 0.0, 1.0);
  // Plus dense au cœur (on regarde à travers plus de lumière), bords fondus
  float core = abs(dot(n, v));
  float body = core * core * (0.25 + 0.75 * core);
  // Énergie qui file le long du faisceau
  float meters = vAlong * vLength;
  float flow = vnoise(vec3(vLocal.x * 1.6, vLocal.z * 1.6, meters / 45.0 - uTime * uFlow));
  flow = 0.55 + 0.75 * smoothstep(0.3, 0.85, flow);
  // Front lumineux qui avance, départ et bout adoucis
  float head = exp(-sq((vAlong - uGrow) / 0.025)) * 1.5;
  float ends = smoothstep(0.0, 0.02, vAlong) * (1.0 - smoothstep(uFar, 1.0, vAlong));
  // Jamais de grand voile quand la caméra traverse ou frôle un faisceau
  float near = smoothstep(40.0, 520.0, dist);
  float a = body * flow * ends * near * uIntensity * (1.0 + head);
  vec3 c = vTint * a * (1.0 - hazeAmount(vWorld) * 0.7);
  gl_FragColor = vec4(finishAdd(c), 1.0);
  #include <colorspace_fragment>
}`,
)

export type Beams = {
  mesh: InstancedMesh<CylinderGeometry, ShaderMaterial>
  count: number
  dispose: () => void
}

function createBeams(
  shared: Shared,
  count: number,
  tints: readonly Color[],
  options: { radiusStart: number; radiusEnd: number; flow: number; far: number; radial: number },
): Beams {
  const geometry = createBeamGeometry(options.radial)
  const tint = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const c = tints[i % tints.length] ?? new Color(1, 1, 1)
    tint.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('aTint', new InstancedBufferAttribute(tint, 3))
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uRadiusStart: { value: options.radiusStart },
      uRadiusEnd: { value: options.radiusEnd },
      uGrow: { value: 0 },
      uIntensity: { value: 0 },
      uFlow: { value: options.flow },
      uFar: { value: options.far },
    },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
  })
  const mesh = new InstancedMesh(geometry, material, count)
  mesh.frustumCulled = false
  mesh.renderOrder = 30
  return {
    mesh,
    count,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      mesh.dispose()
    },
  }
}

/** Faisceaux du chœur : lumière blanche dorée, des mains et visages vers le prisme. */
export function createChoirBeams(shared: Shared, count: number): Beams {
  return createBeams(shared, count, [new Color('#ffe7c4')], {
    radiusStart: 17,
    radiusEnd: 5,
    flow: 2.2,
    far: 0.97,
    radial: 20,
  })
}

/** Couleurs du spectre (rouge -> violet), comme les rayons Spec0..6 du prisme du site. */
export const SPECTRUM = [
  '#ff2d3d',
  '#ff7a1f',
  '#ffd21f',
  '#3dff7a',
  '#1fd2ff',
  '#3d5bff',
  '#a83dff',
].map((c) => new Color(c))

/** Spectre : sept cônes en éventail, larges et très longs. */
export function createSpectrum(shared: Shared): Beams {
  return createBeams(shared, SPECTRUM.length, SPECTRUM, {
    radiusStart: 10,
    radiusEnd: 700,
    flow: 1.2,
    far: 0.45,
    radial: 24,
  })
}

const Y = new Vector3(0, 1, 0)
const dir = new Vector3()
const quat = new Quaternion()
const scl = new Vector3()
const mtx = new Matrix4()

/** Pose l'exemplaire i du faisceau de `from` vers `to`. */
export function setBeam(beams: Beams, i: number, from: Vector3, to: Vector3): void {
  dir.subVectors(to, from)
  const length = dir.length()
  if (length < 1e-3) {
    scl.set(0, 0, 0)
    mtx.compose(from, quat.identity(), scl)
  } else {
    dir.divideScalar(length)
    quat.setFromUnitVectors(Y, dir)
    scl.set(1, length, 1)
    mtx.compose(from, quat, scl)
  }
  beams.mesh.setMatrixAt(i, mtx)
}

/** Direction du rayon k du spectre (éventail de 22° à 158° dans le plan (X, haut penché vers +Z)). */
export function spectrumDirection(k: number, count: number, out: Vector3): Vector3 {
  const t = count > 1 ? k / (count - 1) : 0.5
  const a = ((22 + 136 * (1 - t)) * Math.PI) / 180
  const upY = 1
  const upZ = 0.32
  const l = Math.hypot(upY, upZ)
  return out.set(Math.cos(a), (Math.sin(a) * upY) / l, (Math.sin(a) * upZ) / l).normalize()
}

// --- Halo du prisme ---

const HALO_FRAG = glsl(
  UNIFORMS,
  FINISH,
  /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float a = exp(-r * r * 9.0) + 0.25 * exp(-r * 3.5) * (1.0 - smoothstep(0.7, 1.0, r));
  gl_FragColor = vec4(finishAdd(uColor * a * uIntensity), 1.0);
  #include <colorspace_fragment>
}`,
)

export function createHalo(shared: Shared): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms: { ...shared, uColor: { value: new Color('#fff1e6') }, uIntensity: { value: 0 } },
    vertexShader: BILLBOARD_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(1, 1), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 31
  return mesh
}

// --- Éclairs ---

const BOLT_SEGMENTS = 48

export type Lightning = {
  lines: LineSegments<BufferGeometry, LineBasicMaterial>
  /** Instant de l'éclair courant, du prochain autorisé, position (pour la poussière). */
  start: number
  next: number
  at: Vector3
  random: () => number
  color: Color
  dispose: () => void
}

export function createLightning(): Lightning {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(BOLT_SEGMENTS * 2 * 3), 3))
  geometry.setDrawRange(0, 0)
  const material = new LineBasicMaterial({
    color: new Color('#e6dcff'),
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const lines = new LineSegments(geometry, material)
  lines.frustumCulled = false
  lines.renderOrder = 25
  return {
    lines,
    start: -10,
    next: 0,
    at: new Vector3(),
    random: seeded(311),
    color: new Color('#e6dcff'),
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}

const points: Vector3[] = Array.from({ length: 34 }, () => new Vector3())
const end = new Vector3()
const branch: Vector3[] = Array.from({ length: 10 }, () => new Vector3())

/** Trait brisé par déplacement du point milieu (sans allocation). */
function zigzag(
  out: Vector3[],
  from: Vector3,
  to: Vector3,
  count: number,
  jitter: number,
  random: () => number,
) {
  const first = out[0]
  const last = out[count - 1]
  if (!first || !last) return
  first.copy(from)
  last.copy(to)
  let step = count - 1
  let amp = jitter
  while (step > 1) {
    const half = step / 2
    for (let i = half; i < count - 1; i += step) {
      const a = out[i - half]
      const b = out[i + half]
      const m = out[i]
      if (!a || !b || !m) continue
      m.addVectors(a, b).multiplyScalar(0.5)
      m.x += (random() - 0.5) * amp
      m.y += (random() - 0.5) * amp * 0.4
      m.z += (random() - 0.5) * amp
    }
    step = half
    amp *= 0.55
  }
}

/** Déclenche un éclair à `at` (haut du nuage) : écrit la géométrie, renvoie le nombre de segments. */
export function strike(l: Lightning, at: Vector3, time: number): void {
  const random = l.random
  l.start = time
  l.at.copy(at)
  end.set(
    at.x + (random() - 0.5) * 260,
    Math.max(at.y - 280 - random() * 260, 15),
    at.z + (random() - 0.5) * 260,
  )
  zigzag(points, at, end, 33, 160, random)
  const position = l.lines.geometry.getAttribute('position') as BufferAttribute
  let s = 0
  for (let i = 0; i < 32 && s < BOLT_SEGMENTS; i++, s++) {
    const a = points[i]
    const b = points[i + 1]
    if (!a || !b) continue
    position.setXYZ(s * 2, a.x, a.y, a.z)
    position.setXYZ(s * 2 + 1, b.x, b.y, b.z)
  }
  // Une branche depuis un point du tiers supérieur
  const root = points[6 + Math.floor(random() * 8)] ?? at
  end.set(
    root.x + (random() - 0.5) * 300,
    root.y - 120 - random() * 160,
    root.z + (random() - 0.5) * 300,
  )
  zigzag(branch, root, end, 9, 70, random)
  for (let i = 0; i < 8 && s < BOLT_SEGMENTS; i++, s++) {
    const a = branch[i]
    const b = branch[i + 1]
    if (!a || !b) continue
    position.setXYZ(s * 2, a.x, a.y, a.z)
    position.setXYZ(s * 2 + 1, b.x, b.y, b.z)
  }
  position.needsUpdate = true
  l.lines.geometry.setDrawRange(0, s * 2)
}

/** Impulsion de l'éclair (0 -> 1 -> 0) : montée 40 ms, extinction 300 ms, une seule. */
export function boltPulse(l: Lightning, time: number): number {
  const t = time - l.start
  if (t < 0 || t > 0.6) return 0
  return t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) / 0.11)
}
