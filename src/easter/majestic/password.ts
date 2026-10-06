// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Déclencheur ») : détection du
// mot de passe `boulardtv` au clavier et de la voie tactile (5 tapes rapides), en logique pure (testée,
// password.test.ts) sur le modèle de konami.ts. Bundle initial : aucun import de three.
// - Clavier : mémoire glissante, insensible à la casse ; les touches sans caractère (Maj, verrouillage
//   majuscules, flèches) sont ignorées, Retour arrière efface la dernière lettre. Un caractère en trop
//   au début (« bboulardtv ») ne fait pas échouer la saisie.
// - Tactile : 5 tapes, chacune à moins de TAP_GAP de la précédente.
// - progress() renseigne le HUD du cockpit (cases du mot de passe qui se remplissent) : `input`, objet
//   mutable lu dans useFrame par le cockpit (chunk lazy), écrit ici par les gestionnaires d'événements.
import { normalizeKey } from '../konami'

export const PASSWORD = 'boulardtv'

/** Tapes rapides de la voie tactile, et écart maximal entre deux tapes (ms). */
export const TAPS = 5
export const TAP_GAP = 600

export type Detector = {
  /** Ajoute une saisie ; true quand elle termine le mot de passe (la mémoire repart alors de zéro). */
  push: (key: string) => boolean
  /** Part du mot de passe déjà saisie (0 -> 1), pour le HUD. */
  progress: () => number
  reset: () => void
}

/** Longueur du plus long suffixe de `typed` qui est un préfixe de `word`. */
function matched(typed: readonly string[], word: string): number {
  for (let k = Math.min(typed.length, word.length); k > 0; k--) {
    let ok = true
    for (let i = 0; i < k; i++) {
      if (typed[typed.length - k + i] !== word.charAt(i)) {
        ok = false
        break
      }
    }
    if (ok) return k
  }
  return 0
}

/** Détecteur du mot de passe au clavier (KeyboardEvent.key), insensible à la casse. */
export function createPassword(word: string = PASSWORD): Detector {
  const target = word.toLowerCase()
  const typed: string[] = []
  return {
    push: (key) => {
      if (key === 'Backspace') {
        typed.pop()
        return false
      }
      // Touches sans caractère (Maj, verrouillage majuscules, flèches, F1…) : ignorées
      if (key.length !== 1) return false
      typed.push(normalizeKey(key))
      if (typed.length > target.length) typed.shift()
      const done = matched(typed, target) === target.length
      if (done) typed.length = 0
      return done
    },
    progress: () => matched(typed, target) / target.length,
    reset: () => {
      typed.length = 0
    },
  }
}

/** Détecteur des tapes rapides : push(instant en ms). */
export function createTaps(count: number = TAPS, gap: number = TAP_GAP): Detector {
  let taps = 0
  let last = -Infinity
  return {
    push: (key) => {
      const at = Number(key)
      if (!Number.isFinite(at)) return false
      taps = at - last <= gap ? taps + 1 : 1
      last = at
      const done = taps >= count
      if (done) {
        taps = 0
        last = -Infinity
      }
      return done
    },
    progress: () => taps / count,
    reset: () => {
      taps = 0
      last = -Infinity
    },
  }
}

/** Saisie en cours, lue par le HUD (cases remplies), 0 -> 1. */
export const input = { progress: 0 }
