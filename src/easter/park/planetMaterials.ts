// Easter egg v3, beat 8 (docs/storyboards/easter-park.md : « une géante gazeuse réaliste, teintée magenta
// et violet, avec des anneaux », lune rocheuse, planète des cartes ; consigne de Mathis : rendu de
// cinéma) : matériaux des planètes, sans React.
// - Surface : texture (textures.ts) ramenée à sa luminance puis à la palette du tableau (ombre, teinte,
//   lumière), éclairage du soleil à terminateur doux et doré, assombrissement du limbe, diffusion de
//   l'atmosphère sur le disque (plus forte côté soleil, et à contre-jour), lumières de nuit (carte
//   émissive teintée, côté nuit seulement), ombre des anneaux sur la planète, brume de distance.
// - Atmosphère : coquille additive (face arrière) ; densité selon l'altitude du rayon de vue au plus
//   près de la planète : halo épais côté soleil, frange dorée au terminateur, diffusion vers l'avant
//   quand le soleil est derrière la planète.
// - Anneaux : bande radiale (u = rayon), teintée, éclairés côté soleil, translucides à contre-jour,
//   ombre de la planète (intersection rayon-sphère).
// Valeurs en linéaire ; textures en sRGB. Brouillard de la scène ignoré (fog: false) : brume propre.
import {
  AdditiveBlending,
  BackSide,
  Color,
  type ColorRepresentation,
  DoubleSide,
  ShaderMaterial,
  type Texture,
  Vector3,
  Vector4,
} from 'three'
import { HAZE, NOISE } from './glsl'

export type Palette = {
  /** Ombres, teinte moyenne, lumières de la surface (remappage de la luminance de la texture). */
  deep: ColorRepresentation
  mid: ColorRepresentation
  light: ColorRepresentation
  /** Atmosphère (côté jour), frange du terminateur, lumières de nuit. */
  atmo: ColorRepresentation
  gold: ColorRepresentation
  night: ColorRepresentation
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vCenterW;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vCenterW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const SURFACE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform sampler2D uNight;
uniform float uHasNight;
uniform float uNightGain;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uAtmo;
uniform vec3 uGold;
uniform vec3 uNightColor;
uniform float uContrast;
uniform float uAtmoGain;
uniform float uRadius;
uniform vec4 uRing;
uniform vec3 uRingNormal;
uniform sampler2D uRingMap;
uniform float uHasRingMap;
uniform float uFlip;
uniform float uAmbient;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vCenterW;
${NOISE}
${HAZE}

vec3 palette(float l) {
  return l < 0.5 ? mix(uDeep, uMid, l * 2.0) : mix(uMid, uLight, l * 2.0 - 1.0);
}

float ringDensity(float u) {
  if (u < 0.0 || u > 1.0) return 0.0;
  if (uHasRingMap > 0.5) return texture2D(uRingMap, vec2(u, 0.5)).a;
  float bands = 0.55 + 0.45 * sin(u * 60.0) * sin(u * 23.0 + 1.0);
  return bands * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.85, 1.0, u)) * 0.8;
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(uSunDir);
  float ndl = dot(N, L);
  vec2 uv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlip));
  float lum;
  if (uHasMap > 0.5) {
    lum = dot(texture2D(uMap, uv).rgb, vec3(0.299, 0.587, 0.114));
  } else {
    vec3 p = N * 2.0;
    float warp = fbm(p * 1.5, 3);
    lum = 0.5 + 0.5 * sin(uv.y * 38.0 + warp * 6.0) * 0.6 + (fbm(p * 4.0, 3) - 0.5) * 0.5;
  }
  lum = clamp(pow(clamp(lum, 0.0, 1.0), uContrast), 0.0, 1.0);
  vec3 albedo = palette(lum);
  // Terminateur doux, frange dorée, limbe assombri
  float day = smoothstep(-0.06, 0.42, ndl);
  float fq = (ndl - 0.05) / 0.12;
  float fringe = exp(-fq * fq);
  float mu = max(dot(N, V), 0.0);
  vec3 color = albedo * uSun * day * (0.5 + 0.5 * pow(mu, 0.4));
  color += albedo * uGold * fringe * 0.55;
  color += albedo * uAmbient * (1.0 - day);
  // Ombre des anneaux : le rayon vers le soleil traverse le plan des anneaux
  if (uRing.z > 0.5) {
    float denom = dot(L, uRingNormal);
    if (abs(denom) > 1e-3) {
      float s = dot(vCenterW - vPosW, uRingNormal) / denom;
      if (s > 0.0) {
        float r = length(vPosW + L * s - vCenterW);
        color *= 1.0 - 0.8 * ringDensity((r - uRing.x) / (uRing.y - uRing.x));
      }
    }
  }
  // Lumières de nuit (néons de la planète), seulement dans l'ombre
  if (uHasNight > 0.5) {
    float lights = texture2D(uNight, uv).r;
    float dark = 1.0 - smoothstep(-0.22, 0.08, ndl);
    color += uNightColor * pow(lights, 1.6) * uNightGain * dark;
  }
  // Diffusion de l'atmosphère sur le disque : côté soleil, et à contre-jour près du limbe
  float rim = pow(max(1.0 - mu, 0.0), 3.0);
  float sunSide = smoothstep(-0.3, 0.55, ndl);
  vec3 scatter = mix(uGold, uAtmo, smoothstep(-0.05, 0.45, ndl)) * rim * sunSide;
  float forward = pow(max(dot(-V, L), 0.0), 5.0) * smoothstep(-0.6, 0.05, ndl);
  scatter += uAtmo * rim * forward * 1.6;
  color += scatter * uAtmoGain;
  color = applyHaze(color, length(cameraPosition - vPosW));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`

const ATMO_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uAtmo;
uniform vec3 uGold;
uniform float uRadius;
uniform float uOuter;
uniform float uGain;
uniform float uHazeFade;
varying vec3 vPosW;
varying vec3 vCenterW;
varying vec3 vNormalW;
varying vec2 vUv;
void main() {
  vec3 L = normalize(uSunDir);
  vec3 dir = (vPosW - cameraPosition) / max(length(vPosW - cameraPosition), 1e-3);
  vec3 oc = vCenterW - cameraPosition;
  float tca = dot(oc, dir);
  vec3 closest = cameraPosition + dir * tca;
  float d = length(closest - vCenterW);
  float h = clamp((d - uRadius) / (uOuter - uRadius), 0.0, 1.0);
  float density = exp(-h * 3.2) * (1.0 - h) * (1.0 - h);
  vec3 n = (closest - vCenterW) / max(d, 1e-3);
  float ndl = dot(n, L);
  float day = smoothstep(-0.25, 0.6, ndl);
  float fq = (ndl - 0.02) / 0.2;
  float fringe = exp(-fq * fq);
  float forward = pow(max(dot(dir, L), 0.0), 7.0);
  vec3 color = uAtmo * day * 0.9 + uGold * fringe * 0.7 + uAtmo * forward * 2.6 * (1.0 - 0.5 * day);
  float far = length(vCenterW - cameraPosition);
  float fade = exp(-far * uHazeFade);
  gl_FragColor = vec4(color * density * uGain * fade, 1.0);
  #include <colorspace_fragment>
}`

const RING_VERT = /* glsl */ `
varying vec3 vPosW;
varying vec3 vCenterW;
varying float vRadius;
void main() {
  vRadius = length(position.xy);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vCenterW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const RING_FRAG = /* glsl */ `
uniform sampler2D uRingMap;
uniform float uHasRingMap;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uRingNormal;
uniform float uInner;
uniform float uOuter;
uniform float uPlanet;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uAtmo;
uniform float uOpacity;
varying vec3 vPosW;
varying vec3 vCenterW;
varying float vRadius;
${HAZE}
void main() {
  float u = (vRadius - uInner) / (uOuter - uInner);
  if (u < 0.0 || u > 1.0) discard;
  vec4 tex = uHasRingMap > 0.5
    ? texture2D(uRingMap, vec2(u, 0.5))
    : vec4(vec3(0.6 + 0.4 * sin(u * 90.0)), (0.55 + 0.45 * sin(u * 60.0) * sin(u * 23.0 + 1.0)) * 0.8);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 albedo = lum < 0.5 ? mix(uDeep, uMid, lum * 2.0) : mix(uMid, uLight, lum * 2.0 - 1.0);
  float alpha = clamp(tex.a, 0.0, 1.0) * smoothstep(0.0, 0.03, u) * (1.0 - smoothstep(0.96, 1.0, u)) * uOpacity;
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vPosW);
  // Même côté que le soleil : réfléchi ; côté opposé : translucide, plus vif là où l'anneau est fin
  float sameSide = step(0.0, dot(uRingNormal, L) * dot(uRingNormal, V));
  float forward = pow(max(dot(-V, L), 0.0), 4.0);
  float light = mix(0.25 + 0.9 * forward * (1.0 - tex.a), 0.95, sameSide);
  // Ombre de la planète
  vec3 oc = vCenterW - vPosW;
  float b = dot(oc, L);
  float c2 = dot(oc, oc) - b * b;
  float shadow = b > 0.0 ? smoothstep(uPlanet * uPlanet * 0.9, uPlanet * uPlanet * 1.04, c2) : 1.0;
  vec3 color = albedo * uSun * light * (0.06 + 0.94 * shadow) + uAtmo * 0.02;
  color = applyHaze(color, length(cameraPosition - vPosW));
  gl_FragColor = vec4(color * alpha, alpha);
  #include <colorspace_fragment>
}`

const SUN_COLOR = new Color('#fff1de')
const NO_TEXTURE = null as Texture | null

export type PlanetUniforms = {
  uMap: { value: Texture | null }
  uHasMap: { value: number }
  uNight: { value: Texture | null }
  uHasNight: { value: number }
  uNightGain: { value: number }
  uSunDir: { value: Vector3 }
  uSun: { value: Color }
  uDeep: { value: Color }
  uMid: { value: Color }
  uLight: { value: Color }
  uAtmo: { value: Color }
  uGold: { value: Color }
  uNightColor: { value: Color }
  uContrast: { value: number }
  uAtmoGain: { value: number }
  uRadius: { value: number }
  uRing: { value: Vector4 }
  uRingNormal: { value: Vector3 }
  uRingMap: { value: Texture | null }
  uHasRingMap: { value: number }
  uFlip: { value: number }
  uAmbient: { value: number }
  uHaze: { value: Color }
  uHazeDensity: { value: number }
}

export type PlanetMaterial = ShaderMaterial & { uniforms: PlanetUniforms }

export type HazeSettings = { color: ColorRepresentation; density: number }

export type PlanetOptions = {
  palette: Palette
  radius: number
  sunDir: Vector3
  haze: HazeSettings
  contrast?: number
  atmoGain?: number
  nightGain?: number
  /** Lumière diffuse côté nuit (anneaux, étoiles) : on devine les bandes dans l'ombre. */
  ambient?: number
}

export function createPlanetMaterial(options: PlanetOptions): PlanetMaterial {
  const { palette } = options
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: NO_TEXTURE },
      uHasMap: { value: 0 },
      uNight: { value: NO_TEXTURE },
      uHasNight: { value: 0 },
      uNightGain: { value: options.nightGain ?? 1 },
      uSunDir: { value: options.sunDir },
      uSun: { value: SUN_COLOR.clone().multiplyScalar(1.15) },
      uDeep: { value: new Color(palette.deep) },
      uMid: { value: new Color(palette.mid) },
      uLight: { value: new Color(palette.light) },
      uAtmo: { value: new Color(palette.atmo) },
      uGold: { value: new Color(palette.gold) },
      uNightColor: { value: new Color(palette.night) },
      uContrast: { value: options.contrast ?? 1 },
      uAtmoGain: { value: options.atmoGain ?? 1 },
      uRadius: { value: options.radius },
      uRing: { value: new Vector4(0, 1, 0, 0) },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      uRingMap: { value: NO_TEXTURE },
      uHasRingMap: { value: 0 },
      uFlip: { value: 0 },
      uAmbient: { value: options.ambient ?? 0.03 },
      uHaze: { value: new Color(options.haze.color) },
      uHazeDensity: { value: options.haze.density },
    },
    vertexShader: VERT,
    fragmentShader: SURFACE_FRAG,
    fog: false,
  }) as PlanetMaterial
}

export type AtmosphereMaterial = ShaderMaterial & {
  uniforms: {
    uSunDir: { value: Vector3 }
    uAtmo: { value: Color }
    uGold: { value: Color }
    uRadius: { value: number }
    uOuter: { value: number }
    uGain: { value: number }
    uHazeFade: { value: number }
  }
}

/** Coquille d'atmosphère (rayon `outer`, à poser sur une sphère de ce rayon, face arrière). */
export function createAtmosphereMaterial(
  options: PlanetOptions & { outer: number; gain?: number },
): AtmosphereMaterial {
  return new ShaderMaterial({
    uniforms: {
      uSunDir: { value: options.sunDir },
      uAtmo: { value: new Color(options.palette.atmo) },
      uGold: { value: new Color(options.palette.gold) },
      uRadius: { value: options.radius },
      uOuter: { value: options.outer },
      uGain: { value: options.gain ?? 1 },
      uHazeFade: { value: options.haze.density * 0.5 },
    },
    vertexShader: VERT,
    fragmentShader: ATMO_FRAG,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  }) as AtmosphereMaterial
}

export type RingMaterial = ShaderMaterial & {
  uniforms: {
    uRingMap: { value: Texture | null }
    uHasRingMap: { value: number }
    uSunDir: { value: Vector3 }
    uSun: { value: Color }
    uRingNormal: { value: Vector3 }
    uInner: { value: number }
    uOuter: { value: number }
    uPlanet: { value: number }
    uDeep: { value: Color }
    uMid: { value: Color }
    uLight: { value: Color }
    uAtmo: { value: Color }
    uOpacity: { value: number }
    uHaze: { value: Color }
    uHazeDensity: { value: number }
  }
}

/** Anneaux (RingGeometry dans le plan XY local, normale locale +Z). Alpha prémultiplié. */
export function createRingMaterial(
  options: PlanetOptions & { inner: number; outer: number; normal: Vector3 },
): RingMaterial {
  const { palette } = options
  return new ShaderMaterial({
    uniforms: {
      uRingMap: { value: NO_TEXTURE },
      uHasRingMap: { value: 0 },
      uSunDir: { value: options.sunDir },
      uSun: { value: SUN_COLOR.clone() },
      uRingNormal: { value: options.normal },
      uInner: { value: options.inner },
      uOuter: { value: options.outer },
      uPlanet: { value: options.radius },
      uDeep: { value: new Color(palette.deep) },
      uMid: { value: new Color(palette.mid) },
      uLight: { value: new Color(palette.light) },
      uAtmo: { value: new Color(palette.atmo) },
      uOpacity: { value: 1 },
      uHaze: { value: new Color(options.haze.color) },
      uHazeDensity: { value: options.haze.density },
    },
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    side: DoubleSide,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    fog: false,
  }) as RingMaterial
}

/** Branche une texture de surface (ou de nuit, ou d'anneau) chargée sur un matériau de planète. */
export function setPlanetMap(
  material: PlanetMaterial | RingMaterial,
  slot: 'map' | 'night' | 'ring',
  texture: Texture,
): void {
  const u = material.uniforms
  if (slot === 'ring') {
    u.uRingMap.value = texture
    u.uHasRingMap.value = 1
    return
  }
  if (!('uMap' in u)) return
  if (slot === 'map') {
    u.uMap.value = texture
    u.uHasMap.value = 1
  } else {
    u.uNight.value = texture
    u.uHasNight.value = 1
  }
}
