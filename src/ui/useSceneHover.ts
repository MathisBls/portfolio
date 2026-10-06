import { type RefObject, useEffect } from 'react'
import type { Project } from '../content/projects'
import { useScene } from '../scene/store'

type Hosts = {
  /** Zone du pointeur : la scène du chapitre (.stage), qui occupe tout l'écran pendant qu'il est collé. */
  pointer: RefObject<HTMLElement | null>
  /** Zone du focus clavier : l'article entier (le texte porte les liens). */
  focus: RefObject<HTMLElement | null>
}

/**
 * Survol et focus d'un chapitre : la scène réagit (objet 3D du projet). Écouteurs natifs (comme la Nav) :
 * un <article> n'est pas interactif pour jsx-a11y. Le tactile est ignoré (pas de survol). focusout remonte
 * à chaque changement de lien dans l'article : on ne quitte que si le focus sort. Une sortie ne remet à null
 * que si ce chapitre est encore l'actif (le chapitre suivant a pu prendre la main entre-temps), y compris
 * au démontage.
 */
export function useSceneHover({ pointer, focus }: Hosts, slug: Project['slug']): void {
  useEffect(() => {
    const stage = pointer.current
    const article = focus.current
    if (!stage || !article) return
    const enter = () => {
      useScene.getState().setHovered(slug)
    }
    const leave = () => {
      if (useScene.getState().hovered === slug) useScene.getState().setHovered(null)
    }
    const pointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') enter()
    }
    const pointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') leave()
    }
    const focusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && article.contains(event.relatedTarget))) leave()
    }
    stage.addEventListener('pointerenter', pointerEnter)
    stage.addEventListener('pointerleave', pointerLeave)
    article.addEventListener('focusin', enter)
    article.addEventListener('focusout', focusOut)
    return () => {
      stage.removeEventListener('pointerenter', pointerEnter)
      stage.removeEventListener('pointerleave', pointerLeave)
      article.removeEventListener('focusin', enter)
      article.removeEventListener('focusout', focusOut)
      leave()
    }
  }, [pointer, focus, slug])
}
