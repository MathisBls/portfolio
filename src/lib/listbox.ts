// Logique pure du menu déroulant personnalisé (ui/SelectMenu.tsx), motif « select-only combobox » du
// WAI-ARIA APG : action d'une touche selon l'état (ouvert ou fermé), déplacement dans la liste, recherche
// par frappe (typeahead). Testée dans listbox.test.ts. Aucune dépendance.

export type Move = 'next' | 'prev' | 'first' | 'last' | 'pageNext' | 'pagePrev'

export type ListAction =
  /** Ouvrir la liste : garder l'option choisie (`keep`) ou viser la première / la dernière. */
  | { type: 'open'; to: 'keep' | 'first' | 'last' }
  | { type: 'move'; to: Move }
  /** Choisir l'option active et fermer (Entrée, Espace, Alt+Haut). */
  | { type: 'select' }
  /** Tab : choisir l'option active, fermer et laisser le focus partir (pas de preventDefault). */
  | { type: 'selectAndLeave' }
  /** Échap : fermer sans rien changer. */
  | { type: 'close' }
  /** Lettre tapée : ouvrir si besoin, sauter à l'option qui commence par la saisie. */
  | { type: 'type'; char: string }

export type KeyInput = { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean }

/** Nombre d'options sautées par Page haut / Page bas. */
export const PAGE_STEP = 10

const isPrintable = ({ key, ctrlKey, metaKey, altKey }: KeyInput) =>
  key.length === 1 && key !== ' ' && !ctrlKey && !metaKey && !altKey

/**
 * Action d'une touche. `typing` : une recherche par frappe est en cours (l'Espace complète alors la
 * saisie au lieu de choisir). null : touche ignorée (comportement natif conservé).
 */
export function keyAction(input: KeyInput, open: boolean, typing = false): ListAction | null {
  const { key, altKey } = input
  if (isPrintable(input)) return { type: 'type', char: key }
  if (!open) {
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      return { type: 'open', to: 'keep' }
    }
    if (key === 'Home') return { type: 'open', to: 'first' }
    if (key === 'End') return { type: 'open', to: 'last' }
    return null
  }
  if (key === ' ' && typing) return { type: 'type', char: ' ' }
  if (key === 'ArrowUp' && altKey) return { type: 'select' }
  if (key === 'Enter' || key === ' ') return { type: 'select' }
  if (key === 'Escape') return { type: 'close' }
  if (key === 'Tab') return { type: 'selectAndLeave' }
  const moves: Partial<Record<string, Move>> = {
    ArrowDown: 'next',
    ArrowUp: 'prev',
    Home: 'first',
    End: 'last',
    PageDown: 'pageNext',
    PageUp: 'pagePrev',
  }
  const to = moves[key]
  return to ? { type: 'move', to } : null
}

/** Nouvel index actif après un déplacement, sans boucler. `current` −1 : aucune option active. */
export function moveIndex(to: Move, current: number, count: number): number {
  if (count <= 0) return -1
  const last = count - 1
  const clamp = (i: number) => Math.min(Math.max(i, 0), last)
  switch (to) {
    case 'first':
      return 0
    case 'last':
      return last
    case 'next':
      return current < 0 ? 0 : clamp(current + 1)
    case 'prev':
      return current < 0 ? 0 : clamp(current - 1)
    case 'pageNext':
      return clamp(current + PAGE_STEP)
    case 'pagePrev':
      return clamp(current - PAGE_STEP)
  }
}

/** Minuscules sans accents : « É » se trouve en tapant « e ». */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Option qui correspond à la saisie (`buffer`, lettres tapées à la suite), −1 si aucune. Une même lettre
 * répétée fait défiler les options qui commencent par elle, à partir de la suivante ; une saisie plus
 * longue cherche le début complet à partir de l'option active (incluse), en bouclant.
 */
export function typeaheadIndex(labels: readonly string[], buffer: string, current: number): number {
  const query = normalize(buffer)
  const count = labels.length
  if (query === '' || count === 0) return -1
  const repeated = query.split(query.charAt(0)).every((part) => part === '')
  const needle = repeated ? query.charAt(0) : query
  const start = current < 0 ? 0 : current + (repeated ? 1 : 0)
  for (let i = 0; i < count; i++) {
    const index = (start + i) % count
    if (normalize(labels[index] ?? '').startsWith(needle)) return index
  }
  return -1
}
