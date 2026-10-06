// Easter egg : matériaux procéduraux (aucune texture à télécharger), et leurs réglages par frame.
// - Halo : dégradé radial additif (éclair du prisme, auras des cartes, halo rouge du final), face
//   caméra ou posé. Mélange additif avec alpha 1 : la couleur s'ajoute telle quelle (HDR sous bloom).
// - Fondu : quad plein écran (noir des transitions, vignette rouge du vol et du final). Sans
//   postprocessing (mobile, reduced-motion), c'est lui qui porte l'ambiance rouge.
// Traînées d'étoiles : streakShader.ts.
import {
  AdditiveBlending,
  Color,
  type ColorRepresentation,
  type Camera,
  type Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uSoftness;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - r, 0.0, 1.0), uSoftness) * uIntensity;
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}`

export type GlowMaterial = ShaderMaterial & {
  uniforms: {
    uColor: { value: Color }
    uIntensity: { value: number }
    uSoftness: { value: number }
  }
}

export function createGlow(color: ColorRepresentation, softness = 2.2): GlowMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: 0 },
      uSoftness: { value: softness },
    },
    vertexShader: BILLBOARD_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }) as GlowMaterial
}

/** Halo d'intensité donnée (0 : masqué, pas de draw call), face caméra si `camera` est fourni. */
export function updateGlow(
  mesh: Object3D,
  material: GlowMaterial,
  camera: Camera | null,
  value: number,
) {
  material.uniforms.uIntensity.value = value
  mesh.visible = value > 0.002
  if (mesh.visible && camera) mesh.quaternion.copy(camera.quaternion)
}

const FADER_FRAG = /* glsl */ `
uniform float uFade;
uniform vec3 uFadeColor;
uniform float uVignette;
uniform vec3 uVignetteColor;
uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float v = uVignette * smoothstep(0.3, 1.05, length(p) * 1.2);
  float a = 1.0 - (1.0 - v) * (1.0 - uFade);
  vec3 c = mix(uVignetteColor, uFadeColor, uFade / max(a, 1e-4));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`

export type FaderMaterial = ShaderMaterial & {
  uniforms: {
    uFade: { value: number }
    uFadeColor: { value: Color }
    uVignette: { value: number }
    uVignetteColor: { value: Color }
    uAspect: { value: number }
  }
}

export function createFader(): FaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uFade: { value: 0 },
      uFadeColor: { value: new Color('#000000') },
      uVignette: { value: 0 },
      uVignetteColor: { value: new Color('#3a0006') },
      uAspect: { value: 1 },
    },
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: FADER_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }) as FaderMaterial
}

export const FULLSCREEN_QUAD = new PlaneGeometry(2, 2)

/** Réglage par frame du fondu. Renvoie true s'il faut le dessiner. */
export function updateFader(
  material: FaderMaterial,
  fade: number,
  vignette: number,
  aspect: number,
): boolean {
  const u = material.uniforms
  u.uFade.value = fade
  u.uVignette.value = vignette
  u.uAspect.value = aspect
  return fade > 0.001 || vignette > 0.001
}

/** Dispersion pseudo-aléatoire déterministe (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
