// Easter egg, beat 3 (docs/storyboards/easter-park.md, correctif 3 de Mathis : « la dernière ligne s'écrit
// en entier puis reste affichée ≥ 1.5 s ») : cadence de frappe du message de la route, en calcul pur
// (testé, typing.test.ts et times.test.ts). EasterMessage.tsx tape les lettres à ces instants exacts
// (horloge sans dérive) ; times.ts place les lignes pour que chacune finisse et tienne avant la suivante.
// Bundle initial : aucun import.

/** Délai avant la première lettre, temps par lettre (s). */
export const TYPING = { delay: 0.12, step: 0.05 } as const

/** Pause supplémentaire après une ponctuation (s). */
const PAUSE: Partial<Record<string, number>> = { '…': 0.42, '.': 0.26, ',': 0.16 }

/** Attente (s) entre l'apparition de `char` et celle de la lettre suivante. */
export function letterGap(char: string): number {
  return TYPING.step + (PAUSE[char] ?? 0)
}

/** Instant (s, depuis l'affichage de la ligne) où la lettre `index` apparaît. */
export function letterTime(text: string, index: number): number {
  let at = TYPING.delay
  for (let i = 0; i < index && i < text.length; i++) at += letterGap(text.charAt(i))
  return at
}

/** Durée de frappe d'une ligne (s) : jusqu'à l'apparition de sa dernière lettre. 0 pour une ligne vide. */
export function typingDuration(text: string): number {
  return text.length === 0 ? 0 : letterTime(text, text.length - 1)
}
