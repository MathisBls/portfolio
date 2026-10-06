import { describe, expect, it } from 'vitest'
import { stagger } from './stagger'

describe('stagger', () => {
  it('écrit --reveal-i', () => {
    expect(stagger(3)).toEqual({ '--reveal-i': 3 })
  })

  it('plafonne et ne descend pas sous 0', () => {
    expect(stagger(40)).toEqual({ '--reveal-i': 8 })
    expect(stagger(40, 4)).toEqual({ '--reveal-i': 4 })
    expect(stagger(-2)).toEqual({ '--reveal-i': 0 })
  })
})
