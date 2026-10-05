// Storyboard hero (docs/storyboards/hero.md) §5 Budget : verre du prisme selon le palier.
// Desktop : MeshTransmissionMaterial (réfracte le titre 3D et les rayons). Reduced-motion : transmission
// native de three (rendu unique, pas de boucle). Mobile : verre sans transmission (additif,
// clearcoat, iridescence légère). Remplace le matériau 'Glass' du GLB (CLAUDE.md, Assets 3D).
import { MeshTransmissionMaterial } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { AdditiveBlending } from 'three'

type PrismGlassProps = { mobile: boolean; reducedMotion: boolean }

export function PrismGlass({ mobile, reducedMotion }: PrismGlassProps) {
  const dpr = useThree((s) => s.viewport.dpr)
  if (reducedMotion) {
    return <meshPhysicalMaterial transmission={1} thickness={0.6} roughness={0.05} ior={1.5} />
  }
  if (mobile) {
    // Additif : seuls les reflets (env, clearcoat, iridescence) s'ajoutent au fond, pas de voile gris
    return (
      <meshPhysicalMaterial
        color="#0e1217"
        // Rugosité : lisse les reflets de l'Environment (cubemap 256) sans flouter de réfraction
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.04}
        iridescence={0.6}
        iridescenceIOR={1.3}
        envMapIntensity={5}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
      />
    )
  }
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
