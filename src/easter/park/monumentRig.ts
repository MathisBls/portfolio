// Easter egg v3, beats 8 et 9 (docs/storyboards/easter-park.md : « Le B géant (b_logo.glb) au centre du
// parc, comme un monument ou un soleil, avec des feux d'artifice lents ») : le B (buildGiant, épaissi
// comme au final d'origine) à l'échelle MONUMENT.scale, sa face lisible tournée vers la caméra qui
// s'arrête devant lui ; balancement lent ; deux anneaux de lumière qui tournent autour ; halo rose et cœur
// chaud derrière lui, qui montent avec P.halo. Reduced-motion : immobile. Sans React ; par frame :
// updateMonument.
import {
  type Camera,
  Color,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { THICKNESS, buildGiant, thicknessOffset } from '../giantRig'
import { type GlowMaterial, createGlow, updateGlow } from '../shaders'
import { monumentFacing } from './camera'
import { MONUMENT } from './layout'

export type MonumentRig = {
  root: Group
  sway: Group
  rings: Mesh[]
  outer: Mesh
  inner: Mesh
  outerGlow: GlowMaterial
  innerGlow: GlowMaterial
  dispose: () => void
}

function noFog(root: Object3D) {
  root.traverse((child) => {
    const material = (child as Object3D & { material?: Material }).material
    if (material instanceof MeshStandardMaterial) material.fog = false
  })
}

export function buildMonument(logo: Object3D, bloom: boolean): MonumentRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  const center = new Vector3(...MONUMENT.center)
  const anchor = new Group()
  anchor.position.copy(center)
  // −Z du B (face lisible) vers la caméra du final
  anchor.lookAt(center.clone().addScaledVector(monumentFacing(), -100))
  const sway = new Group()
  const scaled = new Group()
  scaled.scale.setScalar(MONUMENT.scale)
  const thick = new Group()
  thick.scale.z = THICKNESS
  thick.position.z = thicknessOffset(THICKNESS)
  const giant = buildGiant(logo, bloom)
  noFog(giant.root)
  owned.push(giant)
  thick.add(giant.root)
  scaled.add(thick)
  sway.add(scaled)
  anchor.add(sway)
  // Anneaux de lumière autour du B
  const rings: Mesh[] = []
  const gain = bloom ? 2.6 : 1
  for (const [radius, tilt, color] of [
    [118, 1.2, '#ff4fa8'],
    [132, 1.95, '#ffd6e8'],
  ] as const) {
    const geometry = new TorusGeometry(radius, 0.7, 8, 320)
    const material = new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(gain),
      toneMapped: false,
      fog: false,
    })
    const ring = new Mesh(geometry, material)
    ring.rotation.x = tilt
    anchor.add(ring)
    rings.push(ring)
    owned.push(geometry, material)
  }
  root.add(anchor)
  // Halo : dégradés additifs derrière le B
  const outerGlow = createGlow('#ff4fa8', 2.8)
  const innerGlow = createGlow('#ffd2c8', 3.2)
  const plane = new PlaneGeometry(1, 1)
  const outer = new Mesh(plane, outerGlow)
  outer.scale.setScalar(460)
  const inner = new Mesh(plane, innerGlow)
  inner.scale.setScalar(200)
  root.add(outer, inner)
  owned.push(outerGlow, innerGlow, plane)
  return {
    root,
    sway,
    rings,
    outer,
    inner,
    outerGlow,
    innerGlow,
    dispose: () => {
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

const away = new Vector3()
const center = new Vector3(...MONUMENT.center)

export type MonumentFrame = {
  visible: boolean
  time: number
  halo: number
  reduced: boolean
  bloom: boolean
  camera: Camera
  /** Position de la caméra dans le repère du parc. */
  eye: Vector3
}

export function updateMonument(rig: MonumentRig, f: MonumentFrame): void {
  rig.root.visible = f.visible
  if (!f.visible) return
  const t = f.reduced ? 0 : f.time
  rig.sway.rotation.y = 0.22 * Math.sin(t * 0.21)
  rig.sway.position.y = 3 * Math.sin(t * 0.33)
  rig.rings.forEach((ring, i) => {
    ring.rotation.z = (i === 0 ? 0.05 : -0.035) * t
  })
  away.subVectors(center, f.eye).normalize()
  rig.outer.position.copy(center).addScaledVector(away, 160)
  rig.inner.position.copy(center).addScaledVector(away, 90)
  const gain = f.bloom ? 1 : 0.55
  updateGlow(rig.outer, rig.outerGlow, f.camera, 0.55 * f.halo * gain)
  updateGlow(rig.inner, rig.innerGlow, f.camera, 0.3 * f.halo * gain)
}
