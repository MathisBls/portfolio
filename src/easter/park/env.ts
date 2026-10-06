// Easter egg v3, beat 8 (consigne : « environnement pour les reflets métalliques, comme ailleurs dans le
// projet ») : carte d'environnement du parc, construite une fois en local (PMREM d'une petite scène de
// panneaux lumineux, comme les Lightformers de Lighting.tsx, sans HDR téléchargé) : le soleil chaud dans
// sa direction, deux bandes néon (rose BoulardTV, cyan) et un dégradé violet très sombre. Elle n'est
// appliquée qu'aux matériaux du parc (applyEnvironment) : le reste de la séquence garde Lighting.
import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from 'three'

const GRADIENT_FRAG = /* glsl */ `
varying vec3 vDir;
void main() {
  float y = normalize(vDir).y;
  vec3 top = vec3(0.05, 0.025, 0.09);
  vec3 bottom = vec3(0.004, 0.002, 0.008);
  gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.6, 0.8, y)), 1.0);
}`

const GRADIENT_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export type ParkEnvironment = { texture: Texture; dispose: () => void }

export function createParkEnvironment(gl: WebGLRenderer, sunDir: Vector3): ParkEnvironment {
  const scene = new Scene()
  const owned: { dispose: () => void }[] = []
  const dome = new SphereGeometry(50, 32, 16)
  const domeMaterial = new ShaderMaterial({
    vertexShader: GRADIENT_VERT,
    fragmentShader: GRADIENT_FRAG,
    side: BackSide,
  })
  owned.push(dome, domeMaterial)
  scene.add(new Mesh(dome, domeMaterial))
  const panel = new PlaneGeometry(1, 1)
  owned.push(panel)
  const light = (color: string, gain: number, at: Vector3, w: number, h: number) => {
    const material = new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(gain),
      side: DoubleSide,
    })
    owned.push(material)
    const mesh = new Mesh(panel, material)
    mesh.position.copy(at)
    mesh.scale.set(w, h, 1)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }
  light('#fff0dc', 14, sunDir.clone().multiplyScalar(30), 8, 8)
  light('#ff4fa8', 3, new Vector3(-30, 6, 4), 4, 30)
  light('#59e1ff', 2.2, new Vector3(24, -4, 18), 3, 24)
  light('#b58cff', 1.2, new Vector3(0, 30, 0), 30, 30)
  const pmrem = new PMREMGenerator(gl)
  const target = pmrem.fromScene(scene, 0.035)
  pmrem.dispose()
  owned.forEach((item) => {
    item.dispose()
  })
  return {
    texture: target.texture,
    dispose: () => {
      target.dispose()
    },
  }
}
