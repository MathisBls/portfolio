// Storyboard projets (docs/storyboards/projects.md §2, tableau « Par card ») : p 0 → 0.25 « Entrée :
// scale 0 → 1, rotation y −0.6 → 0 (easeOut) », 0.75 → 1 « Sortie : scale 1 → 0.85 » ; « Position :
// centre de l'emplacement (slotCenter, mesure live du DOM ; horizontal = left + width / 2), déprojeté
// sur le plan z = 0.
// Échelle : largeur de l'emplacement × 0.8 / largeur du modèle » ; « Animations continues (seulement
// quand la card est à l'écran, useContinuousInvalidate) ». §5 : `visible = false` hors écran.
// §7 : la position monde est exposée (registre, measureTarget) pour que le rayon actif vise l'objet.
// Passe « motion » (sans storyboard) : au survol, l'objet suit le pointeur dans son emplacement
// (±HOVER_LOOK rad, amorti, desktop à pointeur fin seulement : pointer.ts).
import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useRef } from 'react'
import { Box3, type Group, Vector3 } from 'three'
import { type Vec3, clamp, easeInOut, lerp, range } from '../../lib/math'
import { slotCenter } from '../../lib/projects'
import { useAnchor, useContinuousInvalidate, useInView } from '../hooks'
import { pointerInRect } from '../pointer'
import { getAnchorMetrics, getProgress, useScene } from '../store'
import { measure, targets } from './anchorTargets'

export { type AnchoredTarget, measureTarget } from './anchorTargets'
import { usePointerDamp } from '../usePointerDamp'

/** Part de l'emplacement occupée par l'objet (grand format des chapitres). */
const FILL = 0.88
// Chapitres plein écran (2026-10-06) : article 180svh, scène collante collée pour p ∈ [0.36, 0.64] ;
// entrée en montant, sortie en repartant, plateau tournant (±TURN rad) pendant qu'elle est collée.
const ENTER: readonly [number, number] = [0.12, 0.36]
const EXIT: readonly [number, number] = [0.64, 0.88]
const TURNTABLE: readonly [number, number] = [0.3, 0.7]
const TURN = 0.45
const ENTER_ROTATION = -0.6
const EXIT_SCALE = 0.85
/** Survol lissé (1/s) et pas de temps maximal (retour d'onglet, première frame après une pause). */
const HOVER_RATE = 8
const MAX_DT = 1 / 20
/** Survol : rotation maximale (rad) vers le pointeur, sur x et y. */
const HOVER_LOOK = 0.15

const easeOut = (t: number) => 1 - (1 - t) ** 3

export type AnchoredOptions = {
  slug: string
  /** Largeur du modèle à l'échelle 1 (unités monde), dans le repère du groupe ancré. */
  width: number
  /** Hauteur, facultative : l'objet tient aussi dans la hauteur de l'emplacement (4:3). */
  height?: number
  /** Centre du modèle, ramené au centre de l'emplacement. */
  center?: Vec3
  /** Vitesse de la phase au survol (×2 : deux fois plus vite). */
  hoverSpeed?: number
}

export type AnchoredObject = {
  /** Groupe racine : position, échelle, rotation et visibilité écrites par le hook. */
  ref: RefObject<Group | null>
  /** À poser sur le groupe enfant : ramène le centre du modèle sur l'origine. */
  offset: Vec3
  /** Progress de la card (0..1). */
  progress: RefObject<number>
  /** Survol de la card, lissé (0..1). */
  hover: RefObject<number>
  /** Temps d'animation (s), accéléré au survol, figé hors écran. */
  phase: RefObject<number>
  /** true quand l'objet est à l'écran (0 < p < 1) : les composants sautent leur animation sinon. */
  visibleRef: RefObject<boolean>
}

export function useAnchoredObject({
  slug,
  width,
  height,
  center = [0, 0, 0],
  hoverSpeed = 1,
}: AnchoredOptions): AnchoredObject {
  const id = `project:${slug}` as const
  const ref = useRef<Group>(null)
  const progress = useRef(0)
  const hover = useRef(0)
  const phase = useRef(0)
  const visibleRef = useRef(false)
  const offset: Vec3 = [-center[0], -center[1], -center[2]]
  const look = usePointerDamp(5)

  // Boucle continue tant que l'emplacement coupe le viewport (IntersectionObserver, pas de setState
  // dans useFrame). Sans ancre : rien (on ne fait pas tourner 5 boucles à l'aveugle).
  const slot = useAnchor(id)
  useContinuousInvalidate(useInView(slot, false))

  useEffect(() => {
    targets.set(slug, {
      position: new Vector3(),
      bounds: new Box3(),
      visible: false,
      slotWidth: 0,
      slotHeight: 0,
    })
    return () => {
      targets.delete(slug)
    }
  }, [slug])

  useFrame((state, delta) => {
    const group = ref.current
    const target = measure(slug, state)
    if (!group || !target) return
    const p = getProgress(id)
    progress.current = p
    visibleRef.current = target.visible
    target.bounds.makeEmpty()
    group.visible = target.visible
    if (!target.visible) return

    const fit =
      FILL *
      Math.min(
        target.slotWidth / width,
        height === undefined ? Infinity : target.slotHeight / height,
      )
    const enter = easeOut(range(p, ...ENTER))
    const exit = easeInOut(range(p, ...EXIT))
    const scale = fit * enter * lerp(1, EXIT_SCALE, exit)
    group.position.copy(target.position)
    group.scale.setScalar(Math.max(scale, 1e-4))

    const dt = Math.min(delta, MAX_DT)
    const hovered = useScene.getState().hovered === slug ? 1 : 0
    hover.current = lerp(hover.current, hovered, clamp(1 - Math.exp(-HOVER_RATE * dt)))
    phase.current += dt * lerp(1, hoverSpeed, hover.current)

    // Pointeur relatif au centre de l'emplacement (±1 sur ses bords), pondéré par le survol lissé
    const m = getAnchorMetrics(id)
    const h = m ? hover.current : 0
    const local = m ? pointerInRect(m.left, slotCenter(m), m.width, m.height, state.size) : null
    const d = look.to((local?.x ?? 0) * h, (local?.y ?? 0) * h, delta)
    const turn = TURN * (2 * range(p, ...TURNTABLE) - 1)
    group.rotation.set(-HOVER_LOOK * d.y, ENTER_ROTATION * (1 - enter) + turn + HOVER_LOOK * d.x, 0)
    // Bord visé par le rayon : boîtes des géométries, transforms de la frame (enfants : la précédente)
    target.bounds.setFromObject(group)
  })

  return { ref, offset, progress, hover, phase, visibleRef }
}
