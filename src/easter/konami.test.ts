// Tests de la détection du code Konami (logique pure de konami.ts).
import { describe, expect, it } from 'vitest'
import { KONAMI, createKonami, isModified, normalizeKey } from './konami'

const feed = (keys: readonly string[]) => {
  const match = createKonami()
  return keys.map((key) => match(key))
}

describe('createKonami', () => {
  it('se déclenche sur la dernière touche de la séquence, et seulement là', () => {
    const results = feed(KONAMI)
    expect(results.at(-1)).toBe(true)
    expect(results.slice(0, -1).every((r) => !r)).toBe(true)
  })

  it('accepte B et A en majuscules', () => {
    const keys = [...KONAMI.slice(0, 8), 'B', 'A']
    expect(feed(keys).at(-1)).toBe(true)
  })

  it('tolère des touches parasites avant la séquence', () => {
    expect(feed(['x', 'ArrowUp', 'Enter', ...KONAMI]).at(-1)).toBe(true)
  })

  it('tolère une flèche haut en trop au début (↑ ↑ ↑ ↓ ↓ …)', () => {
    expect(feed(['ArrowUp', ...KONAMI]).at(-1)).toBe(true)
  })

  it('échoue si une touche est fausse au milieu', () => {
    const keys = [...KONAMI.slice(0, 5), 'ArrowUp', ...KONAMI.slice(6)]
    expect(feed(keys).some(Boolean)).toBe(false)
  })

  it('échoue si l’ordre de B et A est inversé', () => {
    const keys = [...KONAMI.slice(0, 8), 'a', 'b']
    expect(feed(keys).some(Boolean)).toBe(false)
  })

  it('repart de zéro après un succès : deux séquences complètes = deux déclenchements', () => {
    const results = feed([...KONAMI, ...KONAMI])
    expect(results.filter(Boolean)).toHaveLength(2)
  })

  it('ne se redéclenche pas sur une seule touche après un succès', () => {
    const results = feed([...KONAMI, 'a'])
    expect(results.at(-1)).toBe(false)
  })

  it('accepte une séquence personnalisée', () => {
    const match = createKonami(['x', 'y'])
    expect(match('x')).toBe(false)
    expect(match('Y')).toBe(true)
  })
})

describe('normalizeKey', () => {
  it('met les lettres en minuscules et laisse les touches nommées', () => {
    expect(normalizeKey('B')).toBe('b')
    expect(normalizeKey('ArrowLeft')).toBe('ArrowLeft')
  })
})

describe('isModified', () => {
  const key = { key: 'a', ctrlKey: false, metaKey: false, altKey: false }
  it('ignore les raccourcis', () => {
    expect(isModified(key)).toBe(false)
    expect(isModified({ ...key, ctrlKey: true })).toBe(true)
    expect(isModified({ ...key, metaKey: true })).toBe(true)
    expect(isModified({ ...key, altKey: true })).toBe(true)
  })
})
