// Easter egg n° 2 « Le Sanctuaire » : rendez-vous entre le monde du second niveau (MajesticWorld, monté au
// déclenchement, éventuellement suspendu le temps du GLB) et sa timeline (useMajestic), qui attend sa
// racine pour la précompiler (warmup.ts, warmUpSubtree) pendant le beat 0.
import type { Object3D } from 'three'

let root: Object3D | null = null
let waiters: ((value: Object3D) => void)[] = []

/** Enregistré par MajesticWorld une fois ses enfants montés (null au démontage). */
export function setMajesticRoot(value: Object3D | null): void {
  root = value
  if (!value) return
  const pending = waiters
  waiters = []
  pending.forEach((resolve) => {
    resolve(value)
  })
}

/** Racine du monde du second niveau, dès qu'elle est montée. */
export function majesticRoot(): Promise<Object3D> {
  if (root) return Promise.resolve(root)
  return new Promise((resolve) => {
    waiters.push(resolve)
  })
}
