// Liens d'ancre (#projets, #contact...) : scroll doux via Lenis, puis focus sur la section cible.
// Partagé par la Nav et les boutons. Aucun accès à window hors des gestionnaires de clic.
import type { MouseEvent } from 'react'
import { site } from '../content/site'
import { scrollToTarget } from './lenis'

/**
 * Défile jusqu'à l'ancre et place le focus sur la section (sans second scroll).
 * Le hero est épinglé (position: fixed pendant le pin) : sa position mesurée serait fausse,
 * on remonte donc en haut de page.
 */
export function goToAnchor(hash: string): boolean {
  const id = hash.replace(/^#/, '')
  const target = document.getElementById(id)
  if (!target) return false
  scrollToTarget(id === site.sections.hero.id ? document.documentElement : target)
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  return true
}

/** onClick des liens : intercepte les clics simples sur une ancre, laisse passer le reste (ctrl, nouvel onglet). */
export function onAnchorClick(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const href = event.currentTarget.getAttribute('href')
  if (!href?.startsWith('#')) return
  if (goToAnchor(href)) event.preventDefault()
}
