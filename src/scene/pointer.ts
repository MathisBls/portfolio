// Pointeur de la scène (passe « motion », demande de Mathis, sans storyboard dédié) : parallaxe de la
// caméra (CameraRig), prisme qui regarde le pointeur et réagit au clic (PrismLook), objet de la card
// survolée (useAnchoredObject), dérive des éclats de verre (ShardField).
// Un seul listener pointermove passif sur window écrit un objet mutable (−1..1, y vers le haut) et
// demande une frame (frameloop="demand"). La scène le lit dans useFrame, jamais le DOM. Branché par
// Scene.tsx seulement sur desktop à pointeur fin, hors reduced-motion : sinon il reste à 0.
import { requestFrame } from './store'

export const FINE_POINTER_QUERY = '(pointer: fine)'

export type Pointer = {
  /** Position normalisée dans le viewport : −1 (gauche, bas) à 1 (droite, haut). 0 au repos. */
  x: number
  y: number
  /** true tant que les listeners sont branchés. Faux : les valeurs amorties reviennent à 0 sans animer. */
  enabled: boolean
  /** Compteur de clics dans le vide (hors liens, boutons, champs), et position du dernier. */
  clicks: number
  clickX: number
  clickY: number
}

const pointer: Pointer = { x: 0, y: 0, enabled: false, clicks: 0, clickX: 0, clickY: 0 }

export function getPointer(): Readonly<Pointer> {
  return pointer
}

const local = { x: 0, y: 0 }

/**
 * Pointeur relatif à un rectangle de l'écran (px CSS : bord gauche, centre vertical, taille) : ±1 sur
 * ses bords (y vers le haut), borné. Objet partagé, à lire tout de suite.
 */
export function pointerInRect(
  left: number,
  centerY: number,
  width: number,
  height: number,
  viewport: { width: number; height: number },
): Readonly<{ x: number; y: number }> {
  const px = ((pointer.x + 1) / 2) * viewport.width
  const py = ((1 - pointer.y) / 2) * viewport.height
  local.x = Math.min(1, Math.max(-1, (2 * (px - left)) / Math.max(1, width) - 1))
  local.y = Math.min(1, Math.max(-1, (2 * (centerY - py)) / Math.max(1, height)))
  return local
}

/** Cibles d'un clic qui ne doivent pas faire réagir la scène. */
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [contenteditable], [tabindex]:not([tabindex="-1"])'

const normX = (clientX: number) => (clientX / Math.max(1, window.innerWidth)) * 2 - 1
const normY = (clientY: number) => 1 - (clientY / Math.max(1, window.innerHeight)) * 2

function onMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  pointer.x = normX(event.clientX)
  pointer.y = normY(event.clientY)
  requestFrame()
}

function onLeave() {
  pointer.x = 0
  pointer.y = 0
  requestFrame()
}

function onClick(event: MouseEvent) {
  const { target } = event
  // detail 0 : clic clavier (Entrée sur un bouton) ; sélection de texte en cours : pas un clic dans le vide
  if (event.button !== 0 || event.detail === 0) return
  if (event instanceof PointerEvent && event.pointerType === 'touch') return
  if (!(target instanceof Element) || target.closest(INTERACTIVE)) return
  if (window.getSelection()?.isCollapsed === false) return
  pointer.clicks++
  pointer.clickX = normX(event.clientX)
  pointer.clickY = normY(event.clientY)
  requestFrame()
}

/** Branche les listeners (une seule fois à la fois) et renvoie leur nettoyage, qui remet tout à 0. */
export function bindPointer(): () => void {
  const root = document.documentElement
  const passive = { passive: true } as const
  pointer.enabled = true
  window.addEventListener('pointermove', onMove, passive)
  window.addEventListener('click', onClick, passive)
  window.addEventListener('blur', onLeave)
  root.addEventListener('pointerleave', onLeave, passive)
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('click', onClick)
    window.removeEventListener('blur', onLeave)
    root.removeEventListener('pointerleave', onLeave)
    pointer.enabled = false
    onLeave()
  }
}
