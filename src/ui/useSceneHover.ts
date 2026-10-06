import { type RefObject, useEffect } from 'react'
import type { Project } from '../content/projects'
import { useScene } from '../scene/store'

/**
 * Survol et focus d'une card : la scène réagit (objet 3D du projet). Écouteurs natifs sur l'élément (comme
 * la Nav) : un <article> n'est pas interactif pour jsx-a11y. focusout remonte à chaque changement de lien
 * dans la card : on ne quitte que si le focus sort. Remis à null au démontage si la card était active.
 */
export function useSceneHover(ref: RefObject<HTMLElement | null>, slug: Project['slug']): void {
  useEffect(() => {
    const card = ref.current
    if (!card) return
    const enter = () => {
      useScene.getState().setHovered(slug)
    }
    const leave = () => {
      useScene.getState().setHovered(null)
    }
    const focusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) leave()
    }
    card.addEventListener('mouseenter', enter)
    card.addEventListener('mouseleave', leave)
    card.addEventListener('focusin', enter)
    card.addEventListener('focusout', focusOut)
    return () => {
      card.removeEventListener('mouseenter', enter)
      card.removeEventListener('mouseleave', leave)
      card.removeEventListener('focusin', enter)
      card.removeEventListener('focusout', focusOut)
      if (useScene.getState().hovered === slug) leave()
    }
  }, [ref, slug])
}
