// Easter egg, arène : sol de marbre poli qui reflète la salle (desktop). Reflector de three (caméra
// miroir, plan de coupe oblique), dont le rendu ne part que quand le sol est dessiné : rien pendant la
// route, l'espace ou le parc (groupe de l'arène masqué). Son matériau est remplacé par le marbre PBR
// (materials.ts) : le reflet est ajouté à la lumière sortante, flouté selon la rugosité (mipmaps du rendu
// miroir) et déformé par la normale du marbre, plus fort en incidence rasante (Fresnel).
import {
  type BufferGeometry,
  LinearMipmapLinearFilter,
  Matrix4,
  type MeshStandardMaterial,
  ShaderMaterial,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

export type Mirror = { mesh: Reflector; strength: { value: number }; dispose: () => void }

/**
 * Sol miroir à partir de la face plane du GLB (plan XZ à la hauteur y, normale +Y) et du matériau du
 * marbre (modifié ici : injection du reflet). Résolution du rendu miroir : width × height.
 */
export function createMirror(
  floor: BufferGeometry,
  y: number,
  material: MeshStandardMaterial,
  width: number,
  height: number,
): Mirror {
  // Le Reflector attend un plan XY de normale +Z
  const plane = floor.clone()
  plane.rotateX(Math.PI / 2)
  plane.translate(0, 0, -y)
  const mesh = new Reflector(plane, {
    textureWidth: width,
    textureHeight: height,
    clipBias: 0.003,
    multisample: 0,
  })
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  const target = mesh.getRenderTarget()
  target.texture.generateMipmaps = true
  target.texture.minFilter = LinearMipmapLinearFilter
  // Matrice de projection du miroir (mise à jour par le Reflector avant chaque dessin du sol)
  const original = mesh.material
  let textureMatrix = new Matrix4()
  if (original instanceof ShaderMaterial) {
    const value: unknown = original.uniforms.textureMatrix?.value
    if (value instanceof Matrix4) textureMatrix = value
    original.dispose()
  }
  const strength = { value: 1 }
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uMirror = { value: target.texture }
    shader.uniforms.uMirrorMatrix = { value: textureMatrix }
    shader.uniforms.uMirrorStrength = strength
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uMirrorMatrix;\nvarying vec4 vMirror;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvMirror = uMirrorMatrix * vec4(transformed, 1.0);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D uMirror;\nuniform float uMirrorStrength;\nvarying vec4 vMirror;',
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
{
  vec2 mirrorUv = vMirror.xy / vMirror.w + (normal.xy - nonPerturbedNormal.xy) * 0.04;
  float mirrorLod = roughnessFactor * 4.0;
  vec3 mirrorColor = textureLod(uMirror, mirrorUv, mirrorLod).rgb;
  float mirrorView = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  float mirrorFresnel = 0.18 + 0.82 * pow(1.0 - mirrorView, 4.0);
  outgoingLight += mirrorColor * mirrorFresnel * uMirrorStrength * (1.0 - roughnessFactor);
}
#include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => 'arena-mirror'
  mesh.material = material
  return {
    mesh,
    strength,
    dispose: () => {
      mesh.dispose()
      plane.dispose()
    },
  }
}
