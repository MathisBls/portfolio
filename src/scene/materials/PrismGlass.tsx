// Storyboard hero (docs/storyboards/hero.md) §5 Budget : verre du prisme selon le palier.
// Desktop : MeshTransmissionMaterial (réfracte le titre 3D et les rayons).
// Mobile et reduced-motion : verre SANS transmission (CLAUDE.md règle 1, review Phase 1), en mélange
// normal pour rester lisible sur fond noir, avec des arêtes fines comme le poster SVG.
// Rendu comme enfant du mesh du prisme : le matériau s'attache au mesh, les arêtes en sont un enfant.
// Remplace le matériau 'Glass' du GLB (CLAUDE.md, Assets 3D).
import { Edges, MeshTransmissionMaterial } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

type PrismGlassProps = { mobile: boolean; reducedMotion: boolean }

function SolidGlass() {
  return (
    <>
      <meshPhysicalMaterial
        color="#1b2029"
        transparent
        opacity={0.6}
        roughness={0.18}
        clearcoat={1}
        clearcoatRoughness={0.05}
        iridescence={0.6}
        iridescenceIOR={1.3}
        envMapIntensity={3}
        depthWrite={false}
      />
      <Edges threshold={20} color="#a0a0a8" transparent opacity={0.7} />
    </>
  )
}

export function PrismGlass({ mobile, reducedMotion }: PrismGlassProps) {
  const dpr = useThree((s) => s.viewport.dpr)
  if (mobile || reducedMotion) return <SolidGlass />
  return (
    <MeshTransmissionMaterial
      samples={6}
      resolution={512}
      thickness={0.6}
      chromaticAberration={0.35}
      anisotropy={0.2}
      distortion={0.1}
      temporalDistortion={0}
      ior={1.5}
      roughness={0.05}
      // Arêtes et faces lisibles sur fond noir, même quand rien de clair n'est derrière le verre
      envMapIntensity={2.5}
      // Risque 1 du storyboard : la passe backside seulement si dpr <= 2
      backside={dpr <= 2}
    />
  )
}
