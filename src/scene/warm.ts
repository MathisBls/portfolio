// Préchauffage de la scène du site avant sa première image (Warmup, Scene.tsx) : tous les programmes
// sont compilés en asynchrone (KHR_parallel_shader_compile) dans la variante du vrai rendu, pour que la
// première image ne compile plus rien de façon synchrone. Mesuré le 2026-10-09 (Chrome, RTX 5070 Ti) :
// 20 programmes dont 7 compilés pendant la première image (gel de 590 ms), le prisme 3D à 2.3 s.
// - Variante : avec le postprocessing, la scène est rendue dans la cible du composer, en espace
//   linéaire (autre variante que l'écran) : on compile avec une cible posée (comme src/easter/warmup.ts).
// - Objets masqués au départ (prisme avant l'intro, rayons, titre 3D) : compile() de three ne parcourt
//   que le visible ; on les rend visibles le temps de l'appel synchrone.
// - Matériaux hors graphe au moment du préchauffage : celui de rejet de MeshTransmissionMaterial (rendu
//   de son tampon, même shader que drei) et celui du titre 3D (ses plans arrivent après la mesure du
//   DOM) : un maillage temporaire chacun, sur une géométrie avec normales comme les vrais.
// - Face arrière du verre : MeshTransmissionMaterial rend aussi le prisme en BackSide dans son tampon
//   (variante FLIP_SIDED) ; compilée en basculant `side` le temps d'un second appel, puis
//   `needsUpdate` pour que le rendu reprenne la bonne variante (déjà en cache). Reconnu à son uniform
//   `chromaticAberration` : sa `transmission` de MeshPhysicalMaterial vaut 0 (drei injecte la sienne).
// - Les matériaux temporaires ne sont pas libérés : dispose() détruirait leurs programmes, que les
//   vrais matériaux (même shader) réutilisent à la première image.
// - Postprocessing : matériaux des passes du composer et de leurs passes internes (le bloom en a deux),
//   compilés sur une géométrie sans normales comme celle des passes (sinon variante HAS_NORMAL), dans
//   les deux variantes : vers une cible (passes intermédiaires) et vers l'écran (dernière passe).
//   @react-three/postprocessing crée le composer dans un effet puis ajoute ses passes un rendu plus
//   tard : on attend qu'il soit prêt (EffectPass présente), avec un plafond.
import { DiscardMaterial } from '@react-three/drei/materials/DiscardMaterial'
import { Effect, type EffectComposer, EffectPass, Pass } from 'postprocessing'
import {
  BackSide,
  BufferGeometry,
  type Camera,
  Color,
  Float32BufferAttribute,
  HalfFloatType,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  type Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { DissolveMaterial } from './materials/dissolve'

let composer: EffectComposer | null = null

/** Ref callback du composer du hero (Effects.tsx). Indéfini tant qu'il n'est pas créé. */
export function registerComposer(value: EffectComposer | null | undefined): void {
  composer = value ?? null
}

/** Le composer enregistré une fois ses passes d'effets ajoutées, ou null au bout de `timeout` ms. */
async function readyComposer(timeout = 1500): Promise<EffectComposer | null> {
  const start = performance.now()
  while (performance.now() - start < timeout) {
    if (composer?.passes.some((pass) => pass instanceof EffectPass)) return composer
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
  return null
}

/** Matériaux d'une passe ou d'un effet, et de leurs passes internes. */
function collect(node: Pass | Effect, out: Set<Material>, seen: Set<object>): void {
  if (seen.has(node)) return
  seen.add(node)
  const visit = (value: unknown) => {
    if (value instanceof Material) out.add(value as Material)
    else if (value instanceof Pass || value instanceof Effect) collect(value, out, seen)
  }
  if (node instanceof Pass) visit(node.fullscreenMaterial)
  Object.values(node).forEach((value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit)
    else visit(value)
  })
}

/** Triangle plein écran avec position et uv seulement, comme la géométrie des passes. */
function fullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))
  return geometry
}

async function warmComposer(gl: WebGLRenderer, target: WebGLRenderTarget): Promise<void> {
  const ready = await readyComposer()
  if (!ready) return
  const materials = new Set<Material>()
  const seen = new Set<object>()
  ready.passes.forEach((pass) => {
    collect(pass, materials, seen)
  })
  const scene = new Scene()
  const geometry = fullscreenTriangle()
  materials.forEach((material) => {
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    scene.add(mesh)
  })
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  const linear = gl.compileAsync(scene, camera)
  gl.setRenderTarget(null)
  const screen = gl.compileAsync(scene, camera)
  gl.setRenderTarget(previous)
  try {
    await Promise.all([linear, screen])
  } finally {
    geometry.dispose()
  }
}

function materialsOf(object: Object3D): Material[] {
  if (!(object instanceof Mesh)) return []
  const value: unknown = object.material
  const list: unknown[] = Array.isArray(value) ? value : [value]
  return list.filter((m): m is Material => m instanceof Material)
}

/** Compile toute la scène (et le composer si `offscreen`) sans rien afficher. */
export async function warmScene(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  offscreen: boolean,
): Promise<void> {
  const target = new WebGLRenderTarget(16, 16, { type: HalfFloatType })
  const hidden: Object3D[] = []
  scene.traverse((object) => {
    if (object.visible) return
    hidden.push(object)
    object.visible = true
  })
  const glass = new Set<MeshPhysicalMaterial>()
  scene.traverse((object) => {
    materialsOf(object).forEach((material) => {
      if (material instanceof MeshPhysicalMaterial && 'chromaticAberration' in material)
        glass.add(material)
    })
  })
  const plane = new PlaneGeometry(1, 1)
  const extras: Mesh[] = []
  if (glass.size > 0) extras.push(new Mesh(plane, new DiscardMaterial()))
  if (offscreen) {
    const title = new DissolveMaterial(new Texture(), new Color(), new Vector2(1, 1), 0)
    extras.push(new Mesh(plane, title))
  }
  extras.forEach((mesh) => {
    mesh.frustumCulled = false
    scene.add(mesh)
  })
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(offscreen ? target : null)
  const front = gl.compileAsync(scene, camera)
  const sides = new Map<MeshPhysicalMaterial, number>()
  glass.forEach((material) => {
    sides.set(material, material.side)
    material.side = BackSide
  })
  const back = glass.size > 0 ? gl.compileAsync(scene, camera) : null
  sides.forEach((side, material) => {
    material.side = side as typeof material.side
    material.needsUpdate = true
  })
  gl.setRenderTarget(previous)
  extras.forEach((mesh) => {
    scene.remove(mesh)
  })
  hidden.forEach((object) => {
    object.visible = false
  })
  try {
    await Promise.all([front, back, offscreen ? warmComposer(gl, target) : null])
  } finally {
    plane.dispose()
    target.dispose()
  }
}
