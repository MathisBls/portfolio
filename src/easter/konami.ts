// Easter egg : détection du code Konami (↑ ↑ ↓ ↓ ← → ← → B A) au clavier. Bundle initial : quelques
// lignes, aucun import de three. La logique pure (createKonami, normalizeKey, isModified) est testée
// (konami.test.ts) ; useKonami la branche sur window, hors champs de formulaire.
import { useEffect } from 'react'
import { consumeDebugStart } from './debug'

export const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const

type KeyLike = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }

/** Lettres en minuscules (B avec Maj ou verrouillage majuscules), les autres touches telles quelles. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

/** Raccourci (Ctrl, Cmd, Alt) : jamais une touche de la séquence. */
export function isModified(event: KeyLike): boolean {
  return event.ctrlKey || event.metaKey || event.altKey
}

/**
 * Détecteur à mémoire glissante : renvoie true quand les dernières touches forment la séquence, puis
 * repart de zéro. Une touche en trop au début (↑ ↑ ↑ ↓ ↓ …) ne fait pas échouer la saisie.
 */
export function createKonami(sequence: readonly string[] = KONAMI): (key: string) => boolean {
  const recent: string[] = []
  return (key) => {
    recent.push(normalizeKey(key))
    if (recent.length > sequence.length) recent.shift()
    const done =
      recent.length === sequence.length && recent.every((value, i) => value === sequence[i])
    if (done) recent.length = 0
    return done
  }
}

export function isFormField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select') !== null)
  )
}

/**
 * Appelle `onUnlock` (stable) à la fin de la séquence. Inactif si `enabled` est faux. En DEV, `?easter=1`
 * ou `?easter-at=<s>` déverrouille dès le montage (debug.ts).
 */
export function useKonami(onUnlock: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    if (consumeDebugStart()) {
      onUnlock()
      return
    }
    const match = createKonami()
    const onKeyDown = (event: KeyboardEvent) => {
      if (isModified(event) || isFormField(event.target)) return
      if (match(event.key)) onUnlock()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onUnlock, enabled])
}
