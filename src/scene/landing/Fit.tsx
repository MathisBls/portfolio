// Recadrage d'un modèle de la visionneuse des pages d'atterrissage (règle motion-3d : centrage et
// échelle corrigés par un <group scale position> dans le composant, jamais en rééditant le GLB).
// Mesure une fois au montage, à l'état de repos, la boîte du modèle dans son propre repère : centre en x
// et z ramené sur l'axe de rotation, plus grande dimension visible en tournant (hauteur, ou diagonale au
// sol) ramenée à `size`, centre vertical sur l'origine. `onFloor` (stable : un setter d'état) reçoit la
// hauteur du sol, pour l'ombre.
import { type ReactNode, useLayoutEffect, useRef } from 'react'
import { Box3, BufferGeometry, type Group, Matrix4, Mesh } from 'three'

/** Boîte des géométries de `root`, dans le repère de `root`. */
function localBox(root: Group): Box3 {
  root.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(root.matrixWorld).invert()
  const box = new Box3()
  const part = new Box3()
  const matrix = new Matrix4()
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !object.visible) return
    const geometry: unknown = object.geometry
    if (!(geometry instanceof BufferGeometry)) return
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    if (!geometry.boundingBox) return
    matrix.multiplyMatrices(inverse, object.matrixWorld)
    box.union(part.copy(geometry.boundingBox).applyMatrix4(matrix))
  })
  return box
}

type FitProps = {
  size: number
  onFloor?: (y: number) => void
  children: ReactNode
}

export function Fit({ size, onFloor, children }: FitProps) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const box = localBox(i)
    if (box.isEmpty()) return
    const w = box.max.x - box.min.x
    const h = box.max.y - box.min.y
    const d = box.max.z - box.min.z
    const scale = size / Math.max(h, Math.hypot(w, d))
    i.position.set(
      -(box.min.x + box.max.x) / 2,
      -(box.min.y + box.max.y) / 2,
      -(box.min.z + box.max.z) / 2,
    )
    o.scale.setScalar(scale)
    onFloor?.((-h / 2) * scale)
  }, [size, onFloor])

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  )
}
