// Modèle provisoire de la visionneuse (brief agent V du 2026-10-09 : « tant que les GLB de B4 n'existent
// pas, code avec des modèles de remplacement isolés derrière une table modèle → url ») : la scène du GLB
// rendue telle quelle (copie : le GLB en cache n'est jamais muté), sans animation propre.
import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { DRACO_PATH } from '../../useModel'

export function Placeholder({ url }: { url: string }) {
  const { scene } = useGLTF(url, DRACO_PATH)
  const copy = useMemo(() => scene.clone(true), [scene])
  return <primitive object={copy} />
}
