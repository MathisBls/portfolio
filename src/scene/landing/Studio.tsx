// Brief agent V du 2026-10-09 : « éclairage de studio sombre et élégant (Environment avec Lightformers),
// ombres de contact ». Environnement construit en local (aucun HDR téléchargé), rendu une seule fois :
// une boîte à lumière haute et douce, deux filets de contour (froid à gauche, chaud à droite) qui
// dessinent la silhouette sur le fond noir, une face très faible pour que les ombres ne bouchent pas.
// Deux directionnelles au plus (clé et contre-jour), sans ombres portées : l'ombre au sol est une
// ombre de contact (desktop) ou une tache dégradée fixe (mobile, sans rendu supplémentaire par image).
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

export function Studio({ mobile }: { mobile: boolean }) {
  return (
    <>
      <Environment resolution={mobile ? 128 : 256} frames={1} environmentIntensity={0.85}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 2]} scale={[8, 5, 1]} />
        <Lightformer
          form="rect"
          intensity={5}
          color="#dbe6ff"
          position={[-6, 1.5, -2]}
          scale={[1.2, 7, 1]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color="#ffe2c4"
          position={[6, 0.5, -1]}
          scale={[1.2, 6, 1]}
        />
        <Lightformer form="rect" intensity={0.5} position={[0, 0.5, 8]} scale={[8, 3, 1]} />
      </Environment>
      <directionalLight position={[3.5, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, 2.5, -5]} intensity={1.1} color="#c9d6ff" />
    </>
  )
}

/** Tache d'ombre radiale, dessinée une fois dans un canvas 64 × 64 (mobile). */
function BlobShadow({ y, size }: { y: number; size: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(0,0,0,0.7)')
      g.addColorStop(0.55, 'rgba(0,0,0,0.3)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 64, 64)
    }
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(
    () => () => {
      texture.dispose()
    },
    [texture],
  )
  return (
    <mesh position-y={y + 0.002} rotation-x={-Math.PI / 2} scale={size}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** Ombre au sol, sous le modèle recadré (`y` : sol mesuré par Fit, `size` : emprise). */
export function Ground({ mobile, y, size }: { mobile: boolean; y: number; size: number }) {
  if (mobile) return <BlobShadow y={y} size={size * 0.9} />
  return (
    <ContactShadows
      position-y={y}
      scale={size * 1.4}
      resolution={512}
      blur={2.6}
      far={size * 0.5}
      opacity={0.75}
      color="#000000"
    />
  )
}
