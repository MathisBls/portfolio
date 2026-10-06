// Easter egg : son de tension généré en Web Audio (aucun fichier audio). API : start(),
// setIntensity(0..1), hush(), climax(), cue(), mute(bool), stop() (type TensionEngine, audio.ts).
// - Nappe grave : trois scies désaccordées (la1, mi2), filtre passe-bas résonant ouvert par l'intensité,
//   balayé lentement par un LFO.
// - Riser : bruit filtré dont la bande monte, plus un sinus dont la hauteur monte avec l'intensité.
// - Cœur : double battement (kick sinus à hauteur qui chute), tempo de 52 à 160 bpm selon l'intensité,
//   planifié à l'avance sur l'horloge audio (pas de dérive).
// - Suspension (hush) : une demi-seconde de silence avant l'éclatement du prisme, puis tout reprend.
// - Climax : silence d'une demi-seconde, impact grave, puis une nappe calme (accord de la majeur).
// - Tics du message (cue 'type') : un bip court et discret par lettre.
// Volume : bus maître + compresseur ; mute agit sur une sortie séparée (l'enveloppe du bus continue).
import type { TensionCue, TensionEngine } from './audio'
import { kick, noise, noiseBuffer, playCue } from './sfx'

const SILENCE = 0.5
const LOOKAHEAD = 0.15

export function createTension(ctx: AudioContext): TensionEngine {
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
  const sources: AudioScheduledSourceNode[] = [...oscillators, lfo, hiss, whine]

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
      if (ended) return
      intensity = Math.min(1, Math.max(0, value))
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
      bus.gain.cancelScheduledValues(now)
      bus.gain.setTargetAtTime(0, now, 0.03)
      const hit = now + SILENCE
      ;[drone.gain, hissGain.gain, whineGain.gain].forEach((param) => {
        param.cancelScheduledValues(now)
        param.setTargetAtTime(0, now, 0.03)
      })
      bus.gain.setValueAtTime(1, hit)
      kick(ctx, bus, hit, 1, { from: 70, to: 26, drop: 1.4, length: 3.2 })
      noise(ctx, bus, hit, 0.5, { from: 1400, to: 120, length: 1.1, q: 0.5, type: 'lowpass' })
      // Nappe finale : accord de la majeur, attaque lente
      ;[110, 164.81, 277.18].forEach((frequency) => {
        const osc = ctx.createOscillator()
        osc.frequency.value = frequency
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0, hit)
        gain.gain.linearRampToValueAtTime(0.045, hit + 2.5)
        osc.connect(gain).connect(bus)
        osc.start(hit)
        sources.push(osc)
      })
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
