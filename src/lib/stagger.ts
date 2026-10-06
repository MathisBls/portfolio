import type { CSSProperties } from 'react'

/** Plafond du décalage : une longue liste ne doit pas mettre une seconde à apparaître. */
const MAX_STEPS = 8

/** Délai d'apparition d'un [data-reveal] : global.css le multiplie par 60 ms (--reveal-i). */
export function stagger(index: number, max = MAX_STEPS): CSSProperties {
  return { '--reveal-i': Math.min(Math.max(index, 0), max) } as CSSProperties
}
