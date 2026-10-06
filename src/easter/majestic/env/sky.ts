// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 2 : « immense plaine au
// crépuscule […] deux lunes, un arc d'anneaux » ; beat 6 : spectre « qui se change en aurore » ; beat 7 :
// « silhouette de la montagne sous l'aurore ») : le ciel, centré sur la caméra, sans React.
// - Dôme : diffusion de Rayleigh et de Mie (glsl.ts, ATMOSPHERE), soleil bas (disque et halo de Mie),
//   deux lunes éclairées en phase, arc d'anneaux avec l'ombre de la planète, aurore en rideaux de bruit
//   (M.aurora), lueur de nuit ; sous l'horizon, la couleur de la brume (jonction invisible avec la plaine
//   au loin). Opaque, dessiné en premier, sans écrire la profondeur.
// - Étoiles : points nets qui apparaissent avec la nuit, masqués par l'anneau et les lunes, éteints près
//   de l'horizon (extinction). Respiration très lente, aucun scintillement rapide.
// Mobile : 8 échantillons d'atmosphère et 12 couches d'aurore (12 et 22 sur desktop), moins d'étoiles.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { seeded } from '../../shaders'
import {
  ATMOSPHERE,
  AURORA,
  BODIES,
  CLOUD_LAYER,
  FINISH,
  HAZE,
  NOISE2,
  UNIFORMS,
  glsl,
} from './glsl'
import { CLOUDS } from '../layout'
import { type Shared } from './shared'

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const SKY_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  ATMOSPHERE,
  BODIES,
  AURORA,
  HAZE,
  CLOUD_LAYER,
  FINISH,
  /* glsl */ `
uniform vec3 uNightGlow;
varying vec3 vDir;
void main() {
  vec3 dir = safeNormalize(vDir, vec3(0.0, 1.0, 0.0));
  vec3 trans;
  vec3 color = atmosphere(dir, trans);
  // Lunes (derrière l'anneau), bord antialiasé : dérivées hors de toute branche
  float aaA = max(2.0 * fwidth(dot(dir, uMoonDirA)) / (uMoonSize.x * uMoonSize.x), 1e-3);
  float aaB = max(2.0 * fwidth(dot(dir, uMoonDirB)) / (uMoonSize.y * uMoonSize.y), 1e-3);
  vec4 moonA = moon(dir, uMoonDirA, uMoonSize.x, uMoonTintA, 0.0, aaA);
  vec4 moonB = moon(dir, uMoonDirB, uMoonSize.y, uMoonTintB, 0.37, aaB);
  vec3 bodies = moonB.rgb + moonA.rgb * (1.0 - moonB.a);
  float cover = max(moonA.a, moonB.a);
  vec3 ringPoint;
  float ringCoord = ringU(dir, ringPoint);
  float ringWidth = fwidth(ringCoord);
  vec4 rings = ring(dir, ringPoint, ringCoord, ringWidth);
  bodies = rings.rgb + bodies * (1.0 - rings.a);
  cover = rings.a + cover * (1.0 - rings.a);
  // Soleil : disque (0.55°) derrière tout le reste
  float mu = dot(dir, uSunDir);
  float disk = smoothstep(0.999948, 0.999958, mu);
  vec3 sun = vec3(1.0, 0.9, 0.78) * disk * 7.0 * (1.0 - cover);
  color += (bodies + sun) * trans;
  // Lueur de nuit (violet profond), aurore derrière les nuages, puis la couche de nuages
  color += uNightGlow * (1.0 - 0.5 * cover) * smoothstep(-0.05, 0.6, dir.y);
  // Tramage des couches : bruit à gradient entrelacé (moins granuleux qu'un hachage)
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  color += aurora(dir, ign) * (1.0 - 0.6 * rings.a);
  vec4 clouds = cloudLayer(cameraPosition, dir, ${((CLOUDS.base + CLOUDS.top) / 2).toFixed(1)});
  color = color * (1.0 - clouds.a) + clouds.rgb;
  // Sous l'horizon : la brume (la plaine au-delà de son bord, vue de haut)
  float below = 1.0 - smoothstep(-0.035, 0.0, dir.y);
  color = mix(color, horizonColor(dir), below);
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
}`,
)

export type SkyDomeMaterial = ShaderMaterial

export function createSkyMaterial(shared: Shared, mobile: boolean): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...shared },
    defines: {
      SKY_SAMPLES: mobile ? 8 : 12,
      AURORA_STEPS: mobile ? 14 : 28,
      CLOUD_OCTAVES: mobile ? 3 : 5,
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: BackSide,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  })
}

const STAR_VERT = glsl(
  NOISE2,
  UNIFORMS,
  BODIES,
  /* glsl */ `
attribute vec3 aStar;
attribute vec3 aColor;
uniform float uStars;
uniform float uPixel;
varying vec3 vColor;
void main() {
  vec3 dir = safeNormalize(position, vec3(0.0, 1.0, 0.0));
  // Masquées par l'anneau et les lunes, éteintes près de l'horizon
  float hidden = ringAt(dir).a;
  hidden = max(hidden, step(cos(uMoonSize.x * 1.05), dot(dir, uMoonDirA)));
  hidden = max(hidden, step(cos(uMoonSize.y * 1.05), dot(dir, uMoonDirB)));
  float extinction = smoothstep(0.0, 0.3, dir.y);
  float breathe = 0.9 + 0.1 * sin(uTime * 0.35 + aStar.z * 6.283);
  vColor = aColor * aStar.y * breathe * uStars * extinction * (1.0 - hidden);
  gl_PointSize = aStar.x * uPixel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  if (uStars <= 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`,
)

const STAR_FRAG = glsl(
  UNIFORMS,
  FINISH,
  /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(p, p) * 4.0);
  gl_FragColor = vec4(finishAdd(vColor * a), 1.0);
  #include <colorspace_fragment>
}`,
)

const STAR_TINTS = ['#a9c4ff', '#d6e2ff', '#fff6ea', '#ffe2b8', '#ffc58f', '#ffd0ea'].map(
  (c) => new Color(c),
)

/** Étoiles sur une sphère de rayon `radius`, surtout au-dessus de l'horizon. */
export function createStars(
  count: number,
  radius: number,
  shared: Shared,
  bloom: boolean,
): Points<BufferGeometry, ShaderMaterial> {
  const random = seeded(29)
  const position = new Float32Array(count * 3)
  const star = new Float32Array(count * 3)
  const color = new Float32Array(count * 3)
  const p = new Vector3()
  for (let i = 0; i < count; i++) {
    const y = -0.1 + random() * 1.1
    const a = random() * Math.PI * 2
    const s = Math.sqrt(Math.max(0, 1 - y * y))
    p.set(s * Math.cos(a), y, s * Math.sin(a)).multiplyScalar(radius)
    position.set([p.x, p.y, p.z], i * 3)
    const m = Math.pow(random(), 7)
    star.set([1.1 + 3.4 * m, (0.3 + 1.7 * m) * (bloom ? 1.2 : 0.9), random()], i * 3)
    const tint = STAR_TINTS[Math.floor(random() * STAR_TINTS.length)] ?? new Color('#ffffff')
    color.set([tint.r, tint.g, tint.b], i * 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aStar', new BufferAttribute(star, 3))
  geometry.setAttribute('aColor', new BufferAttribute(color, 3))
  const material = new ShaderMaterial({
    uniforms: { ...shared, uPixel: { value: 1 } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = -990
  return points
}

/** Dôme du ciel (sphère unité, mise à l'échelle par frame sous le plan lointain). */
export function createSkyDome(
  shared: Shared,
  mobile: boolean,
): Mesh<SphereGeometry, ShaderMaterial> {
  const dome = new Mesh(new SphereGeometry(1, 64, 40), createSkyMaterial(shared, mobile))
  dome.frustumCulled = false
  dome.renderOrder = -1000
  return dome
}
