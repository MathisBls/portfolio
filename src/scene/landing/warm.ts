// Brief agent V du 2026-10-09 : « fondu propre du poster vers la 3D quand la première image est rendue,
// après précompilation comme src/scene/warm.ts ». Version courte de warm.ts pour la visionneuse des pages
// d'atterrissage (ni postprocessing ni verre à transmission de drei : rien à importer de plus) :
// - programmes compilés en asynchrone (KHR_parallel_shader_compile) dans la variante du vrai rendu
//   (écran, environnement posé), objets masqués compris (compile() de three ne parcourt que le visible) ;
// - textures envoyées au GPU avant la première image (sinon chaque envoi fige celle-ci).
import {
  type Camera,
  Material,
  Mesh,
  type Object3D,
  type Scene,
  Texture,
  type WebGLRenderer,
} from 'three'

function materialsOf(object: Object3D): Material[] {
  if (!(object instanceof Mesh)) return []
  const value: unknown = object.material
  const list: unknown[] = Array.isArray(value) ? value : [value]
  return list.filter((m): m is Material => m instanceof Material)
}

/** Textures d'un matériau (map, normalMap, roughnessMap…), lues sur ses propriétés. */
function texturesOf(material: Material, out: Set<Texture>): void {
  Object.values(material).forEach((value: unknown) => {
    if (value instanceof Texture) out.add(value as Texture)
  })
}

export async function warmLanding(gl: WebGLRenderer, scene: Scene, camera: Camera): Promise<void> {
  const hidden: Object3D[] = []
  const textures = new Set<Texture>()
  scene.traverse((object) => {
    materialsOf(object).forEach((material) => {
      texturesOf(material, textures)
    })
    if (object.visible) return
    hidden.push(object)
    object.visible = true
  })
  textures.forEach((texture) => {
    gl.initTexture(texture)
  })
  const compiled = gl.compileAsync(scene, camera)
  hidden.forEach((object) => {
    object.visible = false
  })
  await compiled
}
