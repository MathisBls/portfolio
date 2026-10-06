import { describe, expect, it } from 'vitest'
import { pointerOffset } from './pointer'

const box = { left: 100, top: 50, width: 200, height: 100 }

describe('pointerOffset', () => {
  it('vaut 0 au centre', () => {
    expect(pointerOffset(box, 200, 100)).toEqual({ x: 0, y: 0 })
  })

  it('vaut -1 et 1 aux bords', () => {
    expect(pointerOffset(box, 100, 50)).toEqual({ x: -1, y: -1 })
    expect(pointerOffset(box, 300, 150)).toEqual({ x: 1, y: 1 })
  })

  it('reste borné hors de la boîte', () => {
    expect(pointerOffset(box, 0, 1000)).toEqual({ x: -1, y: 1 })
  })

  it('ne divise pas par zéro', () => {
    expect(pointerOffset({ left: 0, top: 0, width: 0, height: 10 }, 5, 5)).toEqual({ x: 0, y: 0 })
  })
})
