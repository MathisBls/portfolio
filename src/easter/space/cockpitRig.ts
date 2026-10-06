// Easter egg v3, beats 4 à 9 (docs/storyboards/easter-park.md : « Le cockpit de l'Explorer apparaît
// autour de nous (montants de verrière, tableau de bord, HUD) ») : le cockpit, sans React. Clones de
// Cockpit_* (park.glb ou remplacements), écrans remplacés par des CanvasTexture (hud.ts) redessinées
// quelques fois par seconde, liserés émissifs qui s'allument avec E.cockpit. Mobile : écrans en basse
// définition, redessinés moins souvent, sans animation (HUD simplifié).
import {
  Box3,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { type HudData, createHudData, drawComms, drawRadar, drawTarget } from './hud'
import { type Lit, cloneNode, setLit } from './rig'
import type { SpaceNodes } from './useSpaceParts'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, d: HudData) => void

type HudScreen = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: CanvasTexture
  material: MeshBasicMaterial
  draw: Draw
}

export type CockpitRig = {
  root: Group
  screens: HudScreen[]
  lit: Lit[]
  data: HudData
  /** Prochain instant de redessin des écrans (s). */
  next: number
  /** Intervalle entre deux redessins (s). */
  every: number
  dispose: () => void
}

const SCREENS: readonly (readonly [string, Draw])[] = [
  ['Cockpit_ScreenL', drawComms],
  ['Cockpit_ScreenC', drawRadar],
  ['Cockpit_ScreenR', drawTarget],
]

const size = new Vector3()

/** Proportions d'un écran (largeur / hauteur) d'après sa géométrie : les deux plus grandes dimensions. */
function screenAspect(mesh: Mesh): number {
  const geometry = mesh.geometry
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  ;(geometry.boundingBox ?? new Box3()).getSize(size)
  const [a = 1, b = 1] = [size.x * mesh.scale.x, size.y * mesh.scale.y, size.z * mesh.scale.z]
    .map(Math.abs)
    .sort((x, y) => y - x)
  return a / Math.max(b, 1e-4)
}

const isMesh = (object: Object3D): object is Mesh => (object as Partial<Mesh>).isMesh === true

/** Écran du cockpit : même géométrie et même place que le nœud, matériau sur un canvas du HUD. */
function makeScreen(
  node: Object3D,
  draw: Draw,
  width: number,
  fromModel: boolean,
): { mesh: Mesh; screen: HudScreen } | null {
  if (!isMesh(node)) return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(width / screenAspect(node))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  // UV glTF (park/types.ts : image à l'endroit sans retournement)
  texture.flipY = !fromModel
  texture.anisotropy = 4
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false })
  const mesh = new Mesh(node.geometry, material)
  mesh.name = node.name
  mesh.position.copy(node.position)
  mesh.quaternion.copy(node.quaternion)
  mesh.scale.copy(node.scale)
  return { mesh, screen: { canvas, ctx, texture, material, draw } }
}

export function buildCockpit(
  nodes: SpaceNodes,
  model: SpaceNodes | null,
  mobile: boolean,
  bloom: boolean,
): CockpitRig {
  const root = new Group()
  const disposers: (() => void)[] = []
  const lit: Lit[] = []
  for (const name of ['Cockpit_Frame', 'Cockpit_Dash', 'Cockpit_Stick']) {
    const node = nodes[name]
    if (!node) continue
    const clone = cloneNode(node, bloom)
    root.add(clone.root)
    lit.push(...clone.lit)
    disposers.push(clone.dispose)
  }
  const screens: HudScreen[] = []
  for (const [name, draw] of SCREENS) {
    const node = nodes[name]
    const fromModel = Boolean(model?.[name])
    const made = node ? makeScreen(node, draw, mobile ? 256 : 512, fromModel) : null
    if (!made) continue
    root.add(made.mesh)
    screens.push(made.screen)
    disposers.push(() => {
      made.screen.texture.dispose()
      made.screen.material.dispose()
    })
  }
  return {
    root,
    screens,
    lit,
    data: createHudData(),
    next: 0,
    every: mobile ? 1 / 6 : 1 / 15,
    dispose: () => {
      disposers.forEach((dispose) => {
        dispose()
      })
    },
  }
}

/** Réglage par frame : liserés, puis écrans redessinés à leur cadence (les données sont déjà à jour). */
export function updateCockpit(rig: CockpitRig, time: number, power: number): void {
  setLit(rig.lit, power)
  if (time < rig.next) return
  rig.next = time + rig.every
  for (const screen of rig.screens) {
    screen.draw(screen.ctx, screen.canvas.width, screen.canvas.height, rig.data)
    screen.texture.needsUpdate = true
  }
}
