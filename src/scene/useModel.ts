// Chargement des GLB : chemin Draco local centralisé ici (sinon drei va chercher le décodeur sur un CDN).
// À n'importer que depuis le chunk de la scène (drei/three ne doivent pas entrer dans le JS initial).
import { useGLTF } from '@react-three/drei'
import type { Project } from '../content/projects'
import type {
  FitnessGLTF,
  GameFactoryGLTF,
  PizzaGLTF,
  PrismGLTF,
  QuorinGLTF,
  WegirGLTF,
  ZephyrGLTF,
} from './objects/types'

type ModelMap = {
  prism: PrismGLTF
  zephyr: ZephyrGLTF
  wegir: WegirGLTF
  quorin: QuorinGLTF
  gamefactory: GameFactoryGLTF
  pizza: PizzaGLTF
  fitness: FitnessGLTF
}

export type ModelName = keyof ModelMap & Project['model']

export const DRACO_PATH = '/draco/'
const modelUrl = (name: ModelName) => `/models/${name}.glb`

export function useModel<K extends ModelName>(name: K): ModelMap[K] {
  return useGLTF(modelUrl(name), DRACO_PATH) as unknown as ModelMap[K]
}

export function preloadModel(name: ModelName) {
  useGLTF.preload(modelUrl(name), DRACO_PATH)
}
