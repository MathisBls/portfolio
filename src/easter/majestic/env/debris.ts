// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 2 : « les cailloux
// commencent à sautiller » ; beat 3 : « des rochers sautent » ; beat 4 : « glissements de terrain,
// cascades de sable, roches qui tombent ») : roches et sable, sans React, instanciés.
// - Cailloux (boîte qui suit la caméra) et rochers (semés dans la zone du séisme) : sauts paraboliques et
//   culbutes calculés dans le vertex shader (cycle haché par exemplaire, gardé selon M.quake) ; aucune
//   mise à jour CPU.
// - Débris des flancs : physique simple calculée au CPU (balistique, rebonds amortis sur le relief de la
//   montagne et de la plaine, roulement, repos puis enfoncement), réserve fixe d'exemplaires, matrices
//   compactées chaque frame (count = vivants). Émission selon M.slide et la vitesse de montée. Bouffées
//   de poussière aux impacts forts.
// - Cascades de sable : particules qui coulent le long des lignes de plus grande pente (chemins dans une
//   texture flottante lue en vertex shader), selon M.slide.
// Formes : Rock_A/B/C de majestic.glb si D3 les passe, sinon roches procédurales (icosaèdres bosselés).
// Éclairage maison (SURFACE_LIGHT : soleil, ciel, ombre de la montagne, lueur des fissures), brume.
// Reduced-motion : ni sauts ni débris en vol ; roches posées autour de la base une fois la montagne levée.
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  NearestFilter,
  NormalBlending,
  type Object3D,
  Points,
  Quaternion,
  RGBAFormat,
  ShaderMaterial,
  Vector3,
} from 'three'
import { seeded } from '../../shaders'
import { MOUNTAIN, QUAKE_ZONE } from '../layout'
import { type DustClouds, spawnPuff } from './dust'
import {
  FINISH,
  GROUND_HEIGHT,
  HAZE,
  MOUNTAIN as MOUNTAIN_GLSL,
  NOISE2,
  SURFACE_LIGHT,
  UNIFORMS,
  glsl,
} from './glsl'
import { type Shared } from './shared'
import {
  type MountainField,
  type PlainState,
  descentPath,
  fieldHeight,
  surfaceHeight,
} from './terrain'

// --- Formes ---

/** Roche procédurale : icosaèdre bosselé, aplati, à facettes (normales par face). */
export function createRockGeometry(seed: number, detail: number): BufferGeometry {
  const random = seeded(seed)
  const base = new IcosahedronGeometry(1, detail)
  const position = base.getAttribute('position')
  const bumps = Array.from({ length: 6 }, () =>
    new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
  )
  const v = new Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    let k = 1
    for (const b of bumps) k += 0.22 * Math.max(0, v.dot(b)) ** 3 - 0.08
    v.multiplyScalar(k * (0.85 + 0.15 * Math.sin(v.x * 7 + v.z * 5 + seed)))
    v.y *= 0.72
    position.setXYZ(i, v.x, v.y, v.z)
  }
  // Polyèdre non indexé : normales par face (facettes)
  base.computeVertexNormals()
  return base
}

/** Géométrie d'un nœud de roche (repère du nœud), normalisée à un rayon ≈ 1. */
function geometryFromNode(node: Object3D): BufferGeometry | null {
  let found: BufferGeometry | null = null
  node.traverse((child) => {
    if (found || !(child instanceof Mesh)) return
    const geometry = (child.geometry as BufferGeometry).clone()
    geometry.computeBoundingSphere()
    const radius = geometry.boundingSphere?.radius ?? 1
    const center = geometry.boundingSphere?.center ?? new Vector3()
    geometry.translate(-center.x, -center.y, -center.z)
    geometry.scale(
      1 / Math.max(radius, 1e-3),
      1 / Math.max(radius, 1e-3),
      1 / Math.max(radius, 1e-3),
    )
    found = geometry
  })
  return found
}

// --- Matériau commun des roches ---

const ROCK_COMMON = glsl(
  NOISE2,
  UNIFORMS,
  GROUND_HEIGHT,
  HAZE,
  MOUNTAIN_GLSL,
  SURFACE_LIGHT,
  FINISH,
)

const ROCK_FRAG = /* glsl */ `
uniform vec3 uRockColor;
uniform vec3 uCrust;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
void main() {
  vec3 n = safeNormalize(vNormalW, vec3(0.0, 1.0, 0.0));
  // Basalte sombre veiné, croûte de sel claire sur les faces tournées vers le haut
  float grain = vnoise(vLocal * 3.1) * 0.6 + vnoise(vLocal * 9.0) * 0.4;
  vec3 albedo = uRockColor * (0.65 + 0.7 * grain);
  albedo = mix(albedo, uCrust, smoothstep(0.55, 0.9, n.y) * 0.45 * grain);
  vec3 color = lightSurface(albedo, n, vWorld);
  color = applyHaze(color, vWorld);
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
}`

/** Cailloux et rochers sautillants : positions dans la boîte de la caméra (uWrap > 0) ou fixes. */
const HOP_VERT = glsl(
  ROCK_COMMON,
  /* glsl */ `
attribute vec4 aSeed;
uniform float uWrap;
uniform vec3 uCamera;
uniform float uHop;
uniform float uSizeScale;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
mat3 rotation(vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;
  return mat3(
    t * axis.x * axis.x + c, t * axis.x * axis.y + s * axis.z, t * axis.x * axis.z - s * axis.y,
    t * axis.x * axis.y - s * axis.z, t * axis.y * axis.y + c, t * axis.y * axis.z + s * axis.x,
    t * axis.x * axis.z + s * axis.y, t * axis.y * axis.z - s * axis.x, t * axis.z * axis.z + c
  );
}
void main() {
  vec2 xz = aSeed.xy;
  float fade = 1.0;
  if (uWrap > 0.0) {
    xz = uCamera.xz + mod(aSeed.xy * uWrap - uCamera.xz + 0.5 * uWrap, uWrap) - 0.5 * uWrap;
    fade = 1.0 - smoothstep(uWrap * 0.3, uWrap * 0.48, length(xz - uCamera.xz));
  }
  float size = aSeed.z * uSizeScale * fade;
  float rate = 1.5 + 1.3 * aSeed.w;
  float t = uTime * rate + aSeed.w * 17.0;
  float cycle = floor(t);
  float phase = fract(t);
  float jumping = step(hash12(vec2(cycle, aSeed.w * 53.0)), uHop);
  float height = jumping * 4.0 * phase * (1.0 - phase) * (0.2 + 0.8 * hash12(vec2(cycle + 3.0, aSeed.x * 7.0)));
  height *= uHop * (0.25 + 0.5 * size);
  vec3 axis = normalize(vec3(aSeed.x - 0.5, 0.6, aSeed.y - 0.5));
  mat3 r = rotation(axis, aSeed.w * 6.2831853 + jumping * phase * 2.4);
  vLocal = position * 1.7 + aSeed.xyz * 13.0;
  vec3 world = vec3(xz.x, groundHeight(xz) + size * 0.32 + height, xz.y) + r * (position * size);
  vWorld = world;
  vNormalW = r * normal;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`,
)

/** Débris des flancs : matrice d'instance écrite par le CPU (physique). */
const FALL_VERT = glsl(
  ROCK_COMMON,
  /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vLocal;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 world = m * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = mat3(m) * normal;
  vLocal = position * 2.3;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
)

function rockMaterial(
  shared: Shared,
  vertexShader: string,
  extra: Record<string, { value: unknown }>,
) {
  return new ShaderMaterial({
    uniforms: {
      ...shared,
      ...extra,
      uRockColor: { value: new Vector3(0.05, 0.042, 0.05) },
      uCrust: { value: new Vector3(0.42, 0.37, 0.4) },
    },
    vertexShader,
    fragmentShader: glsl(ROCK_COMMON, ROCK_FRAG),
    toneMapped: false,
    fog: false,
  })
}

// --- Cailloux et rochers sautillants ---

export type Hoppers = {
  pebbles: Mesh<InstancedBufferGeometry, ShaderMaterial>
  boulders: Mesh<InstancedBufferGeometry, ShaderMaterial>
  dispose: () => void
}

function hopGeometry(source: BufferGeometry, seeds: Float32Array): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', source.getAttribute('position'))
  geometry.setAttribute('normal', source.getAttribute('normal'))
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4))
  geometry.instanceCount = seeds.length / 4
  return geometry
}

export function createHoppers(shared: Shared, rock: BufferGeometry, mobile: boolean): Hoppers {
  const random = seeded(19)
  const pebbleCount = mobile ? 700 : 2400
  const boulderCount = mobile ? 70 : 220
  const pebbleSeeds = new Float32Array(pebbleCount * 4)
  for (let i = 0; i < pebbleCount; i++) {
    // Taille : surtout des cailloux (0.15–0.6 m), quelques pierres (jusqu'à 1.6 m)
    const size = 0.15 + 0.45 * random() + (random() < 0.08 ? random() * 1.1 : 0)
    pebbleSeeds.set([random(), random(), size, random()], i * 4)
  }
  const boulderSeeds = new Float32Array(boulderCount * 4)
  const [qx, , qz] = QUAKE_ZONE.center
  for (let i = 0; i < boulderCount; i++) {
    const a = random() * Math.PI * 2
    const r = Math.sqrt(random()) * QUAKE_ZONE.radius
    boulderSeeds.set(
      [qx + Math.cos(a) * r, qz + Math.sin(a) * r, 1.2 + 3 * random() ** 2, random()],
      i * 4,
    )
  }
  const pebbleMaterial = rockMaterial(shared, HOP_VERT, {
    uWrap: { value: 260 },
    uCamera: { value: new Vector3() },
    uHop: { value: 0 },
    uSizeScale: { value: 1 },
  })
  const boulderMaterial = rockMaterial(shared, HOP_VERT, {
    uWrap: { value: 0 },
    uCamera: { value: new Vector3() },
    uHop: { value: 0 },
    uSizeScale: { value: 1 },
  })
  const pebbleGeometry = hopGeometry(rock, pebbleSeeds)
  const boulderGeometry = hopGeometry(rock, boulderSeeds)
  const pebbles = new Mesh(pebbleGeometry, pebbleMaterial)
  const boulders = new Mesh(boulderGeometry, boulderMaterial)
  pebbles.frustumCulled = false
  boulders.frustumCulled = false
  return {
    pebbles,
    boulders,
    dispose: () => {
      pebbleGeometry.dispose()
      boulderGeometry.dispose()
      pebbleMaterial.dispose()
      boulderMaterial.dispose()
    },
  }
}

// --- Débris des flancs (physique CPU) ---

type Rock = {
  alive: boolean
  p: Vector3
  v: Vector3
  q: Quaternion
  axis: Vector3
  size: number
  rest: number
  sink: number
  age: number
  puff: number
  kind: number
}

export type Falling = {
  meshes: InstancedMesh[]
  rocks: Rock[]
  /** Émission fractionnaire accumulée. */
  pending: number
  random: () => number
  dispose: () => void
}

const KINDS = 3

export function createFalling(shared: Shared, shapes: BufferGeometry[], mobile: boolean): Falling {
  const perKind = mobile ? 40 : 120
  const material = rockMaterial(shared, FALL_VERT, {})
  const meshes = shapes.slice(0, KINDS).map((shape) => {
    const mesh = new InstancedMesh(shape, material, perKind)
    mesh.count = 0
    mesh.frustumCulled = false
    return mesh
  })
  const rocks: Rock[] = []
  for (let i = 0; i < perKind * KINDS; i++) {
    rocks.push({
      alive: false,
      p: new Vector3(),
      v: new Vector3(),
      q: new Quaternion(),
      axis: new Vector3(0, 1, 0),
      size: 1,
      rest: 0,
      sink: 0,
      age: 0,
      puff: 0,
      kind: i % KINDS,
    })
  }
  return {
    meshes,
    rocks,
    pending: 0,
    random: seeded(101),
    dispose: () => {
      material.dispose()
      meshes.forEach((m) => {
        m.dispose()
      })
    },
  }
}

export type FallFrame = {
  time: number
  dt: number
  rise: number
  slide: number
  /** Vitesse de montée de la montagne (m/s), lissée. */
  riseSpeed: number
  /** Azimut (rad, atan2(z, x)) de la caméra vu du centre : on fait tomber du côté visible. */
  facing: number
  plain: PlainState
  reduced: boolean
  /** Débit maximal (roches/s). */
  rate: number
}

const GRAVITY = 9.81
const n = new Vector3()
const dq = new Quaternion()
const scale = new Vector3()
const matrix = new Matrix4()

function terrainNormal(
  field: MountainField,
  plain: PlainState,
  sunk: number,
  x: number,
  z: number,
): Vector3 {
  const e = 6
  const hx =
    surfaceHeight(field, plain, sunk, x + e, z) - surfaceHeight(field, plain, sunk, x - e, z)
  const hz =
    surfaceHeight(field, plain, sunk, x, z + e) - surfaceHeight(field, plain, sunk, x, z - e)
  return n.set(-hx, 2 * e, -hz).normalize()
}

function spawnRock(f: Falling, field: MountainField, frame: FallFrame, sunk: number): void {
  let rock: Rock | null = null
  for (const candidate of f.rocks) {
    if (!candidate.alive) {
      rock = candidate
      break
    }
  }
  if (!rock) return
  const random = f.random
  for (let attempt = 0; attempt < 6; attempt++) {
    const a = frame.facing + (random() - 0.5) * Math.PI * 1.2
    const r = MOUNTAIN.radius * (0.1 + 0.75 * random())
    const x = MOUNTAIN.position[0] + Math.cos(a) * r
    const z = MOUNTAIN.position[2] + Math.sin(a) * r
    const local = fieldHeight(field, x, z)
    const y = local - sunk
    if (local < 40 || y < 30) continue
    const size = 4 + 28 * random() ** 2.2
    rock.alive = true
    rock.size = size
    rock.p.set(x, y + size, z)
    const out = 4 + 9 * random()
    rock.v.set(Math.cos(a) * out, frame.riseSpeed * 0.75 + random() * 5, Math.sin(a) * out)
    rock.axis.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
    rock.q.setFromAxisAngle(rock.axis, random() * Math.PI * 2)
    rock.rest = 0
    rock.sink = 0
    rock.age = 0
    rock.puff = -10
    return
  }
}

/** Avance la physique, émet, écrit les matrices compactées. */
export function updateFalling(
  f: Falling,
  field: MountainField,
  frame: FallFrame,
  clouds: DustClouds | null,
): void {
  const sunk = MOUNTAIN.sunk * (1 - frame.rise)
  const emitting = !frame.reduced && frame.rise > 0.02 && (frame.rise < 0.995 || frame.slide > 0.05)
  if (emitting) {
    f.pending += frame.dt * frame.rate * Math.max(frame.slide, Math.min(1, frame.riseSpeed / 40))
    while (f.pending >= 1) {
      f.pending -= 1
      spawnRock(f, field, frame, sunk)
    }
  }
  const counts = [0, 0, 0]
  const steps = 2
  const dt = frame.dt / steps
  for (const rock of f.rocks) {
    if (!rock.alive) continue
    if (frame.reduced) {
      rock.alive = false
      continue
    }
    for (let s = 0; s < steps; s++) {
      rock.age += dt
      rock.v.y -= GRAVITY * dt
      rock.p.addScaledVector(rock.v, dt)
      const ground = surfaceHeight(field, frame.plain, sunk, rock.p.x, rock.p.z)
      const bottom = rock.p.y - rock.size * 0.55
      if (bottom < ground) {
        const normal = terrainNormal(field, frame.plain, sunk, rock.p.x, rock.p.z)
        rock.p.y = ground + rock.size * 0.55 - rock.sink
        const vn = rock.v.dot(normal)
        if (vn < 0) {
          rock.v.addScaledVector(normal, -1.35 * vn)
          rock.v.multiplyScalar(0.86)
          if (-vn > 9 && clouds && frame.time - rock.puff > 0.7) {
            rock.puff = frame.time
            spawnPuff(clouds, rock.p.x, ground, rock.p.z, frame.time, rock.size * 3 + -vn * 1.2)
          }
        }
        // Sur la plaine, presque arrêtée : repos puis enfoncement
        const speed = rock.v.length()
        if (fieldHeight(field, rock.p.x, rock.p.z) < 5 && speed < 2.5) {
          rock.v.multiplyScalar(0.9)
          rock.rest += dt
        }
      }
    }
    if (rock.rest > 4) rock.sink += frame.dt * rock.size * 0.12
    // Roulement : rotation proportionnelle à la vitesse
    const spin = (rock.v.length() / Math.max(rock.size, 0.5)) * frame.dt
    dq.setFromAxisAngle(rock.axis, spin)
    rock.q.multiply(dq)
    if (rock.sink > rock.size * 1.2 || rock.age > 30) {
      rock.alive = false
      continue
    }
    const mesh = f.meshes[rock.kind]
    const index = counts[rock.kind] ?? 0
    if (!mesh) continue
    scale.setScalar(rock.size)
    matrix.compose(rock.p, rock.q, scale)
    mesh.setMatrixAt(index, matrix)
    counts[rock.kind] = index + 1
  }
  f.meshes.forEach((mesh, k) => {
    mesh.count = counts[k] ?? 0
    mesh.instanceMatrix.needsUpdate = true
  })
}

/** Reduced-motion : roches posées autour de la base (plan fixe de la montagne levée). */
export function placeResting(
  f: Falling,
  field: MountainField,
  rise: number,
  plain: PlainState,
): void {
  const random = seeded(203)
  const counts = [0, 0, 0]
  const sunk = MOUNTAIN.sunk * (1 - rise)
  const visible = rise > 0.6
  f.rocks.forEach((rock, i) => {
    if (!visible || i % 3 !== 0) return
    const a = random() * Math.PI * 2
    const r = MOUNTAIN.radius * (0.9 + random() * 0.5)
    const x = MOUNTAIN.position[0] + Math.cos(a) * r
    const z = MOUNTAIN.position[2] + Math.sin(a) * r
    const size = 3 + 14 * random() ** 2
    rock.p.set(x, surfaceHeight(field, plain, sunk, x, z) + size * 0.3, z)
    rock.q.setFromAxisAngle(
      rock.axis.set(random() - 0.5, 1, random() - 0.5).normalize(),
      random() * 6,
    )
    const mesh = f.meshes[rock.kind]
    const index = counts[rock.kind] ?? 0
    if (!mesh) return
    scale.setScalar(size)
    matrix.compose(rock.p, rock.q, scale)
    mesh.setMatrixAt(index, matrix)
    counts[rock.kind] = index + 1
  })
  f.meshes.forEach((mesh, k) => {
    mesh.count = counts[k] ?? 0
    mesh.instanceMatrix.needsUpdate = true
  })
}

/** Géométries des débris : nœuds Rock_A/B/C si fournis, sinon procédurales. */
export function rockShapes(
  nodes: readonly (Object3D | undefined)[],
): [BufferGeometry, BufferGeometry, BufferGeometry] {
  const shape = (k: number) => {
    const node = nodes[k]
    const fromNode = node ? geometryFromNode(node) : null
    return fromNode ?? createRockGeometry(41 + k * 17, 1)
  }
  return [shape(0), shape(1), shape(2)]
}

// --- Cascades de sable ---

const CASCADE_POINTS = 32

const CASCADE_VERT = glsl(
  NOISE2,
  UNIFORMS,
  HAZE,
  MOUNTAIN_GLSL,
  /* glsl */ `
attribute vec4 aFlow;
uniform sampler2D uPaths;
uniform float uCascade;
uniform float uSunk;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
varying float vHaze;
varying vec3 vHazeColor;
void main() {
  float s = fract(uTime * (0.035 + 0.02 * aFlow.y) + aFlow.y);
  // Le sable accélère en descendant
  float along = s * s * (3.0 - 2.0 * s) * 0.4 + s * 0.6;
  float idx = along * float(${CASCADE_POINTS - 1});
  int i0 = int(floor(idx));
  int i1 = min(i0 + 1, ${CASCADE_POINTS - 1});
  float f = idx - float(i0);
  int row = int(aFlow.x);
  vec3 a = texelFetch(uPaths, ivec2(i0, row), 0).xyz;
  vec3 b = texelFetch(uPaths, ivec2(i1, row), 0).xyz;
  vec3 p = mix(a, b, f);
  p.y -= uSunk;
  vec2 radial = length(p.xz) > 1.0 ? normalize(p.xz) : vec2(1.0, 0.0);
  vec2 side = vec2(-radial.y, radial.x);
  float spread = 6.0 + 26.0 * along;
  p.xz += radial * (5.0 + 8.0 * aFlow.w) + side * (aFlow.z - 0.5) * spread;
  p.y += 3.0 + 10.0 * aFlow.w * along;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float d = max(-mv.z, 1.0);
  vec3 view = (p - cameraPosition) / max(length(p - cameraPosition), 1e-3);
  float forward = pow(max(dot(view, uSunDir), 0.0), 5.0);
  vColor = vec3(0.55, 0.42, 0.42) * (uSkyAmbient * 2.0 + uSunColor * (0.3 + 1.4 * forward) * mountainClear(p, uSunDir));
  vAlpha = uCascade * smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.8, 1.0, s)) * step(2.0, p.y);
  vHaze = hazeAmount(p);
  vHazeColor = horizonColor(view);
  gl_PointSize = clamp((5.0 + 9.0 * aFlow.w) * uScale / d, 1.0, 48.0);
  gl_Position = projectionMatrix * mv;
  if (vAlpha <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`,
)

const CASCADE_FRAG = glsl(
  UNIFORMS,
  FINISH,
  /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vHaze;
varying vec3 vHazeColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a = exp(-r * 3.0) * vAlpha * 0.45;
  vec3 c = mix(vColor, vHazeColor, vHaze);
  gl_FragColor = vec4(finish(c), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`,
)

export type Cascades = {
  points: Points<BufferGeometry, ShaderMaterial>
  texture: DataTexture
  /** Bas de chaque chemin (repère local, montagne dressée), pour les bouffées. */
  ends: Float32Array
  paths: number
  dispose: () => void
}

export function createCascades(
  shared: Shared,
  field: MountainField,
  facing: number,
  mobile: boolean,
): Cascades {
  const random = seeded(57)
  const wanted = mobile ? 10 : 26
  const perPath = mobile ? 90 : 140
  const data = new Float32Array(CASCADE_POINTS * wanted * 4)
  const ends = new Float32Array(wanted * 3)
  let paths = 0
  for (let attempt = 0; attempt < wanted * 8 && paths < wanted; attempt++) {
    const a = facing + (random() - 0.5) * Math.PI * 1.5
    const r = MOUNTAIN.radius * (0.08 + 0.4 * random())
    const path = descentPath(field, Math.cos(a) * r, Math.sin(a) * r, CASCADE_POINTS)
    if (!path) continue
    for (let k = 0; k < CASCADE_POINTS; k++) {
      data.set(
        [path[k * 3] ?? 0, path[k * 3 + 1] ?? 0, path[k * 3 + 2] ?? 0, 1],
        (paths * CASCADE_POINTS + k) * 4,
      )
    }
    const last = (CASCADE_POINTS - 1) * 3
    ends.set([path[last] ?? 0, path[last + 1] ?? 0, path[last + 2] ?? 0], paths * 3)
    paths++
  }
  const texture = new DataTexture(data, CASCADE_POINTS, Math.max(paths, 1), RGBAFormat, FloatType)
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  const count = paths * perPath
  const flow = new Float32Array(Math.max(count, 1) * 4)
  for (let i = 0; i < count; i++) {
    flow.set([Math.floor(i / perPath), random(), random(), random()], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(Math.max(count, 1) * 3), 3),
  )
  geometry.setAttribute('aFlow', new BufferAttribute(flow, 4))
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uPaths: { value: texture },
      uCascade: { value: 0 },
      uSunk: { value: MOUNTAIN.sunk },
      uScale: { value: 600 },
    },
    vertexShader: CASCADE_VERT,
    fragmentShader: CASCADE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 18
  return {
    points,
    texture,
    ends,
    paths,
    dispose: () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
