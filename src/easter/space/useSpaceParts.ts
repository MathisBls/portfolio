// Easter egg v3, beats 4 à 7 (docs/storyboards/easter-park.md, « Noms de nœuds de park.glb ») : nœuds du
// cockpit et de la porte. Ceux de park.glb (agent B) quand il les contient, sinon les pièces de
// remplacement construites en code (fallbacks.ts), nœud par nœud.
import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import { buildSpaceFallbacks } from './fallbacks'

export type SpaceNodes = Partial<Record<string, Object3D>>

export const COCKPIT_NODES = [
  'Cockpit_Frame',
  'Cockpit_Dash',
  'Cockpit_ScreenL',
  'Cockpit_ScreenC',
  'Cockpit_ScreenR',
  'Cockpit_Stick',
] as const
export const GATE_NODES = [
  'Gate_Ring',
  'Gate_DoorL',
  'Gate_DoorR',
  'Gate_Sign',
  'Gate_Lights',
] as const

/** Nœuds de l'espace : `model` (park.glb) d'abord, remplacements pour les manquants. */
export function useSpaceParts(model: SpaceNodes | null): SpaceNodes {
  const fallback = useMemo(() => buildSpaceFallbacks(), [])
  useEffect(() => fallback.dispose, [fallback])
  return useMemo(() => {
    const nodes: SpaceNodes = {}
    for (const name of [...COCKPIT_NODES, ...GATE_NODES]) {
      nodes[name] = model?.[name] ?? fallback.nodes[name]
    }
    return nodes
  }, [model, fallback])
}
