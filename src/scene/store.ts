// Pont DOM <-> 3D.
// - progress : objet mutable hors de l'état réactif. Les ScrollTrigger (côté DOM) l'écrivent via
//   setProgress à chaque tick de scrub, la scène le lit dans useFrame via getProgress/getTimeline.
//   Aucun abonné React n'est notifié : seul invalidate() est appelé (frameloop="demand").
// - ancres : éléments DOM que la scène mesure (titre du hero, cards projets), registre non réactif.
// - drapeaux : classes sur <html> posées par la scène, lues par le CSS (has-scene, has-3d-title).
// - hovered : état zustand (rare, peut être lu par l'UI), lu dans useFrame via useScene.getState().
import { create } from 'zustand'
import type { Project } from '../content/projects'

export type SectionId = 'hero' | 'projects' | 'services' | 'about' | 'contact'

/** Ids de progress : une clé par section, 'project:<slug>' par card. */
export type ProgressId = SectionId | `project:${string}`

const SECTIONS: readonly SectionId[] = ['hero', 'projects', 'services', 'about', 'contact']

const progress: Partial<Record<ProgressId, number>> = {}

/** Branché par <InvalidateBridge> une fois le Canvas monté. No-op tant que la scène n'existe pas. */
let invalidate: () => void = () => undefined

export function setInvalidate(fn: () => void) {
  invalidate = fn
}

export function requestFrame() {
  invalidate()
}

export function setProgress(id: ProgressId, value: number) {
  if (progress[id] === value) return
  progress[id] = value
  invalidate()
}

export function getProgress(id: ProgressId): number {
  return progress[id] ?? 0
}

/** Timeline caméra : somme des progress de section (hero = [0, 1], projects = [1, 2], etc.). */
export function getTimeline(): number {
  let t = 0
  for (const id of SECTIONS) t += progress[id] ?? 0
  return t
}

/** Ancres DOM mesurées par la scène. 'hero-title' : le h1, avec un <span data-word> par mot. */
export type AnchorId = 'hero-title' | `project:${string}`

const anchors = new Map<AnchorId, HTMLElement>()
const anchorListeners = new Set<() => void>()

export function registerAnchor(id: AnchorId, el: HTMLElement | null) {
  if (el) anchors.set(id, el)
  else anchors.delete(id)
  anchorListeners.forEach((fn) => {
    fn()
  })
}

export function getAnchor(id: AnchorId): HTMLElement | undefined {
  return anchors.get(id)
}

/** Prévenu quand une ancre change (montage tardif du DOM ou de la scène). */
export function onAnchorsChange(fn: () => void): () => void {
  anchorListeners.add(fn)
  return () => {
    anchorListeners.delete(fn)
  }
}

/** Drapeaux de la scène sur <html>, lus par le CSS du DOM. */
export type SceneFlag = 'has-scene' | 'has-3d-title'

export function setSceneFlag(flag: SceneFlag, on: boolean) {
  document.documentElement.classList.toggle(flag, on)
}

type SceneState = {
  hovered: Project['slug'] | null
  setHovered: (slug: Project['slug'] | null) => void
}

export const useScene = create<SceneState>((set) => ({
  hovered: null,
  setHovered: (slug) => {
    set({ hovered: slug })
    invalidate()
  },
}))
