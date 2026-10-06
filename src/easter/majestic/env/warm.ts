// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Préchargement ») :
// préchauffage de l'environnement (D4), sur le modèle de src/easter/warmup.ts, pour qu'aucun programme
// ne se compile et qu'aucune ressource ne parte au GPU pendant la séquence :
// 1. programmes : compileAsync de la racine de l'environnement avec la scène réelle comme cible (ses
//    lumières font partie de la clé des programmes), dans la variante du rendu réel (avec le
//    postprocessing, cible hors écran posée : three y écrit en linéaire, autre variante que l'écran) ;
// 2. textures : initTexture (horizon, atlas de poussière, chemins des cascades, carte de la Lune) ;
// 3. géométries : un rendu de la scène réelle dans une petite cible, l'environnement tout visible et le
//    reste masqué, sauf les branches qui portent des lumières (même nombre de lumières, même variante).
// MajesticEnv enregistre sa racine au montage (registerEnv) ; D3 appelle warmMajesticEnv pendant une
// image figée (ou en tâche de fond pendant le parc), avant le premier affichage du sanctuaire.
import {
  type Camera,
  HalfFloatType,
  type Material,
  type Object3D,
  type Scene,
  ShaderMaterial,
  Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { type EnvRig } from './rig'

const rigs = new Set<EnvRig>()

/** Enregistre un environnement monté ; renvoie le désenregistrement (pour useEffect). */
export function registerEnv(rig: EnvRig): () => void {
  rigs.add(rig)
  return () => {
    rigs.delete(rig)
  }
}

function materialsOf(object: Object3D): Material[] {
  if (!('material' in object)) return []
  const value: unknown = object.material
  if (Array.isArray(value))
    return value.filter((m): m is Material => typeof m === 'object' && m !== null)
  return typeof value === 'object' && value !== null ? [value as Material] : []
}

const isTexture = (value: unknown): value is Texture => value instanceof Texture

function collectTextures(root: Object3D, out: Set<Texture>): void {
  root.traverse((object) => {
    materialsOf(object).forEach((material) => {
      if (!(material instanceof ShaderMaterial)) return
      Object.values(material.uniforms).forEach((uniform) => {
        const value: unknown = uniform.value
        if (isTexture(value) && !value.isRenderTargetTexture) out.add(value)
      })
    })
  })
}

function hasLight(node: Object3D): boolean {
  let found = false
  node.traverse((object) => {
    if ('isLight' in object) found = true
  })
  return found
}

type Saved = [Object3D, boolean, boolean][]

/** Tout l'environnement visible et sans culling ; renvoie l'état d'avant. */
function reveal(root: Object3D): Saved {
  const saved: Saved = []
  root.traverse((object) => {
    saved.push([object, object.visible, object.frustumCulled])
    object.visible = true
    object.frustumCulled = false
  })
  return saved
}

function restore(saved: Saved): void {
  saved.forEach(([object, visible, culled]) => {
    object.visible = visible
    object.frustumCulled = culled
  })
}

/** Masque tout ce qui n'est ni l'environnement, ni un de ses parents, ni une branche avec lumière. */
function isolate(scene: Scene, root: Object3D): Object3D[] {
  const keep = new Set<Object3D>()
  for (let node: Object3D | null = root; node; node = node.parent) keep.add(node)
  const hidden: Object3D[] = []
  const visit = (node: Object3D) => {
    for (const child of node.children) {
      if (keep.has(child)) {
        if (child !== root) visit(child)
        continue
      }
      if (!child.visible || hasLight(child)) continue
      child.visible = false
      hidden.push(child)
    }
  }
  visit(scene)
  return hidden
}

/**
 * Précompile et envoie au GPU tout l'environnement monté. `scene` : la scène réelle ; `offscreen` :
 * rendu via le postprocessing (bloom).
 */
export async function warmMajesticEnv(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  offscreen: boolean,
): Promise<void> {
  const target = new WebGLRenderTarget(64, 64, { type: HalfFloatType })
  const previous = gl.getRenderTarget()
  for (const rig of rigs) {
    const { root } = rig
    // 1. Programmes, dans la variante du rendu réel (tout visible : compileAsync ignore le reste)
    const saved = reveal(root)
    gl.setRenderTarget(offscreen ? target : null)
    const compiled = gl.compileAsync(root, camera, scene)
    gl.setRenderTarget(previous)
    restore(saved)
    await compiled
    // 2. Textures
    const textures = new Set<Texture>(rig.textures)
    collectTextures(root, textures)
    textures.forEach((texture) => {
      gl.initTexture(texture)
    })
    // 3. Géométries : la scène réelle, réduite à l'environnement (et aux lumières). Visibilité reposée
    //    ici, d'un bloc et sans attente : la boucle de rendu a pu remasquer des objets pendant l'await.
    if (root.parent) {
      const shown = reveal(root)
      const hidden = isolate(scene, root)
      gl.setRenderTarget(target)
      gl.render(scene, camera)
      gl.setRenderTarget(previous)
      hidden.forEach((child) => {
        child.visible = true
      })
      restore(shown)
    }
  }
  target.dispose()
}
