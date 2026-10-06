// Easter egg v3, beats 5 à 7 (docs/storyboards/easter-park.md : « une forme minuscule grossit très
// lentement : une silhouette sombre, quelques reflets roses », puis « les lumières de la forme s'allument
// en rampe : c'est la porte du parc », puis « les portes s'ouvrent et la lumière inonde ») : la porte, sans
// React. Clones de Gate_* (park.glb ou remplacements, park/types.ts) ramenés à GATE_SIZE de large,
// émissifs éteints tant qu'elle n'est pas révélée, puis allumés en balayage (le mot BOULARDTV de gauche à
// droite, les feux de l'anneau du bas vers le haut), portes battantes vers l'intérieur du parc autour de
// leur charnière (origine des nœuds Gate_DoorL/R), lumière derrière elles, reflets roses.
import { Box3, Group, Mesh, type Object3D, PlaneGeometry, Vector3 } from 'three'
import { PARK_DIMS } from '../park/types'
import { createGlow, type GlowMaterial } from '../shaders'
import { GATE_SIZE } from './layout'
import { type Lit, type Ramp, type Shaded, addRamp, cloneNode, setLit, setShade } from './rig'
import type { SpaceNodes } from './useSpaceParts'

type Door = { pivot: Object3D; side: -1 | 1 }

export type GateRig = {
  /** Repère monde de la porte (position et orientation posées par frame). */
  root: Group
  doors: Door[]
  /** Émissifs allumés d'un bloc (anneau, portes) et émissifs balayés (enseigne, feux). */
  lit: Lit[]
  swept: Lit[]
  /** Tous les matériaux : reflets d'environnement coupés tant que la porte est une silhouette. */
  shaded: Shaded[]
  ramp: Ramp
  glints: { mesh: Mesh; material: GlowMaterial; phase: number }[]
  glare: { mesh: Mesh; material: GlowMaterial }
  dispose: () => void
}

/** Reflets roses sur l'anneau (angles en radians), visibles quand la porte est encore éteinte. */
const GLINTS = [0.35, 1.25, 2.4, 3.9, 5.2]
const size = new Vector3()

export function buildGate(nodes: SpaceNodes, bloom: boolean): GateRig {
  const root = new Group()
  const model = new Group()
  root.add(model)
  const disposers: (() => void)[] = []
  const lit: Lit[] = []
  const swept: Lit[] = []
  const shaded: Shaded[] = []
  const ramp: Ramp = { value: 0 }
  const add = (node: Object3D | undefined, parent: Object3D, sweep = false) => {
    if (!node) return null
    const clone = cloneNode(node, bloom)
    parent.add(clone.root)
    shaded.push(...clone.shaded)
    if (sweep) {
      clone.lit.forEach(({ material }) => {
        addRamp(material, ramp)
      })
      swept.push(...clone.lit)
    } else {
      lit.push(...clone.lit)
    }
    disposers.push(clone.dispose)
    return clone.root
  }
  const ring = add(nodes.Gate_Ring, model)
  add(nodes.Gate_Sign, model, true)
  add(nodes.Gate_Lights, model, true)
  // Échelle d'après la largeur de l'anneau (centré à l'origine, park/types.ts)
  new Box3().setFromObject(ring ?? model).getSize(size)
  model.scale.setScalar(GATE_SIZE / Math.max(size.x, 1e-3))
  // Portes : l'origine du nœud est la charnière, le battant pivote autour d'elle
  const doors: Door[] = []
  ;(['Gate_DoorL', 'Gate_DoorR'] as const).forEach((name, i) => {
    const door = add(nodes[name], model)
    if (door) doors.push({ pivot: door, side: i === 0 ? -1 : 1 })
  })
  // Lumière derrière les portes, visible par l'ouverture, puis qui inonde
  const plane = new PlaneGeometry(1, 1)
  const glareMaterial = createGlow('#ffe3f0', 1.3)
  const glare = new Mesh(plane, glareMaterial)
  glare.position.z = -GATE_SIZE * 0.1
  glare.scale.setScalar(GATE_SIZE * 1.05)
  root.add(glare)
  const glints = GLINTS.map((angle, i) => {
    const material = createGlow('#ff6fb5', 2.6)
    const mesh = new Mesh(plane, material)
    mesh.position.set(
      Math.cos(angle) * GATE_SIZE * 0.44,
      Math.sin(angle) * GATE_SIZE * 0.44,
      GATE_SIZE * 0.05,
    )
    root.add(mesh)
    return { mesh, material, phase: i * 1.7 }
  })
  return {
    root,
    doors,
    lit,
    swept,
    shaded,
    ramp,
    glints,
    glare: { mesh: glare, material: glareMaterial },
    dispose: () => {
      disposers.forEach((dispose) => {
        dispose()
      })
      plane.dispose()
      glareMaterial.dispose()
      glints.forEach(({ material }) => {
        material.dispose()
      })
    },
  }
}

export type GateInput = {
  distance: number
  /** Lumières de la porte (0 éteinte -> 1) : balayage de l'enseigne et des feux, puis le reste. */
  lights: number
  doors: number
  glare: number
  /** Reflets roses (0 -> 1) et temps de leur respiration lente. */
  glints: number
  time: number
}

/** Réglage par frame : allumage, ouverture, lumière derrière les portes, reflets. */
export function updateGate(rig: GateRig, input: GateInput): void {
  rig.ramp.value = input.lights
  setLit(rig.swept, input.lights > 0 ? 1 : 0)
  setLit(rig.lit, input.lights)
  setShade(rig.shaded, 0.04 + 0.96 * input.lights)
  for (const { pivot, side } of rig.doors) {
    pivot.rotation.y = -side * input.doors * PARK_DIMS.gateDoorMaxAngle
  }
  const glare = input.glare * (0.25 + 0.75 * input.doors)
  rig.glare.material.uniforms.uIntensity.value = 3.2 * glare
  rig.glare.mesh.visible = glare > 0.002
  // Reflets : taille minimale à l'écran (proportionnelle à la distance), respiration très lente
  const s = Math.max(1.5, input.distance * 0.015)
  for (const glint of rig.glints) {
    const level = input.glints * (1.3 + 0.4 * Math.sin(input.time * 0.8 + glint.phase))
    glint.material.uniforms.uIntensity.value = level
    glint.mesh.visible = level > 0.002
    glint.mesh.scale.setScalar(s)
  }
}
