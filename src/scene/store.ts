// Pont DOM <-> 3D. Les ScrollTrigger (côté DOM) écrivent le progress ; la scène le lit dans useFrame
// via useScene.getState() (jamais via le hook : pas de re-render par frame).
import { create } from 'zustand'
import type { Project } from '../content/projects'

/** Ids de progress : 'page' (scroll global), une clé par section, 'project:<slug>' par card. */
export type ProgressId =
  'page' | 'hero' | 'projects' | 'services' | 'about' | 'contact' | `project:${string}`

type SceneState = {
  progress: Partial<Record<ProgressId, number>>
  hovered: Project['slug'] | null
  /** Branché par <InvalidateBridge> une fois le Canvas monté (frameloop="demand"). */
  invalidate: () => void
  setProgress: (id: ProgressId, value: number) => void
  setHovered: (slug: Project['slug'] | null) => void
  setInvalidate: (fn: () => void) => void
}

export const useScene = create<SceneState>((set, get) => ({
  progress: {},
  hovered: null,
  invalidate: () => undefined,
  setProgress: (id, value) => {
    set((s) => ({ progress: { ...s.progress, [id]: value } }))
    get().invalidate()
  },
  setHovered: (slug) => {
    set({ hovered: slug })
    get().invalidate()
  },
  setInvalidate: (fn) => {
    set({ invalidate: fn })
  },
}))

export const getProgress = (id: ProgressId): number => useScene.getState().progress[id] ?? 0
