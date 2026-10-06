// Tests des repères des clips (voice.ts) : sous-titres triés, sans chevauchement, dans leur clip, un texte
// par sous-titre ; repères de la speakeuse et de la musique dans l'ordre et dans la durée.
import { describe, expect, it } from 'vitest'
import { site } from '../content/site'
import { CLIPS, type ClipId, PARK_MARKS, SPEAKER_MARKS, SUBTITLES } from './voice'

const ORDER: readonly ClipId[] = ['houston', 'houstonName', 'speaker', 'park']

describe('SUBTITLES', () => {
  it('un texte par sous-titre (site.easter.subtitles)', () => {
    expect(SUBTITLES).toHaveLength(site.easter.subtitles.length)
    site.easter.subtitles.forEach((line) => {
      expect(line.trim()).not.toBe('')
    })
  })

  it('triés par clip puis par temps', () => {
    SUBTITLES.forEach((sub, i) => {
      const prev = SUBTITLES[i - 1]
      if (!prev) return
      const order = ORDER.indexOf(sub.clip) - ORDER.indexOf(prev.clip)
      expect(order).toBeGreaterThanOrEqual(0)
      if (order === 0) expect(sub.at).toBeGreaterThan(prev.at)
    })
  })

  it('sans chevauchement dans un même clip', () => {
    SUBTITLES.forEach((sub, i) => {
      const prev = SUBTITLES[i - 1]
      if (prev?.clip === sub.clip) expect(sub.at).toBeGreaterThanOrEqual(prev.end)
    })
  })

  it('dans la durée du clip, et assez longs pour être lus', () => {
    SUBTITLES.forEach((sub) => {
      expect(sub.at).toBeGreaterThanOrEqual(0)
      expect(sub.end).toBeGreaterThan(sub.at + 0.5)
      expect(sub.end).toBeLessThanOrEqual(CLIPS[sub.clip].duration)
    })
  })

  it('lignes de 42 caractères au plus, 2 lignes au plus', () => {
    site.easter.subtitles.forEach((text) => {
      const lines = text.split('\n')
      expect(lines.length).toBeLessThanOrEqual(2)
      lines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(42)
      })
    })
  })

  it('le nom est dans son propre clip, après le passage de Houston', () => {
    const name = SUBTITLES.findIndex((sub) => sub.clip === 'houstonName')
    expect(site.easter.subtitles[name]).toBe('BoulardTV.')
  })
})

describe('repères', () => {
  it('speakeuse : portes, « Bienvenue », cri, dans l’ordre et dans le clip', () => {
    expect(SPEAKER_MARKS.doors).toBeGreaterThan(0)
    expect(SPEAKER_MARKS.welcome).toBeGreaterThan(SPEAKER_MARKS.doors)
    expect(SPEAKER_MARKS.shout).toBeGreaterThan(SPEAKER_MARKS.welcome)
    expect(SPEAKER_MARKS.shout).toBeLessThan(CLIPS.speaker.duration)
  })

  it('musique : premier temps fort et tempo plausibles', () => {
    expect(PARK_MARKS.drop).toBeGreaterThanOrEqual(0)
    expect(PARK_MARKS.drop).toBeLessThan(CLIPS.park.duration)
    expect(60 / PARK_MARKS.beat).toBeGreaterThan(60)
    expect(60 / PARK_MARKS.beat).toBeLessThan(200)
  })
})
