// Easter egg : préchauffage complet de la séquence pendant le stage 'compiling' (image figée), pour
// qu'aucun programme ne soit compilé ni aucune ressource envoyée au GPU une fois la séquence lancée
// (mesuré avant correctif : 22 programmes, 91 géométries et 4 textures à l'entrée dans l'arène, soit un
// gel de plus de 2 s ; puis les ornements de la légendaire et la route).
// 1. Programmes : compileAsync dans la bonne variante. Avec le postprocessing, la scène est rendue dans
//    une cible hors écran (EffectComposer) : three y écrit en espace linéaire, une autre variante de
//    chaque shader que celle compilée pour l'écran. On compile donc avec une cible hors écran posée.
// 2. Géométries : un rendu de toute la scène (tout rendu visible, sans culling) dans une petite cible.
//    Avec le postprocessing, avec les vrais matériaux (même variante que la séquence : le pilote finit
//    aussi de préparer chaque shader, le premier dessin réel ne coûte plus rien) ; sans, avec un matériau
//    de remplacement unique (pas de variante hors écran inutile à compiler).
// 3. Textures : initTexture sur toutes celles des matériaux (cartes, uniforms), sauf vidéos et cibles,
//    après la fin des décodages du parc et de l'espace (park/loader.ts, envoyées dès leur décodage).
// 4. Postprocessing : un rendu du composer sans sortie à l'écran, qui alloue ses cibles (bloom) avant la
//    séquence plutôt qu'à sa première image.
// Les lumières ne sont jamais touchées (leur nombre fait partie de la clé des programmes).
import type { EffectComposer } from 'postprocessing'
import {
  type Camera,
  HalfFloatType,
  type Material,
  MeshBasicMaterial,
  type Object3D,
  type Scene,
  ShaderMaterial,
  Texture,
  VideoTexture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { texturesSettled } from './park/loader'

let composer: EffectComposer | null = null

/** Composer de la séquence (EasterEffects), préchauffé avec la scène. */
export function registerComposer(value: EffectComposer | null): void {
  composer = value
}

function materialsOf(object: Object3D): Material[] {
  if (!('material' in object)) return []
  const value: unknown = object.material
  if (Array.isArray(value)) return value.filter((m): m is Material => typeof m === 'object' && m !== null)
  return typeof value === 'object' && value !== null ? [value as Material] : []
}

const isTexture = (value: unknown): value is Texture => value instanceof Texture

function texturesOf(material: Material, out: Set<Texture>) {
  const add = (value: unknown) => {
    if (!isTexture(value)) return
    if (value instanceof VideoTexture || value.isRenderTargetTexture) return
    out.add(value)
  }
  Object.values(material).forEach(add)
  if (material instanceof ShaderMaterial) {
    Object.values(material.uniforms).forEach((uniform) => {
      const value: unknown = uniform.value
      add(value)
    })
  }
}

/** Compile, envoie géométries et textures ; `offscreen` : rendu réel dans une cible (postprocessing). */
export async function warmUpScene(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  offscreen: boolean,
): Promise<void> {
  const target = new WebGLRenderTarget(64, 64, { type: HalfFloatType })
  const previous = gl.getRenderTarget()
  // Images encore en décodage (ciel, planètes, écrans) : envoyées pendant le préchauffage
  await texturesSettled(4000)
  // 1. Programmes, dans la variante du rendu réel (la compilation part ici, l'attente est asynchrone)
  gl.setRenderTarget(offscreen ? target : null)
  const compiled = gl.compileAsync(scene, camera)
  gl.setRenderTarget(previous)
  await compiled

  // 3. Textures
  const textures = new Set<Texture>()
  scene.traverse((object) => {
    materialsOf(object).forEach((material) => {
      texturesOf(material, textures)
    })
  })
  textures.forEach((texture) => {
    gl.initTexture(texture)
  })

  // 2. Géométries : tout visible, sans culling, dans la petite cible
  const saved: [Object3D, boolean, boolean][] = []
  scene.traverse((object) => {
    if ('isLight' in object || 'isCamera' in object) return
    saved.push([object, object.visible, object.frustumCulled])
    object.visible = true
    object.frustumCulled = false
  })
  const override = new MeshBasicMaterial()
  const overridden = scene.overrideMaterial
  if (!offscreen) scene.overrideMaterial = override
  gl.setRenderTarget(target)
  gl.render(scene, camera)
  gl.setRenderTarget(previous)
  scene.overrideMaterial = overridden
  saved.forEach(([object, visible, culled]) => {
    object.visible = visible
    object.frustumCulled = culled
  })
  override.dispose()
  target.dispose()

  // 4. Cibles du postprocessing, sans rien afficher
  if (offscreen && composer) {
    const last = composer.passes[composer.passes.length - 1]
    const toScreen = last?.renderToScreen ?? false
    if (last) last.renderToScreen = false
    composer.render(0)
    if (last) last.renderToScreen = toScreen
    gl.setRenderTarget(previous)
  }
}
