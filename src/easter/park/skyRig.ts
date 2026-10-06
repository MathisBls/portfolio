// Easter egg v3, beat 8 (docs/storyboards/easter-park.md : « Ciel : Voie lactée, étoiles, nébuleuse
// douce » ; consigne de Mathis : nébuleuse en couches, rayons crépusculaires, lens flare, poussière qui
// défile près de la caméra) : tout ce qui suit la caméra, sans React. Ciel (skyMaterials.ts) et étoiles
// centrés sur elle, dessinés en premier ; rayons posés loin dans la direction du soleil, derrière les
// planètes ; flare en espace écran selon l'occultation (occlusion.ts) ; poussière de vitesse
// (particles.ts) étirée selon la vitesse de la trajectoire. Reduced-motion : ni poussière ni rotation.
import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  Group,
  LineSegments,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { seeded } from '../shaders'
import { pathPoint } from './camera'
import { SUN_DIR } from './layout'
import { type SunState, sunVisibility } from './occlusion'
import { createSpeedDust } from './particles'
import { type SkyMaterial, createFlare, createRaysMaterial, createSkyMaterial } from './skyMaterials'

export const SUN = new Vector3(...SUN_DIR).normalize()
const SKY_RADIUS = 760
const RAYS = { distance: 3000, size: 2200 }

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(p, p) * 4.0);
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <colorspace_fragment>
}`

type StarMaterial = ShaderMaterial & { uniforms: { uPixelRatio: { value: number } } }

function createStars(count: number): Points<BufferGeometry, StarMaterial> {
  const random = seeded(5)
  const position = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const color = new Float32Array(count * 3)
  const tints = ['#ffffff', '#ffe6d0', '#d6e4ff', '#ffd0ea'].map((c) => new Color(c))
  const r = SKY_RADIUS - 20
  for (let i = 0; i < count; i++) {
    const u = random() * 2 - 1
    const a = random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    position[i * 3] = s * Math.cos(a) * r
    position[i * 3 + 1] = u * r
    position[i * 3 + 2] = s * Math.sin(a) * r
    const bright = Math.pow(random(), 6)
    size[i] = 1.1 + bright * 3.4
    const tint = tints[Math.floor(random() * tints.length)] ?? new Color('#ffffff')
    const gain = 0.3 + bright * 1.7
    color[i * 3] = tint.r * gain
    color[i * 3 + 1] = tint.g * gain
    color[i * 3 + 2] = tint.b * gain
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aSize', new BufferAttribute(size, 1))
  geometry.setAttribute('aColor', new BufferAttribute(color, 3))
  const material = new ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  }) as StarMaterial
  const points = new Points(geometry, material)
  points.renderOrder = -999
  points.frustumCulled = false
  return points
}

export type SkyRig = {
  /** Racine (coordonnées monde) : à monter hors du groupe du parc. */
  root: Group
  sky: SkyMaterial
  dome: Group
  stars: Points<BufferGeometry, StarMaterial>
  rays: Mesh<PlaneGeometry, ReturnType<typeof createRaysMaterial>>
  flare: Mesh<BufferGeometry, ReturnType<typeof createFlare>['material']>
  dust: LineSegments<BufferGeometry, ReturnType<typeof createSpeedDust>['material']>
  dispose: () => void
}

export function buildSky(mobile: boolean): SkyRig {
  const root = new Group()
  root.visible = false
  const sky = createSkyMaterial(SUN, mobile)
  const sphere = new SphereGeometry(SKY_RADIUS, 64, 32)
  const dome = new Group()
  const skyMesh = new Mesh(sphere, sky)
  skyMesh.renderOrder = -1000
  skyMesh.frustumCulled = false
  dome.add(skyMesh)
  const stars = createStars(mobile ? 900 : 2200)
  dome.add(stars)
  const rays = new Mesh(new PlaneGeometry(1, 1), createRaysMaterial())
  rays.scale.setScalar(RAYS.size)
  rays.frustumCulled = false
  const flareParts = createFlare()
  const flare = new Mesh(flareParts.geometry, flareParts.material)
  flare.renderOrder = 950
  flare.frustumCulled = false
  const dustParts = createSpeedDust(mobile ? 220 : 520, 140)
  const dust = new LineSegments(dustParts.geometry, dustParts.material)
  dust.frustumCulled = false
  root.add(dome, rays, flare, dust)
  return {
    root,
    sky,
    dome,
    stars,
    rays,
    flare,
    dust,
    dispose: () => {
      sky.dispose()
      sphere.dispose()
      stars.geometry.dispose()
      stars.material.dispose()
      rays.geometry.dispose()
      rays.material.dispose()
      flare.geometry.dispose()
      flare.material.dispose()
      dust.geometry.dispose()
      dust.material.dispose()
    },
  }
}

export type SkyFrame = {
  on: boolean
  camera: Camera & { position: Vector3 }
  aspect: number
  dpr: number
  /** Temps du parc (rotation des rayons) et temps de la scène (vitesse de la poussière). */
  time: number
  scene: number
  reduced: boolean
  bloom: boolean
}

const sun: SunState = { visible: 1, limb: 0 }
const scratch = { sun: new Vector3(), forward: new Vector3(), a: new Vector3(), b: new Vector3() }

export function updateSky(rig: SkyRig, f: SkyFrame): void {
  rig.root.visible = f.on
  if (!f.on) return
  const { camera } = f
  rig.dome.position.copy(camera.position)
  rig.stars.material.uniforms.uPixelRatio.value = f.dpr
  sunVisibility(camera.position, SUN, sun)
  // Rayons : loin derrière les planètes, face caméra
  const rays = rig.rays
  rays.position.copy(camera.position).addScaledVector(SUN, RAYS.distance)
  rays.quaternion.copy(camera.quaternion)
  rays.material.uniforms.uTime.value = f.reduced ? 0 : f.time
  rays.material.uniforms.uIntensity.value = (0.05 * sun.visible + 1.1 * sun.limb) * (f.bloom ? 1 : 0.55)
  // Flare : position du soleil à l'écran ; nul s'il est caché, derrière la caméra ou hors champ
  camera.getWorldDirection(scratch.forward)
  const facing = scratch.forward.dot(SUN)
  scratch.sun.copy(camera.position).add(SUN).project(camera)
  const edge = Math.max(Math.abs(scratch.sun.x), Math.abs(scratch.sun.y))
  const onScreen = facing > 0 ? 1 - Math.min(1, Math.max(0, (edge - 0.85) / 0.4)) : 0
  const flare = rig.flare.material.uniforms
  flare.uSun.value.set(scratch.sun.x, scratch.sun.y)
  flare.uAspect.value = f.aspect
  flare.uIntensity.value = sun.visible * onScreen * (f.bloom ? 0.16 : 0.1)
  // Poussière : vitesse de la trajectoire (unités/s), qui étire les segments
  rig.dust.visible = !f.reduced
  if (f.reduced) return
  pathPoint(f.scene + 0.05, scratch.a)
  pathPoint(f.scene - 0.05, scratch.b)
  const dust = rig.dust.material.uniforms
  dust.uVelocity.value.subVectors(scratch.a, scratch.b).divideScalar(0.1)
  dust.uCamera.value.copy(camera.position)
  dust.uIntensity.value = 0.55 * Math.min(1, dust.uVelocity.value.length() / 30)
}
