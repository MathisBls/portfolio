// Easter egg (docs/storyboards/easter-park.md, colonne « Ce qu'on entend ») : son de tension généré en
// Web Audio (aucun fichier). API : start(), setIntensity(0..1), hush(), climax(), cue(), mute(bool),
// stop() (type TensionEngine, audio.ts), plus sfx() pour les beats 4 à 7 (SequenceEngine).
// - Nappe grave : trois scies désaccordées (la1, mi2), filtre passe-bas résonant ouvert par l'intensité,
//   balayé lentement par un LFO.
// - Riser : bruit filtré dont la bande monte, plus un sinus dont la hauteur monte avec l'intensité.
// - Cœur : double battement (kick sinus à hauteur qui chute), tempo de 52 à 160 bpm selon l'intensité,
//   planifié à l'avance sur l'horloge audio (pas de dérive).
// - Suspension (hush) : une demi-seconde de silence avant l'éclatement du prisme, puis tout reprend.
// - Sortie du warp (climax, beat 4) : tout retombe (le riser plonge, le cœur s'arrête), un grave sourd,
//   puis une nappe spatiale calme dont le niveau suit l'intensité : basse sous les voix, coupée à
//   l'arrivée de la musique (timeline.ts).
// - Tics du message (cue 'type') : un bip court et discret par lettre.
// - Beats 6 et 7 (sfx) : souffle au mot « BoulardTV », bond et impact doux, grondement des portes.
// Volume : bus maître + compresseur ; mute agit sur une sortie séparée (l'enveloppe du bus continue).
import type { TensionCue, TensionEngine } from './audio'
import { type SpaceCue, kick, noise, noiseBuffer, playCue, playSpaceCue } from './sfx'

const SILENCE = 0.5
const LOOKAHEAD = 0.15
/** Nappe spatiale (après la sortie du warp) : la2, mi3, si3 (accord suspendu), gain maximal. */
const PAD = { notes: [110, 164.81, 246.94], gain: 0.05 }

/** Moteur de la séquence : tension, plus les sons ponctuels des beats 4 à 7. */
export type SequenceEngine = TensionEngine & { sfx: (name: SpaceCue) => void }

export function createTension(ctx: AudioContext): SequenceEngine {
  const out = ctx.createGain()
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -16
  compressor.ratio.value = 4
  out.connect(compressor).connect(ctx.destination)
  const bus = ctx.createGain()
  bus.gain.value = 0
  bus.connect(out)

  // Nappe grave
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 7
  filter.frequency.value = 180
  const drone = ctx.createGain()
  drone.gain.value = 0.11
  filter.connect(drone).connect(bus)
  const oscillators = [55, 55, 82.41].map((frequency, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = frequency
    osc.detune.value = [-9, 7, 3][i] ?? 0
    osc.connect(filter)
    return osc
  })
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.13
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = 90
  lfo.connect(lfoDepth).connect(filter.frequency)

  // Riser
  const hiss = ctx.createBufferSource()
  hiss.buffer = noiseBuffer(ctx)
  hiss.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 1.4
  band.frequency.value = 400
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0
  hiss.connect(band).connect(hissGain).connect(bus)
  const whine = ctx.createOscillator()
  whine.frequency.value = 110
  const whineGain = ctx.createGain()
  whineGain.gain.value = 0
  whine.connect(whineGain).connect(bus)

  const heart = ctx.createGain()
  heart.gain.value = 0.9
  heart.connect(bus)
  // Nappe spatiale : muette jusqu'à la sortie du warp, filtrée, légère pulsation lente (0.08 Hz)
  const pad = ctx.createGain()
  pad.gain.value = 0
  const padFilter = ctx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 900
  padFilter.connect(pad).connect(bus)
  const padVoices = PAD.notes.map((frequency, i) => {
    const osc = ctx.createOscillator()
    osc.type = i === 0 ? 'triangle' : 'sine'
    osc.frequency.value = frequency
    osc.detune.value = [0, -4, 5][i] ?? 0
    osc.connect(padFilter)
    return osc
  })
  const sources: AudioScheduledSourceNode[] = [...oscillators, lfo, hiss, whine, ...padVoices]

  let intensity = 0
  let ended = false
  let nextBeat = 0
  let beating = false
  /** Reprise du cœur après une suspension (temps audio), 0 : aucune en attente. */
  let resumeAt = 0
  let timer = 0
  const schedule = () => {
    if (!beating && resumeAt > 0 && !ended && ctx.currentTime >= resumeAt) {
      beating = true
      nextBeat = resumeAt
      resumeAt = 0
    }
    if (!beating) return
    while (nextBeat < ctx.currentTime + LOOKAHEAD) {
      const v = 0.45 + 0.4 * intensity
      kick(ctx, heart, nextBeat, v)
      kick(ctx, heart, nextBeat + 0.17, v * 0.6, { from: 95, to: 40 })
      nextBeat += 60 / (52 + 108 * intensity)
    }
  }

  const ramp = (param: AudioParam, value: number, tau = 0.25) => {
    param.setTargetAtTime(value, ctx.currentTime, tau)
  }

  return {
    start() {
      const now = ctx.currentTime
      sources.forEach((source) => {
        source.start(now)
      })
      bus.gain.setTargetAtTime(1, now, 0.4)
      beating = true
      nextBeat = now + 0.3
      timer = window.setInterval(schedule, 40)
    },
    setIntensity(value) {
      intensity = Math.min(1, Math.max(0, value))
      // Après la sortie du warp : l'intensité règle seulement la nappe spatiale (0 : silence)
      if (ended) {
        ramp(pad.gain, PAD.gain * intensity, 0.5)
        return
      }
      ramp(filter.frequency, 160 + 1400 * intensity * intensity)
      ramp(drone.gain, 0.11 + 0.08 * intensity)
      ramp(band.frequency, 400 + 5200 * intensity * intensity)
      ramp(hissGain.gain, 0.16 * Math.pow(intensity, 2.2))
      ramp(whine.frequency, 110 * Math.pow(2, 3.2 * intensity))
      ramp(whineGain.gain, 0.05 * Math.pow(intensity, 1.6))
    },
    hush() {
      const now = ctx.currentTime
      beating = false
      resumeAt = now + SILENCE + 0.8
      bus.gain.cancelScheduledValues(now)
      bus.gain.setTargetAtTime(0, now, 0.03)
      bus.gain.setValueAtTime(1, now + SILENCE)
    },
    climax() {
      const now = ctx.currentTime
      ended = true
      resumeAt = 0
      beating = false
      // Tout retombe : le riser plonge, la nappe se ferme, puis un grave sourd
      ;[whine.frequency, band.frequency, filter.frequency].forEach((param) => {
        param.cancelScheduledValues(now)
      })
      whine.frequency.setValueAtTime(whine.frequency.value, now)
      whine.frequency.exponentialRampToValueAtTime(38, now + 1.1)
      band.frequency.setValueAtTime(band.frequency.value, now)
      band.frequency.exponentialRampToValueAtTime(160, now + 1)
      filter.frequency.setTargetAtTime(110, now, 0.3)
      ;[drone.gain, hissGain.gain, whineGain.gain].forEach((param) => {
        param.cancelScheduledValues(now)
        param.setTargetAtTime(0, now, 0.35)
      })
      kick(ctx, bus, now + 0.25, 0.75, { from: 58, to: 24, drop: 1.8, length: 3.6 })
      noise(ctx, bus, now + 0.2, 0.3, { from: 700, to: 70, length: 2.4, q: 0.4, type: 'lowpass' })
    },
    sfx(name: SpaceCue) {
      playSpaceCue(ctx, bus, name)
    },
    cue(name: TensionCue) {
      // L'éclatement suit la suspension : hors du bus, il ne dépend pas de l'instant où le bus revient
      playCue(ctx, name === 'shatter' ? out : bus, name)
    },
    mute(muted) {
      out.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05)
    },
    stop() {
      const now = ctx.currentTime
      beating = false
      window.clearInterval(timer)
      bus.gain.cancelScheduledValues(now)
      bus.gain.setTargetAtTime(0, now, 0.08)
      sources.forEach((source) => {
        try {
          source.stop(now + 0.5)
        } catch {
          // Source jamais démarrée (stop avant start) : rien à arrêter
        }
      })
    },
  }
}
