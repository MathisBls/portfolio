// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Déclencheur ») : écoute du mot
// de passe pendant le final du parc, branchée par l'overlay (bundle initial, aucun import de three).
// - Clavier : `boulardtv` (password.ts), hors champs de formulaire et raccourcis, touches répétées
//   ignorées. La progression va au HUD du cockpit (`input`).
// - Tactile : 5 tapes rapides sur l'overlay (onTap, sur pointerup : c'est l'événement qui vaut geste
//   utilisateur pour un doigt, donc qui débloque la musique sur iOS).
// `onUnlock` est appelé DANS l'événement qui termine la saisie : l'overlay y débloque la musique
// (unlockMajestic, audio.ts) puis passe au second niveau.
import { useCallback, useEffect, useState } from 'react'
import { isFormField, isModified } from '../konami'
import { createPassword, createTaps, input } from './password'

/** Écoute le mot de passe tant que `armed` ; renvoie le gestionnaire des tapes (instant en ms). */
export function useMajesticTrigger(armed: boolean, onUnlock: () => void): (at: number) => void {
  const [taps] = useState(createTaps)

  useEffect(() => {
    if (!armed) return
    const detector = createPassword()
    taps.reset()
    input.progress = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isModified(event) || isFormField(event.target)) return
      if (detector.push(event.key)) {
        input.progress = 1
        onUnlock()
        return
      }
      input.progress = detector.progress()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      input.progress = 0
    }
  }, [armed, onUnlock, taps])

  return useCallback(
    (at: number) => {
      if (!armed) return
      if (taps.push(String(at))) {
        input.progress = 1
        onUnlock()
        return
      }
      input.progress = taps.progress()
    },
    [armed, onUnlock, taps],
  )
}
