// Easter egg : sons ponctuels en Web Audio (aucun fichier audio). Utilisés par tension.ts : battement
// de cœur (kick sinus à hauteur qui chute), grave de la sortie du warp, bruit filtré (souffle, éclats de
// verre), carillon de la légendaire, et les sons des beats 6 et 7 (docs/storyboards/easter-park.md :
// « souffle, impact doux », portes). Chaque son crée ses nœuds et les libère à la fin (stop programmé).
import type { TensionCue } from './audio'

/** Bruit blanc partagé (2 s), créé une fois par contexte. */
const noises = new WeakMap<BaseAudioContext, AudioBuffer>()

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noises.get(ctx)
  if (cached) return cached
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let seed = 1
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647
    data[i] = (seed / 2147483647) * 2 - 1
  }
  noises.set(ctx, buffer)
  return buffer
}

/** Enveloppe percussive : attaque `attack`, puis chute exponentielle jusqu'à `end`. */
function envelope(gain: GainNode, at: number, peak: number, attack: number, end: number) {
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
}

/** Kick sinus : hauteur qui chute de `from` à `to` Hz. Sert au cœur et à l'impact. */
export function kick(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  peak: number,
  { from = 110, to = 42, drop = 0.14, length = 0.32 } = {},
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.setValueAtTime(from, at)
  osc.frequency.exponentialRampToValueAtTime(to, at + drop)
  envelope(gain, at, peak, 0.006, at + length)
  osc.connect(gain).connect(out)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

type NoiseOptions = {
  from?: number
  to?: number
  length?: number
  q?: number
  type?: BiquadFilterType
}

/** Bruit filtré (passe-bande par défaut) dont la fréquence glisse de `from` à `to`. */
export function noise(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  peak: number,
  { from = 800, to = 3000, length = 0.3, q = 1, type = 'bandpass' }: NoiseOptions = {},
) {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, at)
  filter.frequency.exponentialRampToValueAtTime(to, at + length)
  const gain = ctx.createGain()
  envelope(gain, at, peak, Math.min(0.02, length / 4), at + length)
  source.connect(filter).connect(gain).connect(out)
  source.start(at, Math.random() * 1.5)
  source.stop(at + length + 0.05)
}

/** Notes sinus à décroissance lente (carillon, éclats de verre). */
export function chime(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  notes: readonly number[],
  { peak = 0.06, gap = 0.06, length = 1.4 } = {},
) {
  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = frequency
    const start = at + i * gap
    envelope(gain, start, peak, 0.004, start + length)
    osc.connect(gain).connect(out)
    osc.start(start)
    osc.stop(start + length + 0.05)
  })
}

/** Sons ponctuels de la séquence (timeline.ts). */
export function playCue(ctx: AudioContext, out: AudioNode, name: TensionCue) {
  const now = ctx.currentTime + 0.01
  if (name === 'shatter') {
    // Verre qui vole en éclats : souffle aigu, craquement large, éclats tintants, coup grave
    noise(ctx, out, now, 0.7, { from: 7000, to: 2200, length: 0.8, q: 0.7, type: 'highpass' })
    noise(ctx, out, now, 0.55, { from: 2600, to: 180, length: 0.9, q: 0.4, type: 'lowpass' })
    chime(ctx, out, now, [2637, 3520, 4186, 3136, 4699, 2349, 3951], {
      peak: 0.035,
      gap: 0.035,
      length: 0.7,
    })
    kick(ctx, out, now, 0.95, { from: 120, to: 28, drop: 0.5, length: 1.5 })
  } else if (name === 'type') {
    chime(ctx, out, now, [1760], { peak: 0.016, length: 0.045 })
  } else if (name === 'deal') {
    noise(ctx, out, now, 0.12, { from: 700, to: 3200, length: 0.28 })
  } else if (name === 'flip') {
    noise(ctx, out, now, 0.16, { from: 2400, to: 1600, length: 0.09, q: 3 })
    chime(ctx, out, now + 0.5, [880, 1320], { peak: 0.03, length: 0.9 })
  } else if (name === 'legendary') {
    chime(ctx, out, now, [523.25, 659.25, 783.99, 1046.5, 1318.5], { peak: 0.05, length: 1.8 })
    kick(ctx, out, now, 0.4, { from: 80, to: 45, drop: 0.4, length: 1.2 })
  } else {
    noise(ctx, out, now, 0.22, { from: 300, to: 4500, length: 0.7, q: 0.8 })
  }
}

/** Sons des beats 6 et 7 : souffle au mot, bond (et son arrivée), grondement des portes. */
export type SpaceCue = 'reveal' | 'leap' | 'doors'

export function playSpaceCue(ctx: AudioContext, out: AudioNode, name: SpaceCue) {
  const now = ctx.currentTime + 0.01
  if (name === 'reveal') {
    // Souffle qui monte pendant que la porte s'allume, carillon grave et doux
    noise(ctx, out, now, 0.22, { from: 180, to: 2600, length: 1.6, q: 0.7 })
    chime(ctx, out, now + 0.3, [220, 329.63, 440], { peak: 0.035, gap: 0.12, length: 2.6 })
  } else if (name === 'leap') {
    // Bond : souffle large qui file, puis impact doux à l'arrivée devant la porte
    noise(ctx, out, now, 0.32, { from: 260, to: 5200, length: 0.9, q: 0.6 })
    kick(ctx, out, now + 1.05, 0.55, { from: 72, to: 30, drop: 0.7, length: 1.8 })
    noise(ctx, out, now + 1.05, 0.18, { from: 900, to: 90, length: 1.4, q: 0.4, type: 'lowpass' })
  } else {
    // Portes : grondement grave qui roule, un choc sourd au déverrouillage
    kick(ctx, out, now, 0.45, { from: 52, to: 30, drop: 0.5, length: 1.4 })
    noise(ctx, out, now, 0.3, { from: 90, to: 420, length: 2.2, q: 0.5, type: 'lowpass' })
  }
}
