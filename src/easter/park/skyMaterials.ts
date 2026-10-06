// Easter egg v3, beat 8 (docs/storyboards/easter-park.md ; consigne de Mathis : nébuleuse colorée en
// couches, rayons crépusculaires et léger lens flare quand le soleil passe derrière une planète) :
// matériaux du ciel, sans React.
// - Ciel : sphère centrée sur la caméra, Voie lactée équirectangulaire (SKY, textures.ts) inclinée en
//   diagonale, nébuleuse en trois couches de bruit additives (magenta, violet, cyan) dans une région du
//   ciel, soleil (disque et halo) ; dessinée en premier, sans écrire la profondeur.
// - Rayons : grand disque face caméra posé loin dans la direction du soleil, derrière les planètes (le
//   test de profondeur les masque) : seuls les rayons qui dépassent du limbe restent, comme des rayons
//   crépusculaires. Intensité réglée par l'occultation (occlusion.ts).
// - Flare : quelques reflets d'objectif sur l'axe soleil -> centre de l'écran, plus une traînée
//   anamorphique, en espace écran ; intensité nulle si le soleil est caché ou hors champ.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix3,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
} from 'three'
import { NOISE } from './glsl'

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const SKY_FRAG = /* glsl */ `
uniform sampler2D uSky;
uniform float uHasSky;
uniform float uSkyGain;
uniform mat3 uSkyRotation;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uNebulaA;
uniform vec3 uNebulaB;
uniform vec3 uNebulaC;
uniform vec3 uNebulaDir;
uniform float uNebulaGain;
uniform int uOctaves;
varying vec3 vDir;
${NOISE}
void main() {
  vec3 dir = normalize(vDir);
  vec3 g = uSkyRotation * dir;
  vec2 uv = vec2(atan(g.z, g.x) / 6.2831853 + 0.5, asin(clamp(g.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec3 color = uHasSky > 0.5 ? texture2D(uSky, uv).rgb * uSkyGain : vec3(0.0);
  // Nébuleuse : nuages, filaments et voiles en couches additives, découpés par des bandes de poussière,
  // dans deux régions du ciel (magenta et violet d'un côté, cyan de l'autre)
  float region = smoothstep(-0.2, 0.8, dot(dir, uNebulaDir));
  float other = smoothstep(0.1, 0.9, dot(dir, -uNebulaDir * vec3(1.0, -0.4, 1.0)));
  vec3 q = dir + 0.35 * vec3(fbm(dir * 2.0 + 4.0, 3), fbm(dir * 2.0 + 9.0, 3), fbm(dir * 2.0 + 1.0, 3));
  float a = fbm(q * 1.5 + vec3(0.0, 0.0, 3.0), uOctaves);
  float b = fbm(q * 3.1 + vec3(5.2, 1.3, 0.0), uOctaves);
  float c = fbm(q * 6.3 - vec3(2.0), uOctaves);
  float cloud = smoothstep(0.42, 0.78, a);
  float filaments = smoothstep(0.52, 0.72, b) * cloud;
  float wisps = smoothstep(0.55, 0.75, c) * smoothstep(0.4, 0.65, a);
  vec3 nebula = mix(uNebulaB, uNebulaA, smoothstep(0.35, 0.7, b)) * cloud * 0.32;
  nebula += uNebulaA * filaments * 0.42 + mix(uNebulaA, vec3(1.0, 0.85, 0.95), 0.4) * wisps * 0.18;
  nebula *= 0.25 + 0.75 * smoothstep(0.32, 0.62, fbm(q * 4.2 + vec3(9.0), uOctaves));
  vec3 cold = uNebulaC * smoothstep(0.45, 0.8, b) * smoothstep(0.4, 0.7, a) * 0.22;
  color += (nebula * region + cold * other) * uNebulaGain;
  // Soleil : disque, couronne, halo large
  float s = max(dot(dir, normalize(uSunDir)), 0.0);
  color += uSunColor * (pow(s, 3000.0) * 60.0 + pow(s, 220.0) * 1.6 + pow(s, 14.0) * 0.12);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`

export type SkyMaterial = ShaderMaterial & {
  uniforms: {
    uSky: { value: Texture | null }
    uHasSky: { value: number }
    uSkyGain: { value: number }
    uSkyRotation: { value: Matrix3 }
    uSunDir: { value: Vector3 }
    uSunColor: { value: Color }
    uNebulaA: { value: Color }
    uNebulaB: { value: Color }
    uNebulaC: { value: Color }
    uNebulaDir: { value: Vector3 }
    uNebulaGain: { value: number }
    uOctaves: { value: number }
  }
}

/** Ciel du parc. `mobile` : bruit à 3 octaves au lieu de 5. */
export function createSkyMaterial(sunDir: Vector3, mobile: boolean): SkyMaterial {
  // Voie lactée inclinée de ≈ 35° : elle traverse l'écran en diagonale
  const rotation = new Matrix3().set(0.82, -0.57, 0, 0.57, 0.82, 0, 0, 0, 1)
  return new ShaderMaterial({
    uniforms: {
      uSky: { value: null },
      uHasSky: { value: 0 },
      uSkyGain: { value: 0.9 },
      uSkyRotation: { value: rotation },
      uSunDir: { value: sunDir },
      uSunColor: { value: new Color('#fff1de') },
      uNebulaA: { value: new Color('#ff3d9a') },
      uNebulaB: { value: new Color('#6a2cff') },
      uNebulaC: { value: new Color('#33d6ff') },
      uNebulaDir: { value: new Vector3(-0.55, 0.3, -0.78).normalize() },
      uNebulaGain: { value: 1 },
      uOctaves: { value: mobile ? 3 : 5 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthWrite: false,
    fog: false,
  }) as SkyMaterial
}

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const RAYS_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x) + uTime * 0.004;
  float rays = 0.0;
  rays += pow(max(0.5 + 0.5 * sin(a * 13.0), 0.0), 6.0);
  rays += pow(max(0.5 + 0.5 * sin(a * 29.0 + 1.3), 0.0), 10.0) * 0.8;
  rays += pow(max(0.5 + 0.5 * sin(a * 7.0 + 2.1), 0.0), 4.0) * 0.6;
  float shafts = rays * exp(-r * 3.2) * (1.0 - smoothstep(0.6, 1.0, r));
  float glow = exp(-r * 9.0) * 0.8;
  gl_FragColor = vec4(uColor * (shafts * 0.55 + glow) * uIntensity, 1.0);
  #include <colorspace_fragment>
}`

export type GlowLike = ShaderMaterial & {
  uniforms: { uColor: { value: Color }; uIntensity: { value: number }; uTime: { value: number } }
}

/** Rayons crépusculaires (disque face caméra, additif, testé en profondeur). */
export function createRaysMaterial(): GlowLike {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#ffd9b0') },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: BILLBOARD_VERT,
    fragmentShader: RAYS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  }) as GlowLike
}

// --- Flare : quads en espace écran, placés le long de l'axe soleil -> centre ---

const FLARE_VERT = /* glsl */ `
attribute vec2 corner;
attribute float along;
attribute float size;
attribute float shape;
attribute vec3 tint;
uniform vec2 uSun;
uniform float uAspect;
varying vec2 vUv;
varying float vShape;
varying vec3 vTint;
void main() {
  vUv = corner;
  vShape = shape;
  vTint = tint;
  vec2 center = uSun * (1.0 - 2.0 * along);
  vec2 extent = shape > 2.5 ? vec2(size * 6.0, size * 0.18) : vec2(size, size);
  vec2 offset = corner * extent * vec2(1.0 / uAspect, 1.0);
  gl_Position = vec4(center + offset, 0.0, 1.0);
}`

const FLARE_FRAG = /* glsl */ `
uniform float uIntensity;
varying vec2 vUv;
varying float vShape;
varying vec3 vTint;
void main() {
  float r = length(vUv);
  float a;
  if (vShape < 0.5) {
    a = 1.0 - smoothstep(0.0, 1.0, r);
    a *= a;
  } else if (vShape < 1.5) {
    a = (1.0 - smoothstep(0.85, 1.0, r)) * smoothstep(0.55, 0.8, r) * 0.45;
  } else if (vShape < 2.5) {
    vec2 q = abs(vUv);
    float hex = max(q.x * 0.866 + q.y * 0.5, q.y);
    a = (1.0 - smoothstep(0.82, 1.0, hex)) * 0.7;
  } else {
    a = exp(-abs(vUv.y) * 5.0) * (1.0 - smoothstep(0.0, 1.0, abs(vUv.x)));
  }
  gl_FragColor = vec4(vTint * a * uIntensity, 1.0);
  #include <colorspace_fragment>
}`

export type FlareMaterial = ShaderMaterial & {
  uniforms: { uSun: { value: Vector2 }; uAspect: { value: number }; uIntensity: { value: number } }
}

/** Éléments du flare : position sur l'axe (0 soleil, 1 symétrique), taille (NDC), forme, teinte. */
const FLARES: readonly (readonly [number, number, number, string])[] = [
  [0, 0.14, 0, '#ffe8cc'],
  [0, 0.1, 3, '#ffd2ea'],
  [0.3, 0.03, 2, '#ff7ac0'],
  [0.55, 0.022, 0, '#6fe3ff'],
  [0.72, 0.06, 2, '#ff9bd2'],
  [0.95, 0.09, 1, '#9b7bff'],
]

export function createFlare(): { geometry: BufferGeometry; material: FlareMaterial } {
  const corners = [-1, -1, 1, -1, 1, 1, -1, 1]
  const count = FLARES.length
  const corner = new Float32Array(count * 8)
  const along = new Float32Array(count * 4)
  const size = new Float32Array(count * 4)
  const shape = new Float32Array(count * 4)
  const tint = new Float32Array(count * 12)
  const position = new Float32Array(count * 12)
  const index: number[] = []
  const color = new Color()
  FLARES.forEach(([t, s, form, hex], i) => {
    color.set(hex)
    for (let c = 0; c < 4; c++) {
      const v = i * 4 + c
      corner[v * 2] = corners[c * 2] ?? 0
      corner[v * 2 + 1] = corners[c * 2 + 1] ?? 0
      along[v] = t
      size[v] = s
      shape[v] = form
      tint[v * 3] = color.r
      tint[v * 3 + 1] = color.g
      tint[v * 3 + 2] = color.b
    }
    const o = i * 4
    index.push(o, o + 1, o + 2, o, o + 2, o + 3)
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('corner', new BufferAttribute(corner, 2))
  geometry.setAttribute('along', new BufferAttribute(along, 1))
  geometry.setAttribute('size', new BufferAttribute(size, 1))
  geometry.setAttribute('shape', new BufferAttribute(shape, 1))
  geometry.setAttribute('tint', new BufferAttribute(tint, 3))
  geometry.setIndex(index)
  const material = new ShaderMaterial({
    uniforms: {
      uSun: { value: new Vector2() },
      uAspect: { value: 1 },
      uIntensity: { value: 0 },
    },
    vertexShader: FLARE_VERT,
    fragmentShader: FLARE_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  }) as FlareMaterial
  return { geometry, material }
}

/** Branche la Voie lactée chargée sur le ciel. */
export function setSkyMap(material: SkyMaterial, texture: Texture): void {
  material.uniforms.uSky.value = texture
  material.uniforms.uHasSky.value = 1
}
