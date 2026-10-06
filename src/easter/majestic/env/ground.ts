// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beat 2 : « sable noir, sel
// qui reflète le ciel » ; beat 3 : « des fissures rose et magma courent sur le sol » ; beat 4 : la
// montagne sort du sol) : la plaine, sans React.
// - Maillage polaire centré sur la montagne : anneaux serrés jusqu'à 3 km (le vol bas, l'arrêt, la base),
//   puis de plus en plus lâches jusqu'au bord (PLAIN.radius), perdu dans la brume. Hauteur en vertex
//   shader (GROUND_HEIGHT : dunes basses, dôme qui se soulève, bourrelet de la base, ondes du séisme).
// - Fragment : sable noir (rides éoliennes, paillettes) et croûte de sel (polygones en relief, cuvettes
//   mouillées en miroir). Reflet du ciel calculé dans la direction réfléchie (atmosphère, lunes, anneau,
//   aurore, soleil) avec la silhouette de la montagne ; rugosité variable (normale bruitée). Ombre portée
//   de la montagne. Fissures (CRACKS) : magma rose et orange au fond (parallaxe), parois sombres, bords
//   affaissés (normale inclinée vers la fissure), lueur sur le sable autour. Brume de l'horizon.
// Mobile : maillage plus lâche, sans reflet ni réseau fin de fissures.
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, ShaderMaterial } from 'three'
import { seeded } from '../../shaders'
import { CLOUDS, PLAIN } from '../layout'
import {
  ATMOSPHERE,
  AURORA,
  BODIES,
  CLOUD_LAYER,
  CRACKS,
  FINISH,
  GROUND_HEIGHT,
  HAZE,
  MOUNTAIN,
  NOISE2,
  UNIFORMS,
  VORONOI,
  glsl,
} from './glsl'
import { type Shared } from './shared'

/** Rayons des anneaux : pas de 12 m au centre, ~45 m à 9 km, puis géométrique jusqu'au bord. */
export function groundRadii(mobile: boolean): number[] {
  const scale = mobile ? 2.4 : 1
  const radii = [0]
  let r = 0
  while (r < PLAIN.radius) {
    const step = r < 9000 ? Math.min(12 + r * 0.0045, 60) * scale : r * 0.07 * scale
    r = Math.min(PLAIN.radius, r + step)
    radii.push(r)
  }
  return radii
}

/** Disque polaire dans le plan XZ (y = 0), centre unique puis anneaux de `segments` sommets. */
export function createGroundGeometry(mobile: boolean): BufferGeometry {
  const segments = mobile ? 320 : 720
  const radii = groundRadii(mobile)
  const rings = radii.length - 1
  const vertices = 1 + rings * segments
  const position = new Float32Array(vertices * 3)
  for (let k = 1; k <= rings; k++) {
    const r = radii[k] ?? 0
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const v = 1 + (k - 1) * segments + i
      position[v * 3] = Math.cos(a) * r
      position[v * 3 + 2] = Math.sin(a) * r
    }
  }
  const index = new Uint32Array(segments * 3 + (rings - 1) * segments * 6)
  let o = 0
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    index[o++] = 0
    index[o++] = 1 + next
    index[o++] = 1 + i
  }
  for (let k = 1; k < rings; k++) {
    const inner = 1 + (k - 1) * segments
    const outer = 1 + k * segments
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      index[o++] = inner + i
      index[o++] = inner + next
      index[o++] = outer + i
      index[o++] = inner + next
      index[o++] = outer + next
      index[o++] = outer + i
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setIndex(new BufferAttribute(index, 1))
  return geometry
}

const GROUND_VERT = glsl(
  NOISE2,
  UNIFORMS,
  GROUND_HEIGHT,
  /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalMacro;
void main() {
  vec2 xz = position.xz;
  float h = groundHeight(xz);
  float e = 3.0;
  float hx = groundHeight(xz + vec2(e, 0.0));
  float hz = groundHeight(xz + vec2(0.0, e));
  vNormalMacro = normalize(vec3(h - hx, e, h - hz));
  vWorld = vec3(xz.x, h, xz.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`,
)

const GROUND_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  VORONOI,
  ATMOSPHERE,
  BODIES,
  AURORA,
  CRACKS,
  HAZE,
  CLOUD_LAYER,
  FINISH,
  MOUNTAIN,
  /* glsl */ `
uniform vec3 uGroundAmbient;
uniform vec3 uCrackGlowColor;
uniform float uCrackGlow;
uniform vec3 uNightGlow;
uniform vec3 uSand;
uniform vec3 uSalt;
uniform vec3 uMagmaHot;
uniform vec3 uMagmaPink;
uniform vec3 uMountainShade;
uniform vec3 uMountainGlow;
uniform sampler2D uSandMap;
uniform sampler2D uSandNormal;
uniform float uHasSand;
uniform float uHasSandNormal;
varying vec3 vWorld;
varying vec3 vNormalMacro;

/** Ciel vu dans le reflet (moins d'échantillons), soleil compris, silhouette de la montagne. */
vec3 reflectedSky(vec3 p, vec3 r) {
  vec3 trans;
  vec3 c = atmosphere(r, trans);
  vec4 moonA = moon(r, uMoonDirA, uMoonSize.x, uMoonTintA, 0.0, 0.02);
  vec4 moonB = moon(r, uMoonDirB, uMoonSize.y, uMoonTintB, 0.37, 0.02);
  vec4 rings = ringAt(r);
  vec3 bodies = rings.rgb + (moonA.rgb + moonB.rgb) * (1.0 - rings.a);
  float sun = smoothstep(0.9985, 0.99993, dot(r, uSunDir));
  c += (bodies + vec3(1.0, 0.9, 0.78) * sun * 18.0) * trans;
  c += uNightGlow + aurora(r, 0.5);
  vec4 clouds = cloudLayer(p, r, ${((CLOUDS.base + CLOUDS.top) / 2).toFixed(1)});
  c = c * (1.0 - clouds.a) + clouds.rgb;
  float clear = mountainClear(p, r);
  vec3 mountain = uMountainShade + uMountainGlow;
  return mix(mountain, c, clear);
}

void main() {
  vec3 P = vWorld;
  vec3 toCam = cameraPosition - P;
  float dist = length(toCam);
  vec3 V = dist > 1e-3 ? toCam / dist : vec3(0.0, 1.0, 0.0);
  vec2 xz = P.xz;
  // Taille d'un pixel au sol (m) : estompe les détails plus fins
  float fw = max(length(fwidth(xz)), 1e-3);
  vec3 N = safeNormalize(vNormalMacro, vec3(0.0, 1.0, 0.0));

  // Masques : grandes cuvettes de sel, cœur mouillé, variation fine
  float saltField = fbm2(xz / 520.0, 4);
  float salt = smoothstep(0.43, 0.56, saltField);
  float wet = smoothstep(0.52, 0.64, saltField) * (0.6 + 0.4 * vnoise2(xz / 37.0));
  float micro = vnoise2(xz * 1.7);

  // Détails : rides du sable (1.15 m), polygones de la croûte de sel (3.2 m)
  vec2 grad = vec2(0.0);
  float ridge = 0.0;
  float rippleFade = 1.0 - smoothstep(0.05, 0.28, fw);
  if (rippleFade > 0.0) {
    vec2 wind = vec2(0.94, 0.34);
    float phase = dot(xz, wind) * 5.46 + 2.6 * vnoise2(xz / 6.0);
    grad += wind * cos(phase) * 0.2 * (1.0 - salt) * rippleFade;
  }
  float polygonFade = 1.0 - smoothstep(0.08, 0.5, fw);
  if (salt > 0.01 && polygonFade > 0.0) {
    // Polygones irréguliers : domaine déformé, arêtes plus ou moins marquées
    vec2 q = xz / 3.4 + (vec2(vnoise2(xz / 9.0), vnoise2(xz / 9.0 + 21.0)) - 0.5) * 0.9;
    vec4 cell = voronoiEdge(q, 0.0);
    float d = cell.x * 3.4;
    float height = 0.5 + 0.5 * cell.w;
    float profile = exp(-sq(d / 0.16));
    ridge = profile * salt * polygonFade * height;
    grad -= cell.yz * (-2.0 * d / 0.0256) * profile * 0.03 * height * salt * polygonFade;
  }

  // Fissures : distance au bord, demi-largeur, direction du bord
  vec4 crack = crackField(xz);
  float w = crack.y;
  float cd = crack.x;
  float inside = 0.0;
  float spill = 0.0;
  float sag = 0.0;
  if (w > 0.0) {
    float aa = fw * 0.75;
    inside = (1.0 - smoothstep(w - aa, w + aa, cd)) * min(1.0, 2.0 * w / aa);
    float band = 2.0 + 1.6 * w;
    sag = 1.0 - smoothstep(w, w + band, cd);
    // Bords affaissés : la pente descend vers la fissure (la normale penche vers elle)
    grad -= crack.zw * sag * 0.35;
    spill = exp(-max(cd - w, 0.0) / (w * 2.5 + 5.0));
  }
  #ifdef FINE_CRACKS
  float fine = 0.0;
  if (uCrackFront > 1.0 && fw < 1.2) {
    float r = length(xz);
    float near = max(exp(-max(cd - w, 0.0) / 140.0), 1.0 - smoothstep(uMountainCone.x + 300.0, uMountainCone.x + 1400.0, r));
    float front = 1.0 - smoothstep(uCrackFront * 0.6, uCrackFront * 0.85 + 1.0, r);
    if (near * front > 0.01) {
      vec2 fq = xz / 46.0 + 3.7 + (vec2(vnoise2(xz / 31.0), vnoise2(xz / 31.0 + 9.0)) - 0.5) * 0.55;
      fq += (vec2(vnoise2(xz / 7.0 + 2.0), vnoise2(xz / 7.0 + 15.0)) - 0.5) * 0.08;
      vec4 cell = voronoiEdge(fq, 0.0);
      float fd = cell.x * 46.0;
      float fwid = 0.35 * near * front * (0.5 + cell.w);
      float aa = fw * 0.75;
      fine = (1.0 - smoothstep(fwid - aa, fwid + aa, fd)) * min(1.0, 2.0 * fwid / aa);
      spill = max(spill, exp(-fd / 2.5) * near * front * 0.4);
    }
  }
  inside = max(inside, fine * 0.8);
  #endif
  // Sable : texture de B2 (tuile de 14 m, deux échelles mélangées contre la répétition) assombrie en
  // sable noir violacé, sinon procédural ; normale de la tuile près de la caméra
  vec3 sand = uSand * (0.7 + 0.6 * micro);
  if (uHasSand > 0.5) {
    vec2 uvA = xz / 14.0;
    vec2 uvB = mat2(0.8, -0.6, 0.6, 0.8) * xz / 53.0 + 0.37;
    vec3 tex = texture2D(uSandMap, uvA).rgb * 0.6 + texture2D(uSandMap, uvB).rgb * 0.4;
    sand = uSand * (0.35 + 2.1 * tex) * (0.85 + 0.3 * micro);
    float nearFade = (1.0 - smoothstep(0.04, 0.4, fw)) * (1.0 - salt);
    if (uHasSandNormal > 0.5 && nearFade > 0.0) {
      // Normale OpenGL, UV glTF (sans retournement) : Y inversé ; tangente +X, bitangente +Z
      vec3 tn = texture2D(uSandNormal, uvA).xyz * 2.0 - 1.0;
      grad -= vec2(tn.x, -tn.y) * 0.45 * nearFade;
    }
  }
  N = safeNormalize(vec3(N.x - grad.x, N.y, N.z - grad.y), N);

  // Couleur de base : sable noir violacé, sel rosé, arêtes de sel plus blanches
  vec3 saltColor = uSalt * (0.82 + 0.3 * micro) * (1.0 - 0.35 * wet);
  vec3 albedo = mix(sand, saltColor, salt);
  albedo = mix(albedo, uSalt * 1.2, ridge * 0.35);
  albedo *= 1.0 - 0.55 * sag;

  // Lumière : soleil rasant (ombre de la montagne), ciel, sol
  float shadow = mountainClear(P, uSunDir);
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 color = albedo * (uSunColor * ndl * shadow + mix(uGroundAmbient, uSkyAmbient, N.y * 0.5 + 0.5));
  // Paillettes du sable noir (près de la caméra)
  float glint = step(0.93, hash12(floor(xz * 9.0))) * rippleFade * (1.0 - salt);
  vec3 h = safeNormalize(uSunDir + V, vec3(0.0, 1.0, 0.0));
  color += uSunColor * glint * pow(max(dot(N, h), 0.0), 60.0) * 2.0 * shadow;

  // Reflet : miroir sur le sel mouillé, simple lustre ailleurs ; rugosité variable
  #ifdef REFLECT
  // Rugosité : sel mouillé lisse, sel sec mat, sable très rugueux ; le bruit de normale s'estompe au
  // loin (il deviendrait plus fin qu'un pixel) et le flou d'un sol rugueux redresse le reflet
  float rough = mix(mix(0.38, 0.18, salt), 0.03, wet);
  float jitterFade = 1.0 - smoothstep(0.15, 1.5, fw);
  vec3 jitter = (vec3(vnoise2(xz * 0.9), 0.0, vnoise2(xz * 0.9 + 17.0)) - vec3(0.5, 0.0, 0.5)) * rough * jitterFade;
  vec3 Nr = safeNormalize(N + jitter, vec3(0.0, 1.0, 0.0));
  vec3 R = reflect(-V, Nr);
  R = safeNormalize(vec3(R.x, max(R.y, 0.004) + rough * 0.18, R.z), vec3(0.0, 1.0, 0.0));
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(Nr, V), 0.0), 5.0);
  vec3 sky = reflectedSky(P, R);
  float mirror = mix(mix(0.32, 0.55, salt), 0.95, wet);
  color = mix(color, sky, fres * mirror * (1.0 - inside));
  #endif

  // Fissures : fond de magma vu par la fente (parallaxe), parois sombres, lueur autour
  if (inside > 0.0) {
    float depth = 3.0 + w * 2.0;
    vec2 off = -V.xz / max(V.y, 0.06) * depth;
    vec4 bottom = crackField(xz + off);
    float seeBottom = 1.0 - smoothstep(bottom.y * 0.4, bottom.y + 0.01, bottom.x);
    float flicker = 0.75 + 0.25 * vnoise2(xz / 9.0 + uTime * 0.6);
    // Segments plus ou moins chauds le long des fissures (certains déjà refroidis)
    float segment = 0.35 + 0.9 * smoothstep(0.2, 0.75, vnoise2(xz / 160.0 + uTime * 0.03));
    float heat = vnoise2(xz / 5.0 - uTime * 0.25);
    vec3 magma = mix(uMagmaPink, uMagmaHot, smoothstep(0.35, 0.8, heat) * segment) * flicker * segment;
    vec3 wall = uMagmaPink * 0.14 + albedo * 0.2;
    vec3 inner = mix(wall, magma * (uBloom > 0.5 ? 3.2 : 1.5), seeBottom) * uCrackGlow;
    color = mix(color, inner, inside);
  }
  color += uCrackGlowColor * spill * uCrackGlow * (uBloom > 0.5 ? 0.42 : 0.3) * (1.0 - inside);

  color = applyHaze(color, P);
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
}`,
)

export function createGroundMaterial(shared: Shared, mobile: boolean): ShaderMaterial {
  const defines: Record<string, number | string> = {
    SKY_SAMPLES: 6,
    AURORA_STEPS: 10,
    CLOUD_OCTAVES: 3,
  }
  if (!mobile) {
    defines.REFLECT = ''
    defines.FINE_CRACKS = ''
  }
  return new ShaderMaterial({
    uniforms: {
      ...shared,
      uSand: { value: new Color('#0d0a10') },
      uSalt: { value: new Color('#b7a7b4') },
      uMagmaHot: { value: new Color('#ff8a2a') },
      uMagmaPink: { value: new Color('#ff2f7d') },
      uMountainShade: { value: new Color('#120a14') },
      uMountainGlow: { value: new Color(0, 0, 0) },
      uSandMap: { value: null },
      uSandNormal: { value: null },
      uHasSand: { value: 0 },
      uHasSandNormal: { value: 0 },
    },
    defines,
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    toneMapped: false,
    fog: false,
  })
}

// --- Crêtes lointaines (échelle) ---

const RIDGE_RADIUS = 26000

const RIDGE_VERT = /* glsl */ `
attribute float aTop;
varying vec3 vWorld;
varying float vTop;
void main() {
  vTop = aTop;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const RIDGE_FRAG = glsl(
  NOISE2,
  UNIFORMS,
  HAZE,
  FINISH,
  /* glsl */ `
uniform float uRidgeHaze;
varying vec3 vWorld;
varying float vTop;
void main() {
  vec3 d = vWorld - cameraPosition;
  vec3 view = safeNormalize(d, vec3(0.0, 0.0, -1.0));
  vec3 horizon = horizonColor(view);
  // Perspective aérienne : silhouette pâle, plus sombre au pied, liseré côté soleil
  float rim = pow(max(dot(view, uSunDir), 0.0), 12.0) * smoothstep(0.6, 1.0, vTop);
  vec3 color = horizon * mix(0.42, 0.7, vTop) * uRidgeHaze + horizon * (1.0 - uRidgeHaze);
  color += uSunColor * rim * 0.25;
  gl_FragColor = vec4(finish(color), 1.0);
  #include <colorspace_fragment>
}`,
)

/** Anneau de crêtes basses à l'horizon (150 à 650 m, 26 km) : donne l'échelle de la plaine. */
export function createRidges(
  shared: Shared,
  mobile: boolean,
): Mesh<BufferGeometry, ShaderMaterial> {
  const columns = mobile ? 360 : 900
  const random = seeded(71)
  const phases = Array.from({ length: 5 }, () => random() * Math.PI * 2)
  const position = new Float32Array(columns * 2 * 3)
  const top = new Float32Array(columns * 2)
  for (let i = 0; i < columns; i++) {
    const a = (i / columns) * Math.PI * 2
    let h = 0
    phases.forEach((p, k) => {
      h += Math.sin(a * (3 + k * 5.3) + p) / (1 + k * 0.8)
    })
    const height = 150 + 500 * Math.max(0, 0.5 + 0.28 * h) ** 1.6
    const x = Math.cos(a) * RIDGE_RADIUS
    const z = Math.sin(a) * RIDGE_RADIUS
    position.set([x, -80, z, x, height, z], i * 6)
    top.set([0, 1], i * 2)
  }
  const index: number[] = []
  for (let i = 0; i < columns; i++) {
    const j = (i + 1) % columns
    index.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aTop', new BufferAttribute(top, 1))
  geometry.setIndex(index)
  const material = new ShaderMaterial({
    uniforms: { ...shared, uRidgeHaze: { value: 0.5 } },
    vertexShader: RIDGE_VERT,
    fragmentShader: RIDGE_FRAG,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -600
  return mesh
}
