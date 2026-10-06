// Easter egg : chargement des GLB de public/models/easter/ (Draco, décodeur local /draco/ comme useModel).
// Le préchargement part à l'évaluation du chunk lazy : les trois fichiers se téléchargent en parallèle
// pendant que React monte la scène. Noms des nœuds : ceux de Blender (B_*, CARD_*, B_Logo).
import { useGLTF } from '@react-three/drei'
import { type Group, type Material, Mesh, type Object3D } from 'three'

const DRACO_PATH = '/draco/'

export const EASTER_MODELS = {
  arena: '/models/easter/arena.glb',
  cards: '/models/easter/cards.glb',
  logo: '/models/easter/b_logo.glb',
} as const

export type EasterModel = keyof typeof EASTER_MODELS

export type EasterGLTF = {
  scene: Group
  nodes: Partial<Record<string, Object3D>>
  materials: Partial<Record<string, Material>>
}

export function useEasterModel(name: EasterModel): EasterGLTF {
  return useGLTF(EASTER_MODELS[name], DRACO_PATH)
}

export function preloadEasterModels(): void {
  Object.values(EASTER_MODELS).forEach((url) => {
    useGLTF.preload(url, DRACO_PATH)
  })
}

/** Maillages d'un objet (lui compris), dans l'ordre de parcours. */
export function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  root.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child as Mesh)
  })
  return meshes
}
