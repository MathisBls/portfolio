// Brief agent V du 2026-10-09, visionneuse des pages d'atterrissage : « on peut faire glisser pour
// tourner […] et le modèle réagit au survol », et les calques du smartphone suivent le scroll.
// Entrées DOM de la visionneuse, écrites dans un objet mutable (aucun état React) que le Rig et les
// modèles lisent dans useFrame :
// - survol et position du pointeur dans le conteneur (souris ou stylet ; au doigt, seulement pendant le
//   glisser) ;
// - glisser : déplacement accumulé entre deux images, consommé par le Rig ; capture du pointeur, curseur
//   « grabbing » via data-dragging (LandingModel.module.css) ;
// - scroll : progress 0..1 du haut de la page jusqu'à la sortie du visuel par le haut, par un
//   ScrollTrigger avec scrub (CLAUDE.md règle 2 : jamais window.scrollY dans useFrame).
import { type RefObject, useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'

export type ViewerInput = {
  /** Pointeur au-dessus du visuel (souris, stylet) ou doigt en train de glisser. */
  over: boolean
  /** Pointeur dans le visuel, de −1 à 1 (x vers la droite, y vers le haut). */
  pointer: { x: number; y: number }
  dragging: boolean
  /** Déplacement du glisser (px) depuis la dernière image, remis à 0 par le Rig. */
  dx: number
  dy: number
  /** performance.now() du dernier relâchement (retour doux différé). */
  releasedAt: number
  /** Progress de scroll, lissé par le scrub (0 en haut de page, 1 quand le visuel est sorti). */
  scroll: number
}

export function useViewerInput(container: RefObject<HTMLElement | null>): RefObject<ViewerInput> {
  const input = useRef<ViewerInput>({
    over: false,
    pointer: { x: 0, y: 0 },
    dragging: false,
    dx: 0,
    dy: 0,
    releasedAt: 0,
    scroll: 0,
  })

  useEffect(() => {
    const el = container.current
    if (!el) return
    const state = input.current
    let last = { x: 0, y: 0 }
    let id: number | null = null

    const locate = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      state.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      state.pointer.y = 1 - ((e.clientY - r.top) / r.height) * 2
    }
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') state.over = true
      locate(e)
    }
    const onLeave = (e: PointerEvent) => {
      if (e.pointerId !== id) state.over = false
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || id !== null) return
      id = e.pointerId
      last = { x: e.clientX, y: e.clientY }
      state.dragging = true
      state.over = true
      el.setPointerCapture(e.pointerId)
      el.dataset.dragging = ''
      locate(e)
    }
    const onMove = (e: PointerEvent) => {
      locate(e)
      if (e.pointerId !== id) return
      state.dx += e.clientX - last.x
      state.dy += e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      id = null
      state.dragging = false
      state.releasedAt = performance.now()
      delete el.dataset.dragging
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      // Au doigt, pas de survol après le geste ; à la souris, seulement si elle est encore dessus
      const r = el.getBoundingClientRect()
      state.over =
        e.pointerType !== 'touch' &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    // Du haut de la page (0) à la sortie du visuel par le haut (1), lissé par le scrub
    const tween = gsap.fromTo(
      state,
      { scroll: 0 },
      {
        scroll: 1,
        ease: 'none',
        scrollTrigger: {
          id: 'landing-model',
          trigger: el,
          start: 0,
          end: 'bottom top',
          scrub: 0.6,
        },
      },
    )

    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      delete el.dataset.dragging
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [container])

  return input
}
