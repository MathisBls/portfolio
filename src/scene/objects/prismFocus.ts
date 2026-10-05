// Storyboard projets (docs/storyboards/projects.md §2, projects 0.2–0.9) : « Pour la card active
// (activeIndex) : [...] son rayon se réoriente vers l'objet, s'allonge jusqu'à lui et prend la couleur de
// l'accent. Les autres rayons tombent à 15 %. » §4 : « assignRays(projects.map(p => p.accent)) donne
// l'indice du rayon par projet ». §6 risque 2 : le prisme hors cadre est masqué (inFrustum).
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
import { segment } from './segment'
import { type AnchoredTarget, measureTarget } from './useAnchoredObject'

const RAY_OF_PROJECT = assignRays(projects.map((p) => p.accent))
/** Projet de chaque rayon (−1 : rayon sans projet, jamais visé). */
const PROJECT_OF_RAY = RAY_COLORS.map((_, r) => RAY_OF_PROJECT.indexOf(r))
const IDS = projects.map((p) => `project:${p.slug}` as const)

const SPEC = ['Spec0', 'Spec1', 'Spec2', 'Spec3', 'Spec4', 'Spec5', 'Spec6'] as const

/**
 * Rayons Spec0..6 du GLB : géométrie, segment, matériau émissif cloné (hero), accent du projet associé
 * avec son pic d'intensité (le rayon sans projet garde sa couleur), et `sdr` : intensité qui affiche la
 * couleur pleine sans HDR, base de l'atténuation à 15 % (15 % d'un pic HDR resterait saturé).
 */
export function buildRays(
  nodes: PrismGLTF['nodes'],
  materials: PrismGLTF['materials'],
  bloom: boolean,
) {
  return SPEC.map((name, i) => {
    const emissive = cloneEmissive(materials[name], bloom)
    const base = emissive.material.emissive.clone()
    const project = projects[PROJECT_OF_RAY[i] ?? -1]
    const accent = project ? new Color(project.accent) : base
    const accentPeak = emissivePeak(accent, bloom)
    const sdr = emissivePeak(base, false)
    return {
      name,
      geometry: nodes[name].geometry,
      ...segment(nodes[name]),
      ...emissive,
      base,
      accent,
      accentPeak,
      sdr,
    }
  })
}

/** Changement de projet actif lissé (1/s) : pas de saut d'un rayon à l'autre. */
const SELECT_RATE = 6
const MAX_DT = 1 / 20
/** Le rayon s'arrête avant le centre de l'objet, à cette part de sa demi-taille (sur son bord). */
const REACH_GAP = 0.85

export type RayFocus = {
  /** Par projet : sélection lissée, cible mesurée pour la frame. */
  selection: number[]
  targets: (Readonly<AnchoredTarget> | undefined)[]
  /** Par rayon : visée (0 repos, 1 sur l'objet) et atténuation (0 plein, 1 → JOURNEY.dim). */
  aim: number[]
  dim: number[]
}

export const createRayFocus = (): RayFocus => ({
  selection: projects.map(() => 0),
  targets: projects.map(() => undefined),
  aim: RAY_COLORS.map(() => 0),
  dim: RAY_COLORS.map(() => 0),
})

const progresses = projects.map(() => 0)
const weights = projects.map(() => 0)

/** Visée de chaque rayon pour la frame : progress des cards (scroll), objet actif lissé. */
export function updateRayFocus(focus: RayFocus, state: RootState, delta: number) {
  for (let j = 0; j < IDS.length; j++) {
    const id = IDS[j]
    progresses[j] = id ? getProgress(id) : 0
  }
  const active = activeIndex(progresses)
  const k = clamp(1 - Math.exp(-SELECT_RATE * Math.min(delta, MAX_DT)))
  let strongest = 0
  for (let j = 0; j < projects.length; j++) {
    const project = projects[j]
    const target = project ? measureTarget(project.slug, state) : undefined
    const selection = lerp(focus.selection[j] ?? 0, j === active ? 1 : 0, k)
    focus.selection[j] = selection
    focus.targets[j] = target
    const w = target?.visible ? selection * focusPresence(progresses[j] ?? 0) : 0
    weights[j] = w
    strongest = Math.max(strongest, w)
  }
  for (let r = 0; r < PROJECT_OF_RAY.length; r++) {
    const a = weights[PROJECT_OF_RAY[r] ?? -1] ?? 0
    focus.aim[r] = a
    focus.dim[r] = clamp(strongest - a)
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

const pose = { rotation: 0, length: 0 }
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Pose du rayon r (rotation Z du pivot, longueur en multiples du rayon du GLB) : du repos vers son
 * objet selon focus.aim[r]. Renvoie un objet partagé, à lire tout de suite.
 */
export function aimRay(
  focus: RayFocus,
  r: number,
  ray: { x0: number; y0: number; half: number },
  rotation: number,
  length: number,
) {
  pose.rotation = rotation
  pose.length = length
  const a = focus.aim[r] ?? 0
  const target = focus.targets[PROJECT_OF_RAY[r] ?? -1]
  if (a <= 0 || !target) return pose
  local.copy(target.position).applyMatrix4(inverse)
  const dx = local.x - ray.x0
  const dy = local.y - ray.y0
  const reach = Math.max(Math.hypot(dx, dy) - (target.radius / parentScale) * REACH_GAP, 0)
  pose.rotation += wrapAngle(Math.atan2(dy, dx) - Math.PI / 2 - rotation) * a
  pose.length = lerp(length, reach / (2 * ray.half), a)
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
