// Pont DOM <-> 3D.
// - progress : objet mutable hors de l'état réactif. Les ScrollTrigger (côté DOM) l'écrivent via
//   setProgress à chaque tick de scrub, la scène le lit dans useFrame via getProgress. Aucun abonné
//   React n'est notifié : seul invalidate() est appelé (frameloop="demand").
// - hovered : état zustand (rare, peut être lu par l'UI), lu dans useFrame via useScene.getState().
import { create } from 'zustand'
import type { Project } from '../content/projects'

/** Ids de progress : 'page' (scroll global), une clé par section, 'project:<slug>' par card. */
export type ProgressId =
  'page' | 'hero' | 'projects' | 'services' | 'about' | 'contact' | `project:${string}`

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
