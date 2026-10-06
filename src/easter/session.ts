// Easter egg : entrée et sortie côté page (bundle initial, aucun import de three).
// - beginEaster : appelé dans le keydown du code Konami (geste utilisateur : ouvre l'AudioContext), puis
//   lance le chargement des voix et de la musique (voice.ts, chunk à part importé à la demande).
// - lockPage : Lenis arrêté, scroll bloqué (html.easter), DOM de la page inerte et aria-hidden ; le
//   masquage visuel (html.easter-live) n'arrive qu'au début de la séquence, quand la scène est prête.
// - La sortie restaure tout : attributs, position de scroll, Lenis, focus.
import { getLenis } from '../lib/lenis'
import { prefersReducedMotion } from '../lib/useReducedMotion'
import { hasWebGL2 } from '../lib/webgl'
import { useScene } from '../scene/store'
import { closeAudio, openAudio } from './audio'

export function beginEaster(): void {
  const scene = useScene.getState()
  if (scene.easter !== 'idle') return
  // Sans WebGL 2 la séquence ne démarre pas : ni musique ni clips à charger
  const webgl = hasWebGL2()
  openAudio(prefersReducedMotion(), webgl)
  scene.startEaster()
  if (webgl) {
    void import('./voice').then((voice) => voice.loadClips()).catch(() => undefined)
  }
}

export function endEaster(): void {
  if (useScene.getState().easter === 'idle') return
  useScene.getState().exitEaster()
  closeAudio()
}

type Hidden = { el: HTMLElement; ariaHidden: string | null; inert: boolean }

/** Éléments de la page à masquer : frères de l'overlay, sauf le canvas de la scène. */
function pageElements(overlay: HTMLElement): HTMLElement[] {
  const root = overlay.parentElement
  if (!root) return []
  return Array.from(root.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el !== overlay && !el.hasAttribute('data-scene-canvas'),
  )
}

/** Verrouille la page derrière l'overlay. Renvoie la fonction de restauration. */
export function lockPage(overlay: HTMLElement): () => void {
  const html = document.documentElement
  const scrollY = window.scrollY
  const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const hidden: Hidden[] = pageElements(overlay).map((el) => ({
    el,
    ariaHidden: el.getAttribute('aria-hidden'),
    inert: el.inert,
  }))

  getLenis()?.stop()
  html.classList.add('easter')
  hidden.forEach(({ el }) => {
    el.setAttribute('aria-hidden', 'true')
    el.inert = true
  })

  return () => {
    html.classList.remove('easter', 'easter-live')
    hidden.forEach(({ el, ariaHidden, inert }) => {
      if (ariaHidden === null) el.removeAttribute('aria-hidden')
      else el.setAttribute('aria-hidden', ariaHidden)
      el.inert = inert
    })
    window.scrollTo({ top: scrollY, behavior: 'instant' })
    const lenis = getLenis()
    lenis?.scrollTo(scrollY, { immediate: true, force: true })
    lenis?.start()
    const target = focus?.isConnected ? focus : document.getElementById('contenu')
    target?.focus({ preventScroll: true })
  }
}

/** La séquence commence : la page s'efface (transition CSS sur html.easter-live). */
export function setPageHidden(hidden: boolean): void {
  document.documentElement.classList.toggle('easter-live', hidden)
}
