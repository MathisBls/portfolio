// Storyboard projets (docs/storyboards/projects.md §2, projects 0.2–0.9) : « Pour la card active
// (activeIndex) : [...] son rayon se réoriente vers l'objet, s'allonge jusqu'à lui et prend la couleur de
// l'accent. » Retour de Mathis : pendant les projets, seul le rayon actif est affiché, du prisme jusqu'au
// bord de son objet ; les autres sont rétractés et éteints, fondu de ~0.4 s quand la card active change.
// §4 : « assignRays(projects.map(p => p.accent)) donne l'indice du rayon par projet ». §6 risque 2 : le
// prisme hors cadre est masqué (cullGlass). Review du hero : le spectre naît sur la face de sortie.
// Logique du prisme après le hero, sortie de Prism.tsx (aucune allocation par frame).
import type { RootState } from '@react-three/fiber'
import { type Camera, Color, Frustum, Matrix4, type Mesh, type Object3D, Vector3 } from 'three'
import { projects } from '../../content/projects'
import { focusPresence } from '../../lib/journey'
import { clamp, lerp } from '../../lib/math'
import { RAY_COLORS, activeIndex, assignRays } from '../../lib/projects'
import { cloneEmissive, emissivePeak } from '../materials/emissive'
import { getProgress } from '../store'
import type { PrismGLTF } from './types'
import { exitPoint, segment } from './segment'
import { type AnchoredTarget, measureTarget } from './useAnchoredObject'

const RAY_OF_PROJECT = assignRays(projects.map((p) => p.accent))
/** Projet de chaque rayon (−1 : rayon sans projet, jamais affiché pendant les projets). */
const PROJECT_OF_RAY = RAY_COLORS.map((_, r) => RAY_OF_PROJECT.indexOf(r))
const IDS = projects.map((p) => `project:${p.slug}` as const)

const SPEC = ['Spec0', 'Spec1', 'Spec2', 'Spec3', 'Spec4', 'Spec5', 'Spec6'] as const

/**
 * Rayons Spec0..6 du GLB. Ils partent tous du point de sortie (`exit`) : la droite du rayon central coupe
 * la face droite du prisme (les départs du GLB sont 0.34 plus loin, dans le vide). `extra` allonge chaque
 * rayon d'autant, en multiples de sa longueur, pour que son extrémité ne bouge pas. Matériau émissif
 * cloné, teinte (couleur du GLB vers l'accent du projet associé) et pic d'intensité de l'accent.
 */
export function buildRays(
  nodes: PrismGLTF['nodes'],
  materials: PrismGLTF['materials'],
  bloom: boolean,
) {
  const exit = exitPoint(nodes.Prism, segment(nodes.Spec3))
  const rays = SPEC.map((name, i) => {
    const seg = segment(nodes[name])
    const emissive = cloneEmissive(materials[name], bloom)
    const base = emissive.material.emissive.clone()
    const diffuse = emissive.material.color.clone()
    const project = projects[PROJECT_OF_RAY[i] ?? -1]
    const accent = project ? new Color(project.accent) : base
    return {
      name,
      geometry: nodes[name].geometry,
      ...seg,
      x0: exit.x,
      y0: exit.y,
      extra: Math.hypot(seg.x0 - exit.x, seg.y0 - exit.y) / (2 * seg.half),
      ...emissive,
      tint: { emissive: base, diffuse, to: accent },
      accentPeak: emissivePeak(accent, bloom),
    }
  })
  return { exit, rays }
}

/** Fondu d'un rayon à l'autre quand la card active change : ~0.4 s (95 %). */
const SELECT_RATE = 7.5
const MAX_DT = 1 / 10

export type RayFocus = {
  /** Par projet : sélection lissée (1 : projet actif), cible mesurée pour la frame. */
  selection: number[]
  targets: (Readonly<AnchoredTarget> | undefined)[]
  /** Par rayon, pendant les projets : 0 rétracté et éteint, 1 jusqu'au bord de son objet. */
  show: number[]
}

export const createRayFocus = (): RayFocus => ({
  selection: projects.map(() => 0),
  targets: projects.map(() => undefined),
  show: RAY_COLORS.map(() => 0),
})

const progresses = projects.map(() => 0)
const weights = projects.map(() => 0)

/** Présence de chaque rayon : projet actif (lissé), entrée et sortie de sa card (scroll). */
export function updateRayFocus(focus: RayFocus, state: RootState, delta: number) {
  for (let j = 0; j < IDS.length; j++) {
    const id = IDS[j]
    progresses[j] = id ? getProgress(id) : 0
  }
  const active = activeIndex(progresses)
  const k = clamp(1 - Math.exp(-SELECT_RATE * Math.min(delta, MAX_DT)))
  for (let j = 0; j < projects.length; j++) {
    const project = projects[j]
    const target = project ? measureTarget(project.slug, state) : undefined
    const selection = lerp(focus.selection[j] ?? 0, j === active ? 1 : 0, k)
    focus.selection[j] = selection
    focus.targets[j] = target
    weights[j] = target?.visible ? selection * focusPresence(progresses[j] ?? 0) : 0
  }
  for (let r = 0; r < PROJECT_OF_RAY.length; r++) {
    focus.show[r] = weights[PROJECT_OF_RAY[r] ?? -1] ?? 0
  }
}

const inverse = new Matrix4()
const local = new Vector3()
let parentScale = 1

/** Repère des rayons (parent des pivots, déjà posé pour la frame) : conversion monde → local. */
export function beginAim(parent: Object3D) {
  parent.updateWorldMatrix(true, false)
  inverse.copy(parent.matrixWorld).invert()
  parentScale = parent.matrixWorld.getMaxScaleOnAxis()
}

const pose = { rotation: 0, length: 0, show: 1 }
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Pose du rayon r (rotation Z du pivot, longueur en multiples du rayon du GLB, présence). `mode` 0
 * (hero) : éventail au repos (`rest`, `length`). `mode` 1 (projets) : vers son objet, du prisme
 * jusqu'au bord de l'objet à proportion de show[r] ; sans cible, il garde son orientation (`current`)
 * en se rétractant. Bord : demi-taille de l'objet (petit côté, à l'échelle) divisée par la composante
 * dominante de la direction, donc jamais à l'intérieur de sa boîte. Objet partagé, à lire tout de suite.
 */
export function aimRay(
  focus: RayFocus,
  r: number,
  ray: { x0: number; y0: number; half: number },
  rest: number,
  length: number,
  mode: number,
  current: number,
) {
  pose.rotation = rest
  pose.length = length
  pose.show = 1
  if (mode <= 0) return pose
  const show = focus.show[r] ?? 0
  const target = focus.targets[PROJECT_OF_RAY[r] ?? -1]
  let aimed = current
  let reach = 0
  if (target?.visible) {
    local.copy(target.position).applyMatrix4(inverse)
    const dx = local.x - ray.x0
    const dy = local.y - ray.y0
    const distance = Math.hypot(dx, dy)
    const edge =
      ((target.radius / parentScale) * distance) / Math.max(Math.abs(dx), Math.abs(dy), 1e-6)
    aimed = Math.atan2(dy, dx) - Math.PI / 2
    reach = Math.max(distance - edge, 0)
  }
  pose.rotation = rest + wrapAngle(aimed - rest) * mode
  pose.length = lerp(length, (reach / (2 * ray.half)) * show, mode)
  pose.show = lerp(1, show, mode)
  return pose
}

const frustum = new Frustum()
const viewProjection = new Matrix4()

/**
 * Masque le verre hors du champ (mesh et matériau : MeshTransmissionMaterial ne saute ses passes FBO que
 * si son matériau est invisible). Renvoie true s'il est à l'écran.
 */
export function cullGlass(mesh: Mesh, camera: Camera) {
  mesh.updateWorldMatrix(true, false)
  camera.updateMatrixWorld()
  viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  const visible = frustum.setFromProjectionMatrix(viewProjection).intersectsObject(mesh)
  mesh.visible = visible
  const { material } = mesh
  if (Array.isArray(material)) for (const m of material) m.visible = visible
  else material.visible = visible
  return visible
}
