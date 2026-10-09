// Contrat des modèles de la visionneuse des pages d'atterrissage (brief agent V du 2026-10-09) : chaque
// composant de src/scene/landing/models/ reçoit ces refs et anime ses enfants dans useFrame (jamais de
// setState par image). Le Rig (Rig.tsx) les écrit à chaque image avant les modèles.
import type { RefObject } from 'react'

export type LandingObjectProps = {
  /** Progress de scroll 0..1 (ScrollTrigger avec scrub, useViewerInput.ts). */
  progress: RefObject<number>
  /** Survol lissé 0..1 (pointeur au-dessus du visuel ou doigt qui glisse). */
  hover: RefObject<number>
  /** Variante légère : moins de détails, aucun matériau coûteux. */
  mobile: boolean
}
