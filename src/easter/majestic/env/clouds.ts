// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 1 : « plasma orange et
// rose autour de la verrière, vibration, nuages traversés » ; beat 7 : « Le vaisseau s'élève au-dessus
// des nuages, avec la silhouette de la montagne sous l'aurore ») : nuages et plasma, sans React.
// - Nuages : couche entre CLOUDS.base et CLOUDS.top (layout.ts) faite de tranches horizontales empilées
//   (une InstancedMesh, triées de loin en près à chaque frame) ; bruit fbm en coordonnées monde, profil
//   de cumulus, dessus doré par le soleil rasant, dessous violacé, liseré à contre-jour, reflet de
//   l'aurore. Denses à l'entrée (on les traverse), éparses au-dessus de la plaine, puis la mer de nuages
//   de la sortie avec une trouée au-dessus de la montagne (la montagne et le spectre restent visibles).
// - Plasma : quad plein écran posé à 3 m devant l'œil (derrière la verrière et le cadre du cockpit, qui
//   le masquent), flux radial de bruit additif orange, rose et blanc chaud sur les bords, plus fort en
//   bas (bouclier) ; centre dégagé. Vibration légère (pas en reduced-motion).
import {
  AdditiveBlending,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type Vector3,
} from 'three'
import { CLOUDS } from '../layout'
import { AURORA, CLOUD_LAYER, FINISH, HAZE, NOISE2, UNIFORMS, glsl } from './glsl'
import { type Shared } from './shared'

const SLICE_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  #ifdef USE_INSTANCING
  world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #endif
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const SLICE_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  AURORA,
  HAZE,
  CLOUD_LAYER,
  FINISH,
  /* glsl */ `
uniform float uHole;
uniform float uCloudOpacity;
varying vec3 vWorld;
void main() {
  float h = clamp((vWorld.y - ${CLOUDS.base.toFixed(1)}) / ${(CLOUDS.top - CLOUDS.base).toFixed(1)}, 0.0, 1.0);
  // Profil de cumulus : plus dense au milieu de la couche, bords haut et bas plus rares ; léger
  // décalage par tranche (pas de copies empilées)
  float profile = 1.0 - sq(2.0 * h - 1.0) * 0.6;
  float far = length(vWorld.xz - cameraPosition.xz);
  float d = cloudDensity(vWorld.xz + vec2(h * 140.0, -h * 90.0), profile, 1.0 - smoothstep(9000.0, 22000.0, far));
  float hole = uHole * (1.0 - smoothstep(1500.0, 3200.0, length(vWorld.xz)));
  d -= hole * 0.5;
  float alpha = smoothstep(0.0, 0.1, d) * uCloudOpacity;
  if (alpha <= 0.002) discard;
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 view = dist > 1e-3 ? -toCam / dist : vec3(0.0, 0.0, -1.0);
  // Jamais de plan net : ni quand la caméra traverse la couche, ni vu par la tranche
  alpha *= smoothstep(30.0, 320.0, dist) * smoothstep(0.02, 0.16, abs(view.y)) * 0.55;
  vec3 color = cloudLight(d, view, h);
  color += aurora(vec3(0.0, 1.0, 0.0), 0.5) * 0.08 * h;
  color = applyHaze(color, vWorld);
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha);
}`,
)

export type Clouds = {
  mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>
  heights: number[]
  order: number[]
  dispose: () => void
}

export function createClouds(shared: Shared, mobile: boolean): Clouds {
  const slices = mobile ? 4 : 6
  const geometry = new PlaneGeometry(1, 1)
  geometry.rotateX(-Math.PI / 2)
  const material = new ShaderMaterial({
    uniforms: { ...shared },
    defines: { CLOUD_OCTAVES: mobile ? 3 : 4, AURORA_STEPS: 4 },
    vertexShader: SLICE_VERT,
    fragmentShader: SLICE_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
  })
  const mesh = new InstancedMesh(geometry, material, slices)
  mesh.frustumCulled = false
  mesh.renderOrder = 10
  const heights = Array.from(
    { length: slices },
    (_, i) => CLOUDS.base + ((i + 0.5) / slices) * (CLOUDS.top - CLOUDS.base),
  )
  return {
    mesh,
    heights,
    order: heights.map((_, i) => i),
    dispose: () => {
      geometry.dispose()
      material.dispose()
      mesh.dispose()
    },
  }
}

const slice = new Matrix4()

/** Tranches centrées sur la caméra, triées de la plus lointaine à la plus proche (en altitude). */
export function placeClouds(clouds: Clouds, camera: Vector3, size: number): void {
  const { order, heights } = clouds
  // Tri par insertion (8 éléments, presque trié d'une frame à l'autre, sans allocation)
  for (let i = 1; i < order.length; i++) {
    const current = order[i] ?? 0
    const key = Math.abs((heights[current] ?? 0) - camera.y)
    let j = i - 1
    while (j >= 0 && Math.abs((heights[order[j] ?? 0] ?? 0) - camera.y) < key) {
      order[j + 1] = order[j] ?? 0
      j--
    }
    order[j + 1] = current
  }
  order.forEach((k, i) => {
    slice.makeScale(size, 1, size)
    slice.setPosition(camera.x, heights[k] ?? 0, camera.z)
    clouds.mesh.setMatrixAt(i, slice)
  })
  clouds.mesh.instanceMatrix.needsUpdate = true
}

// --- Plasma de l'entrée atmosphérique ---

const PLASMA_VERT = /* glsl */ `
uniform float uDepth;
varying vec2 vUv;
void main() {
  vUv = position.xy;
  vec4 clip = projectionMatrix * vec4(0.0, 0.0, -uDepth, 1.0);
  gl_Position = vec4(position.xy * clip.w, clip.z, clip.w);
}`

const PLASMA_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  FINISH,
  /* glsl */ `
uniform float uEntry;
uniform float uAspect;
uniform float uPlasmaTime;
uniform vec2 uJitter;
varying vec2 vUv;
void main() {
  vec2 p = vUv + uJitter;
  vec2 e = p * vec2(uAspect, 1.0);
  float r = length(e);
  vec2 dir = r > 1e-4 ? e / r : vec2(0.0, 1.0);
  // Cadre : les bords de l'écran (ellipse), plus fort en bas (bouclier thermique), centre dégagé
  float frame = length(p) + max(-p.y, 0.0) * 0.3;
  float mask = smoothstep(0.45, 1.25, frame);
  // Langues de plasma : bruit turbulent (domaine tordu) qui file vers les bords, courtes et vives
  float flow = log(r + 0.05) * 1.5 - uPlasmaTime * 2.4;
  vec3 q = vec3(dir * 3.2, flow);
  vec3 bend = vec3(fbm(q * 0.9 + 2.0, 3), fbm(q * 0.9 + 9.0, 3), 0.0) - vec3(0.5, 0.5, 0.0);
  float tongues = fbm(vec3((dir + bend.xy * 0.45) * 6.5, flow * 1.4), 4);
  tongues = smoothstep(0.42, 0.82, tongues);
  float sheath = fbm(q + vec3(0.0, 0.0, 4.0), 3);
  float heat = (tongues * (0.45 + 0.9 * sheath) + 0.35 * sheath) * mask * mask;
  vec3 c = mix(vec3(0.42, 0.03, 0.4), vec3(1.0, 0.18, 0.48), smoothstep(0.04, 0.3, heat));
  c = mix(c, vec3(1.0, 0.48, 0.1), smoothstep(0.28, 0.65, heat));
  c = mix(c, vec3(1.0, 0.9, 0.72), smoothstep(0.6, 0.95, heat));
  float shock = exp(-sq((p.y + 1.08) / 0.32)) * (0.6 + 0.4 * sheath);
  // Le plasma éclaire tout le cockpit d'une lueur orangée
  vec3 color = c * heat * 2.6 + vec3(1.0, 0.4, 0.3) * shock * 0.5 + vec3(1.0, 0.35, 0.2) * 0.03;
  gl_FragColor = vec4(finishAdd(color * uEntry), 1.0);
  #include <colorspace_fragment>
}`,
)

// --- Voile : la caméra dans la couche de nuages ---

const VEIL_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  FINISH,
  /* glsl */ `
uniform float uVeil;
uniform float uVeilTime;
uniform float uAspect;
uniform vec3 uCloudSun;
uniform vec3 uCloudTint;
varying vec2 vUv;
void main() {
  vec2 p = vUv * vec2(uAspect, 1.0);
  // Mèches qui défilent lentement (aucune variation rapide de luminosité)
  float wisps = fbm(vec3(p * 1.6, uVeilTime * 0.25), 4);
  float a = uVeil * clamp(0.55 + 0.7 * (wisps - 0.45), 0.0, 1.0) * 0.9;
  vec3 color = uCloudTint * (uSkyAmbient * 3.0 + uCloudSun * (0.45 + 0.4 * (vUv.y * 0.5 + 0.5)));
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * a, a);
}`,
)

export function createVeil(shared: Shared): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms: { ...shared, uAspect: { value: 1 }, uDepth: { value: 2.5 }, uVeilTime: { value: 0 } },
    vertexShader: PLASMA_VERT,
    fragmentShader: VEIL_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    blending: NormalBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 890
  return mesh
}

export function createPlasma(shared: Shared): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uEntry: { value: 0 },
      uAspect: { value: 1 },
      uPlasmaTime: { value: 0 },
      uDepth: { value: 3 },
      uJitter: { value: new Vector2() },
    },
    vertexShader: PLASMA_VERT,
    fragmentShader: PLASMA_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  mesh.renderOrder = 900
  return mesh
}
