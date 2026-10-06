// Easter egg, beat 5 : matériaux procéduraux de la route (aucune texture), brouillard de la scène inclus.
// - Chaussée : asphalte sombre, sol plus sombre au-delà des bords, lignes de voie en tirets qui défilent
//   avec la distance parcourue, bords lumineux (HDR, bloom), reflet de la lueur d'horizon au centre.
//   Lisible, sans grille. À grande vitesse les tirets s'allongent jusqu'à former des lignes continues :
//   pas d'effet stroboscopique (aucun clignotement).
// - Réverbères : instanciés, posés en vertex shader (profondeur qui boucle sur la distance), tête
//   émissive. Zéro calcul CPU par frame.
import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { seeded } from './shaders'

/** Demi-largeur de la chaussée (4 voies de 4.2) et position des bords lumineux. */
export const ROAD_HALF = 9

const ROAD_VERT = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const ROAD_FRAG = /* glsl */ `
uniform float uTravel;
uniform float uDuty;
uniform vec3 uEdge;
uniform float uEdgeGlow;
uniform vec3 uHorizon;
uniform float uReflect;
#include <fog_pars_fragment>
varying vec3 vWorld;
float band(float x, float center, float halfWidth) {
  float w = fwidth(x);
  return 1.0 - smoothstep(-w, w, abs(x - center) - halfWidth);
}
void main() {
  float x = vWorld.x;
  float ax = abs(x);
  float onRoad = 1.0 - smoothstep(${ROAD_HALF.toFixed(1)} - 0.2, ${ROAD_HALF.toFixed(1)} + 0.2, ax);
  vec3 color = mix(vec3(0.010, 0.009, 0.014), vec3(0.030, 0.028, 0.040), onRoad);
  // Tirets : 9 unités de période, rapport plein/vide uDuty (1 = ligne continue)
  float s = (vWorld.z - uTravel) / 9.0;
  float f = fract(s);
  float w = fwidth(s);
  float dash = uDuty >= 0.999 ? 1.0 : smoothstep(0.0, w, f) * (1.0 - smoothstep(uDuty - w, uDuty + w, f));
  float lanes = max(band(x, 0.0, 0.09), band(ax, 4.2, 0.08)) * dash;
  color += vec3(0.85, 0.86, 0.95) * lanes * 1.3;
  color += uEdge * band(ax, ${(ROAD_HALF - 0.4).toFixed(1)}, 0.14) * uEdgeGlow;
  // Reflet humide de la lueur d'horizon, au centre de la chaussée, loin devant
  float reflectAmount = exp(-ax * 0.18) * smoothstep(-30.0, -320.0, vWorld.z) * onRoad;
  color += uHorizon * reflectAmount * uReflect;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export type RoadMaterial = ShaderMaterial & {
  uniforms: {
    uTravel: { value: number }
    uDuty: { value: number }
    uEdge: { value: Color }
    uEdgeGlow: { value: number }
    uHorizon: { value: Color }
    uReflect: { value: number }
  }
}

export function createRoadMaterial(): RoadMaterial {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTravel: { value: 0 },
        uDuty: { value: 0.45 },
        uEdge: { value: new Color('#9fd8ff') },
        uEdgeGlow: { value: 2.2 },
        uHorizon: { value: new Color('#ff7aa0') },
        uReflect: { value: 0.25 },
      },
    ]),
    vertexShader: ROAD_VERT,
    fragmentShader: ROAD_FRAG,
    fog: true,
    toneMapped: false,
  }) as RoadMaterial
}

/** Réglage par frame : distance parcourue, tirets allongés avec la vitesse, couleurs (E.red). */
export function updateRoad(
  material: RoadMaterial,
  travelled: number,
  speed: number,
  edge: Color,
  horizon: Color,
  glow: number,
): void {
  const u = material.uniforms
  u.uTravel.value = travelled
  u.uDuty.value = Math.min(1, 0.45 + 0.55 * Math.min(1, speed / 0.55))
  u.uEdge.value.copy(edge)
  u.uEdgeGlow.value = glow
  u.uHorizon.value.copy(horizon)
}

const POST_VERT = /* glsl */ `
attribute vec2 aPost; // x, distance le long de la route
uniform float uTravel;
uniform float uSpan;
uniform float uNear;
varying float vY;
#include <fog_pars_vertex>
void main() {
  // La distance restante diminue avec le trajet : le réverbère vient vers la caméra, puis repart au loin
  float z = uNear - mod(aPost.y - uTravel, uSpan);
  vec3 p = vec3(aPost.x + position.x, position.y, z + position.z);
  vY = position.y;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const POST_FRAG = /* glsl */ `
uniform vec3 uLamp;
varying float vY;
#include <fog_pars_fragment>
void main() {
  vec3 color = mix(vec3(0.05, 0.05, 0.07), uLamp * 3.0, step(5.2, vY));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export type PostMaterial = ShaderMaterial & {
  uniforms: { uTravel: { value: number }; uLamp: { value: Color } }
}

/** Réverbères des deux côtés, tous les `spacing` ; boucle sur `count / 2 × spacing` unités. */
export function createPosts(count: number, spacing: number, near: number) {
  const box = new BoxGeometry(0.16, 5.6, 0.16).translate(0, 2.8, 0)
  const geometry = new InstancedBufferGeometry()
  geometry.index = box.index
  geometry.setAttribute('position', box.getAttribute('position'))
  const random = seeded(23)
  const data = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1
    data.set([side * (ROAD_HALF + 1.4), Math.floor(i / 2) * spacing + random() * 2], i * 2)
  }
  geometry.setAttribute('aPost', new InstancedBufferAttribute(data, 2))
  geometry.instanceCount = count
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTravel: { value: 0 },
        uSpan: { value: (count / 2) * spacing },
        uNear: { value: near },
        uLamp: { value: new Color('#ffd9b0') },
      },
    ]),
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    fog: true,
    toneMapped: false,
  }) as PostMaterial
  const dispose = () => {
    box.dispose()
    geometry.dispose()
    material.dispose()
  }
  return { geometry, material, dispose }
}

/** Réglage par frame des réverbères. */
export function updatePosts(material: PostMaterial, travelled: number, lamp: Color): void {
  material.uniforms.uTravel.value = travelled
  material.uniforms.uLamp.value.copy(lamp)
}
