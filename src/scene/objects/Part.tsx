// Storyboard projets (docs/storyboards/projects.md §3, objets par modèle) : un mesh du GLB rendu avec sa
// géométrie, son matériau et son transform d'origine (noms Blender, docs/models.md). Les props passées
// (ref, matériau, enfants) remplacent celles du node : le GLB mis en cache n'est jamais muté.
import type { ThreeElements } from '@react-three/fiber'
import type { Mesh } from 'three'

type PartProps = ThreeElements['mesh'] & { node: Mesh }

export function Part({ node, ...props }: PartProps) {
  return (
    <mesh
      name={node.name}
      geometry={node.geometry}
      material={node.material}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      {...props}
    />
  )
}
