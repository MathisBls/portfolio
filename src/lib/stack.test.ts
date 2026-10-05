import { describe, expect, it } from 'vitest'
import { uniqueStack } from './stack'

describe('uniqueStack', () => {
  it('déduplique sans tenir compte de la casse et garde l’ordre', () => {
    expect(
      uniqueStack([
        { stack: ['React Native', 'Node'] },
        { stack: ['node', 'Rust', 'React Native'] },
      ]),
    ).toEqual(['React Native', 'Node', 'Rust'])
  })

  it('ignore les TODO', () => {
    expect(uniqueStack([{ stack: ['TODO: Astro ou React', 'Netlify'] }])).toEqual(['Netlify'])
  })
})
