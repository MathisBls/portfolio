// Easter egg, beat 5 : matériau des traînées d'étoiles (Streaks.tsx). Étoiles étirées dans l'axe de la
// caméra, tout en vertex shader (zéro calcul CPU par frame) : profondeur qui boucle selon le trajet
// parcouru, longueur et largeur selon la vitesse. Mélange additif, alpha 1 (HDR sous bloom).
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { seeded } from './shaders'

const STREAK_VERT = /* glsl */ `
attribute vec4 aStreak; // x, y (rayon autour de l'axe), profondeur de départ, vitesse relative
uniform float uTravel;
uniform float uLength;
uniform float uDepth;
uniform float uWidth;
varying float vAlpha;
varying float vAlong;
void main() {
  float z = -mod(aStreak.z + uTravel * aStreak.w, uDepth);
  vec2 side = normalize(vec2(-aStreak.y, aStreak.x));
  float len = max(uLength * aStreak.w, 0.02);
  vec3 p = vec3(aStreak.xy + side * position.x * uWidth, z + position.y * len);
  vAlong = position.y;
  float d = -z;
  vAlpha = (1.0 - smoothstep(uDepth * 0.55, uDepth, d)) * smoothstep(0.5, 6.0, d);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vAlong;
void main() {
  float a = vAlpha * uOpacity * (0.25 + 0.75 * vAlong);
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}`

export type StreakMaterial = ShaderMaterial & {
  uniforms: {
    uTravel: { value: number }
    uLength: { value: number }
    uDepth: { value: number }
    uWidth: { value: number }
    uColor: { value: Color }
    uOpacity: { value: number }
  }
}

export const STREAK_DEPTH = 140

/** Réglage par frame des traînées : trajet (profondeur qui boucle), longueur, opacité, couleur. */
export function updateStreaks(
  material: StreakMaterial,
  delta: number,
  speed: number,
  color: Color,
): void {
  const u = material.uniforms
  u.uTravel.value += delta * (8 + 260 * speed * speed)
  u.uLength.value = 0.4 + 30 * speed * speed
  u.uWidth.value = 0.04 + 0.1 * speed
  u.uOpacity.value = Math.min(1, 0.15 + 1.4 * speed)
  u.uColor.value.copy(color)
}

export function createStreaks(count: number) {
  const plane = new PlaneGeometry(1, 1).translate(0, 0.5, 0)
  const geometry = new InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  const random = seeded(7)
  const data = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2
    const radius = 2 + Math.pow(random(), 0.8) * 30
    data.set(
      [Math.cos(angle) * radius, Math.sin(angle) * radius, random() * STREAK_DEPTH, 0.6 + random()],
      i * 4,
    )
  }
  geometry.setAttribute('aStreak', new InstancedBufferAttribute(data, 4))
  geometry.instanceCount = count
  const material = new ShaderMaterial({
    uniforms: {
      uTravel: { value: 0 },
      uLength: { value: 0 },
      uDepth: { value: STREAK_DEPTH },
      uWidth: { value: 0.14 },
      uColor: { value: new Color('#cfd8ff') },
      uOpacity: { value: 0 },
    },
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    // Quads vus de l'intérieur du cylindre (caméra sur l'axe) : sans DoubleSide ils sont éliminés
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }) as StreakMaterial
  return { geometry, material }
}
