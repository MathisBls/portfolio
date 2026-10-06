// Easter egg v3, beat 5 (docs/storyboards/easter-park.md : « Ciel étoilé réaliste avec la Voie lactée, le
// limbe d'une planète éclairée à contre-jour dans un coin ») : matériaux du ciel de l'espace, sans React.
// - Voie lactée : sphère vue de l'intérieur, panorama ESO (SKY, park/textures.ts), assombri, en fondu.
//   Ciel et étoiles sont dans la passe opaque, dessinés en premier et sans écrire la profondeur : la
//   porte, même au-delà de leur rayon, passe toujours devant.
// - Étoiles nettes : points instanciés en vertex shader (taille en pixels, couleur de température), par
//   dessus le panorama trop doux à l'écran. Aucun scintillement rapide (respiration très lente).
// - Planète : la Terre côté nuit (lumières des villes, PLANETS.earthNight), mince croissant au bord tourné
//   vers le soleil, caché derrière elle ; atmosphère en coquille additive (fresnel), plus forte côté soleil.
// Couleurs en HDR modéré : seuls le croissant et l'atmosphère dépassent le seuil du bloom.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  type Texture,
  Vector3,
} from 'three'
import { seeded } from '../shaders'

const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const SKY_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uGain;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  // Fond plus noir (le panorama a un voile), étoiles et bande gardées
  c = max(c - 0.012, 0.0) * uGain * uOpacity;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

export type SkyMaterial = ShaderMaterial & {
  uniforms: { uMap: { value: Texture }; uOpacity: { value: number }; uGain: { value: number } }
}

export function createSkyMaterial(map: Texture): SkyMaterial {
  return new ShaderMaterial({
    uniforms: { uMap: { value: map }, uOpacity: { value: 0 }, uGain: { value: 0.72 } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: BackSide,
    // Opaque mais sans profondeur, dessiné en premier (renderOrder) : un fond, jamais devant la porte.
    // Le fondu d'apparition se fait sur la couleur (fond noir derrière).
    depthWrite: false,
    toneMapped: false,
  }) as SkyMaterial
}

const STAR_VERT = /* glsl */ `
attribute vec3 aStar; // taille (px), luminosité, phase
attribute vec3 aColor;
uniform float uTime;
uniform float uPixel;
varying vec3 vColor;
void main() {
  float breathe = 0.9 + 0.1 * sin(uTime * 0.35 + aStar.z * 6.283);
  vColor = aColor * aStar.y * breathe;
  gl_PointSize = aStar.x * uPixel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const STAR_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 4.0) * uOpacity;
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <colorspace_fragment>
}`

export type StarMaterial = ShaderMaterial & {
  uniforms: { uTime: { value: number }; uPixel: { value: number }; uOpacity: { value: number } }
}

/** Couleurs d'étoiles : bleutées, blanches, jaunes, orangées (températures courantes). */
const STAR_COLORS = ['#a9c4ff', '#d6e2ff', '#fff6ea', '#ffe2b8', '#ffc58f'].map((c) => new Color(c))

/** Étoiles réparties sur une sphère de rayon `radius` ; magnitudes en loi de puissance (peu de brillantes). */
export function createStars(count: number, radius: number) {
  const random = seeded(41)
  const positions = new Float32Array(count * 3)
  const stars = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const p = new Vector3()
  for (let i = 0; i < count; i++) {
    const u = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    p.set(s * Math.cos(angle), u, s * Math.sin(angle)).multiplyScalar(radius)
    positions.set([p.x, p.y, p.z], i * 3)
    const m = Math.pow(random(), 6)
    stars.set([1.2 + 3.2 * m, 0.35 + 1.6 * m, random()], i * 3)
    const color = STAR_COLORS[Math.floor(random() * STAR_COLORS.length)] ?? STAR_COLORS[1]
    colors.set([color?.r ?? 1, color?.g ?? 1, color?.b ?? 1], i * 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aStar', new BufferAttribute(stars, 3))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uOpacity: { value: 0 } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    // Passe opaque (dessinées avant la porte, qui les masque), mélange additif
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }) as StarMaterial
  return { geometry, material }
}

const PLANET_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const PLANET_FRAG = /* glsl */ `
uniform sampler2D uNight;
uniform vec3 uSun;
uniform vec3 uDay;
uniform vec3 uRim;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float sun = dot(n, uSun);
  // Croissant éclairé : seulement le bord tourné vers le soleil (caché derrière la planète)
  float day = smoothstep(0.0, 0.3, sun);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 c = uDay * day * (0.04 + 1.8 * fresnel);
  // Côté nuit : lumières des villes, éteintes là où il fait jour
  vec3 night = texture2D(uNight, vUv).rgb;
  c += night * 1.3 * (1.0 - smoothstep(-0.15, 0.05, sun));
  // Diffusion de l'atmosphère au limbe, plus forte côté soleil
  c += uRim * fresnel * (0.03 + 1.3 * smoothstep(-0.3, 0.4, sun));
  gl_FragColor = vec4(c * uOpacity, 1.0);
  #include <colorspace_fragment>
}`

export type PlanetMaterial = ShaderMaterial & {
  uniforms: {
    uNight: { value: Texture }
    uSun: { value: Vector3 }
    uDay: { value: Color }
    uRim: { value: Color }
    uOpacity: { value: number }
  }
}

export function createPlanetMaterial(night: Texture, sun: Vector3): PlanetMaterial {
  return new ShaderMaterial({
    uniforms: {
      uNight: { value: night },
      uSun: { value: sun },
      uDay: { value: new Color('#dfe9ff') },
      uRim: { value: new Color('#3d7bff') },
      uOpacity: { value: 0 },
    },
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
    toneMapped: false,
  }) as PlanetMaterial
}

const HALO_FRAG = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uInner;
varying vec3 vNormal;
varying vec3 vWorld;
void main() {
  // Coquille vue de l'intérieur (faces arrière) : 0 au bord de la coquille, maximum au limbe de la planète
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float edge = clamp(-dot(n, v) / uInner, 0.0, 1.0);
  float glow = pow(edge, 2.2);
  float side = 0.08 + 1.9 * smoothstep(-0.45, 0.5, dot(n, uSun));
  gl_FragColor = vec4(uColor * glow * side * uOpacity, 1.0);
  #include <colorspace_fragment>
}`

export type HaloMaterial = ShaderMaterial & {
  uniforms: {
    uSun: { value: Vector3 }
    uColor: { value: Color }
    uOpacity: { value: number }
    uInner: { value: number }
  }
}

/** Atmosphère : coquille de rayon `ratio` × celui de la planète. */
export function createAtmosphere(sun: Vector3, ratio: number): HaloMaterial {
  return new ShaderMaterial({
    uniforms: {
      uSun: { value: sun },
      uColor: { value: new Color('#5b95ff') },
      uOpacity: { value: 0 },
      // dot(n, v) des faces arrière au limbe de la planète : sqrt(1 − 1/ratio²)
      uInner: { value: Math.sqrt(1 - 1 / (ratio * ratio)) },
    },
    vertexShader: PLANET_VERT,
    fragmentShader: HALO_FRAG,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }) as HaloMaterial
}
