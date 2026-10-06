// Amortissement commun des effets de pointeur (pointer.ts) : CameraRig (parallaxe), PrismLook,
// useAnchoredObject (objet survolé), ShardField (dérive). Passe « motion », sans storyboard dédié.
// Valeur 2D amortie par THREE.MathUtils.damp, sans allocation par frame. frameloop="demand" : elle
// demande une frame tant que l'écart à la cible dépasse EPS, puis se cale sur la cible et s'arrête
// (aucune boucle au repos).
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { MathUtils } from 'three'
import { getPointer } from './pointer'

/** Pas de temps maximal : la première frame après une pause (delta de plusieurs secondes) ne saute pas. */
const MAX_DT = 1 / 30
/** Écart (unités normalisées, ±1) sous lequel la valeur se cale sur la cible : moins d'un pixel. */
const EPS = 1e-3

export type Damped2 = { readonly x: number; readonly y: number }

export type PointerDamp = {
  /** Avance d'une frame vers le pointeur × weight (weight 0 : retour au centre). */
  follow: (delta: number, weight?: number) => Damped2
  /** Avance d'une frame vers une cible quelconque (±1), par exemple le pointeur relatif à une card. */
  to: (x: number, y: number, delta: number) => Damped2
}

export function createPointerDamp(lambda: number, invalidate: () => void): PointerDamp {
  const value = { x: 0, y: 0 }
  const to = (x: number, y: number, delta: number): Damped2 => {
    // Pointeur débranché (mobile, reduced-motion) : pas d'animation de retour
    if (!getPointer().enabled) {
      value.x = 0
      value.y = 0
      return value
    }
    const dt = Math.min(delta, MAX_DT)
    value.x = MathUtils.damp(value.x, x, lambda, dt)
    value.y = MathUtils.damp(value.y, y, lambda, dt)
    if (Math.abs(x - value.x) > EPS || Math.abs(y - value.y) > EPS) {
      invalidate()
    } else {
      value.x = x
      value.y = y
    }
    return value
  }
  const follow = (delta: number, weight = 1) => {
    const p = getPointer()
    return to(p.x * weight, p.y * weight, delta)
  }
  return { follow, to }
}

/** `lambda` : raideur de l'amortissement (1/s), 3 lent et cinématographique, 6 vif. */
export function usePointerDamp(lambda: number): PointerDamp {
  const invalidate = useThree((s) => s.invalidate)
  return useMemo(
    () =>
      createPointerDamp(lambda, () => {
        invalidate()
      }),
    [lambda, invalidate],
  )
}
