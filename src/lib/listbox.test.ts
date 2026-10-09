import { describe, expect, it } from 'vitest'
import { type KeyInput, keyAction, moveIndex, typeaheadIndex } from './listbox'

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...mods,
})

describe('keyAction, liste fermée', () => {
  it('Entrée, Espace, Bas, Alt+Bas et Haut ouvrent sans changer le choix', () => {
    for (const k of [
      key('Enter'),
      key(' '),
      key('ArrowDown'),
      key('ArrowDown', { altKey: true }),
      key('ArrowUp'),
    ]) {
      expect(keyAction(k, false)).toEqual({ type: 'open', to: 'keep' })
    }
  })

  it('Début et Fin ouvrent sur la première ou la dernière option', () => {
    expect(keyAction(key('Home'), false)).toEqual({ type: 'open', to: 'first' })
    expect(keyAction(key('End'), false)).toEqual({ type: 'open', to: 'last' })
  })

  it('une lettre lance la recherche ; Tab, Échap et les raccourcis restent natifs', () => {
    expect(keyAction(key('a'), false)).toEqual({ type: 'type', char: 'a' })
    expect(keyAction(key('Tab'), false)).toBeNull()
    expect(keyAction(key('Escape'), false)).toBeNull()
    expect(keyAction(key('r', { ctrlKey: true }), false)).toBeNull()
  })
})

describe('keyAction, liste ouverte', () => {
  it('navigue avec Haut, Bas, Début, Fin et les pages', () => {
    expect(keyAction(key('ArrowDown'), true)).toEqual({ type: 'move', to: 'next' })
    expect(keyAction(key('ArrowUp'), true)).toEqual({ type: 'move', to: 'prev' })
    expect(keyAction(key('Home'), true)).toEqual({ type: 'move', to: 'first' })
    expect(keyAction(key('End'), true)).toEqual({ type: 'move', to: 'last' })
    expect(keyAction(key('PageDown'), true)).toEqual({ type: 'move', to: 'pageNext' })
  })

  it('Entrée, Espace et Alt+Haut choisissent ; Échap ferme ; Tab choisit et sort', () => {
    expect(keyAction(key('Enter'), true)).toEqual({ type: 'select' })
    expect(keyAction(key(' '), true)).toEqual({ type: 'select' })
    expect(keyAction(key('ArrowUp', { altKey: true }), true)).toEqual({ type: 'select' })
    expect(keyAction(key('Escape'), true)).toEqual({ type: 'close' })
    expect(keyAction(key('Tab'), true)).toEqual({ type: 'selectAndLeave' })
  })

  it('Espace complète une recherche en cours au lieu de choisir', () => {
    expect(keyAction(key(' '), true, true)).toEqual({ type: 'type', char: ' ' })
  })
})

describe('moveIndex', () => {
  it('avance et recule sans boucler', () => {
    expect(moveIndex('next', -1, 7)).toBe(0)
    expect(moveIndex('next', 2, 7)).toBe(3)
    expect(moveIndex('next', 6, 7)).toBe(6)
    expect(moveIndex('prev', 0, 7)).toBe(0)
    expect(moveIndex('prev', -1, 7)).toBe(0)
    expect(moveIndex('first', 4, 7)).toBe(0)
    expect(moveIndex('last', 0, 7)).toBe(6)
    expect(moveIndex('pageNext', 1, 7)).toBe(6)
    expect(moveIndex('pagePrev', 5, 7)).toBe(0)
    expect(moveIndex('next', 0, 0)).toBe(-1)
  })
})

describe('typeaheadIndex', () => {
  const labels = [
    'Site vitrine',
    'Boutique en ligne',
    'Application web',
    'Application mobile',
    'Refonte ou maintenance',
    'Plateforme 18+ (contenu adulte)',
    'Outil développeur, automatisation, IA',
    'Autre chose',
  ]

  it('saute à la première option qui commence par la lettre', () => {
    expect(typeaheadIndex(labels, 'b', -1)).toBe(1)
    expect(typeaheadIndex(labels, 'R', 0)).toBe(4)
    expect(typeaheadIndex(labels, 'z', 0)).toBe(-1)
  })

  it('la même lettre répétée fait défiler les options correspondantes, en bouclant', () => {
    expect(typeaheadIndex(labels, 'a', -1)).toBe(2)
    expect(typeaheadIndex(labels, 'a', 2)).toBe(3)
    expect(typeaheadIndex(labels, 'aa', 3)).toBe(7)
    expect(typeaheadIndex(labels, 'a', 7)).toBe(2)
  })

  it('une saisie plus longue vise le début complet, sans tenir compte des accents', () => {
    expect(typeaheadIndex(labels, 'au', 2)).toBe(7)
    expect(typeaheadIndex(labels, 'o', -1)).toBe(6)
    expect(typeaheadIndex(labels, 'application m', 2)).toBe(3)
    expect(typeaheadIndex(['Échafaudage', 'Ébénisterie'], 'eb', -1)).toBe(1)
  })
})
