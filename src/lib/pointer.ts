// Position du pointeur dans une boîte, partagée par l'inclinaison des cards et les boutons magnétiques.
// Pur (testé dans pointer.test.ts) : la mesure du rect, elle, se fait dans trackPointer.ts.
import { clamp } from './math'

export type Box = { left: number; top: number; width: number; height: number }
export type Offset = { x: number; y: number }

/** Pointeur dans la boîte : -1 au bord gauche/haut, 0 au centre, 1 au bord droit/bas. Borné. */
export function pointerOffset(box: Box, clientX: number, clientY: number): Offset {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 }
  return {
    x: clamp(((clientX - box.left) / box.width) * 2 - 1, -1, 1),
    y: clamp(((clientY - box.top) / box.height) * 2 - 1, -1, 1),
  }
}
