// Éclairage studio : Environment construit en local avec des Lightformers (aucun HDR téléchargé),
// rendu une seule fois (frames={1}), + une directionnelle. Max 2 lumières + Environment (reviewer).
import { Environment, Lightformer } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      <Environment resolution={512} frames={1} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={4} position={[0, 5, -2]} scale={[10, 2, 1]} />
        <Lightformer
          form="rect"
          intensity={2}
          position={[-6, 1, 1]}
          rotation-y={Math.PI / 2}
          scale={[8, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[6, -1, 1]}
          rotation-y={-Math.PI / 2}
          scale={[8, 3, 1]}
        />
        <Lightformer form="ring" intensity={1.5} position={[0, 0, 6]} scale={3} />
      </Environment>
      <directionalLight position={[3, 4, 5]} intensity={0.8} />
    </>
  )
}
