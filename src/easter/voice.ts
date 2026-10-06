// Easter egg v3 (docs/storyboards/easter-park.md) : voix et musique enregistrées (ElevenLabs, fournies par
// Mathis), lues par Web Audio sur le contexte de audio.ts, via son bus des clips (coupé par le bouton Son).
// - Voix : décodées en AudioBuffer (départ à l'échantillon près, ~640 Ko de fichiers).
// - Musique du parc : lue en streaming par un élément <audio> branché sur le bus (createMediaElementSource) :
//   décodée entière, elle pèserait ~75 Mo de RAM (211 s en stéréo), trop pour un mobile. L'élément est créé
//   et débloqué pendant le geste par audio.ts (openAudio, iOS), qui le libère aussi à la sortie.
// Contrat : D1 (timeline) ne lit que CLIPS, SUBTITLES, SPEAKER_MARKS et PARK_MARKS, et appelle playClip.
//
// Fichiers (public/audio/easter/, réencodés depuis les sources de Mathis avec ffmpeg) :
// - houston.mp3 : Houston_apresroute.mp3, silences de début et de fin rognés (−0.04 s au début). Le nom
//   n'y est PAS : la dernière phrase (42.99 → 44.33) est « Le signal porte un nom… » (22 phrases repérées
//   sur l'enveloppe, et la comparaison MFCC/DTW avec houston-boulardtv.mp3 ne trouve pas le mot à la fin).
// - houston-name.mp3 : « BoulardTV. » seul, joué après le silence de suspense.
// - speaker.mp3 : la speakeuse. Voix en mono 96 kb/s, −16 LUFS, crête ≤ −1.5 dBFS.
// - park.mp3 : musicparc.mp3 sans le clic de la première image (−0.10 s), stéréo VBR ~147 kb/s, −18 LUFS.
// Repères mesurés sur les fichiers réencodés (enveloppe RMS par fenêtres de 10 ms, bandes et hauteur
// pour la consonne de « BOULARDTV »). Les durées sont celles du décodage (ffmpeg, délai LAME retiré).
import {
  type ClipPlayer,
  PARK_SRC,
  attachClips,
  getAudioContext,
  getClipBus,
  getMusicElement,
} from './audio'

export type ClipId = 'houston' | 'houstonName' | 'speaker' | 'park'

export type Clip = { src: string; duration: number }

export const CLIPS: Record<ClipId, Clip> = {
  houston: { src: '/audio/easter/houston.mp3', duration: 44.46 },
  houstonName: { src: '/audio/easter/houston-name.mp3', duration: 1.16 },
  speaker: { src: '/audio/easter/speaker.mp3', duration: 7.56 },
  park: { src: PARK_SRC, duration: 210.98 },
}

/** Sous-titre i = site.easter.subtitles[i], affiché de `at` à `end` (s, depuis le début de `clip`). */
export type Subtitle = { clip: ClipId; at: number; end: number }

/**
 * Calés sur la parole : apparition 50 ms avant le premier mot, tenue 0.4 s après le dernier, sans
 * empiéter sur le suivant (écart ≥ 0.1 s). Triés par clip puis par temps (voice.test.ts).
 */
export const SUBTITLES: readonly Subtitle[] = [
  // Houston (passage)
  { clip: 'houston', at: 0, end: 2.13 }, // Ici Houston… vous me recevez ?
  { clip: 'houston', at: 2.23, end: 5.72 }, // Il y a des millions d'années…
  { clip: 'houston', at: 5.82, end: 7.17 }, // … et il a eu peur.
  { clip: 'houston', at: 7.27, end: 8.96 }, // Puis il a découvert le feu.
  { clip: 'houston', at: 9.06, end: 12.15 }, // Il a inventé la roue…
  { clip: 'houston', at: 12.25, end: 15.41 }, // Il a traversé les océans…
  { clip: 'houston', at: 15.51, end: 17.69 }, // il a même posé le pied sur la Lune.
  { clip: 'houston', at: 17.79, end: 20.98 }, // Il a créé Internet…
  { clip: 'houston', at: 21.08, end: 23.54 }, // Des chats. Des tutos. Des clashs.
  { clip: 'houston', at: 23.64, end: 26.99 }, // Mais au fond, l'humanité…
  { clip: 'houston', at: 27.09, end: 29.62 }, // Une chose plus grande que les étoiles.
  { clip: 'houston', at: 29.72, end: 34.5 }, // Ce soir, après des siècles de recherche…
  { clip: 'houston', at: 34.6, end: 36.15 }, // Inconnu. Puissant.
  { clip: 'houston', at: 36.25, end: 39.23 }, // Il se rapproche de la Terre…
  { clip: 'houston', at: 39.33, end: 41 }, // On confirme son identité…
  { clip: 'houston', at: 41.1, end: 42.84 }, // Explorer, vous me recevez ?
  { clip: 'houston', at: 42.94, end: 44.46 }, // Le signal porte un nom…
  // Houston, après le silence
  { clip: 'houstonName', at: 0, end: 1.16 }, // BoulardTV.
  // La speakeuse
  { clip: 'speaker', at: 0, end: 4.66 }, // Alors… mesdames et messieurs… MAINTENANT !
  { clip: 'speaker', at: 4.76, end: 7.56 }, // Bienvenue… à BOULARDTV !
]

/**
 * Repères dans speaker.mp3 (s) : début de « MAINTENANT » (portes), de « Bienvenue », et de « BOULARDTV »
 * (l'explosion du B : la voix tenue avant est le « b » voisé, le mot éclate à 6.25).
 */
export const SPEAKER_MARKS = { doors: 3.68, welcome: 4.81, shout: 6.25 } as const

/**
 * Repères dans park.mp3 (s) : `drop`, premier temps fort (premier coup de grosse caisse après la montée
 * de 6.8 s) ; `beat`, période moyenne du tempo (≈ 133 bpm, le tempo dérive de 131.5 à 134 bpm sur le
 * morceau : bon pour des pulsations lentes, pas pour une synchro au temps près sur 3 minutes).
 */
export const PARK_MARKS = { drop: 6.78, beat: 0.452 } as const

const VOICES: readonly ClipId[] = ['houston', 'houstonName', 'speaker']

/** Voix décodées. Un AudioBuffer n'est pas lié à son contexte : gardé d'une partie à l'autre. */
const buffers: Partial<Record<ClipId, AudioBuffer>> = {}
let loading: { context: AudioContext; promise: Promise<void> } | null = null

type Playing = { source: AudioBufferSourceNode; gain: GainNode }
const playing = new Map<ClipId, Playing>()
/** Contexte des voix en cours : une nouvelle partie (nouveau contexte) repart de zéro. */
let playingContext: AudioContext | null = null

/** Musique du parc : élément <audio> lié au contexte de la partie (createMediaElementSource : une fois). */
type Music = { context: AudioContext; element: HTMLAudioElement; gain: GainNode }
let music: Music | null = null
/** Incrémenté à chaque lecture ou arrêt : la pause différée d'un fondu ne coupe pas une relance. */
let musicToken = 0
/** Musique mise en pause parce que l'onglet est caché : reprise au retour. */
let musicHidden = false

async function loadClip(context: AudioContext, id: ClipId): Promise<void> {
  if (buffers[id]) return
  try {
    const response = await fetch(CLIPS[id].src)
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
    const data = await response.arrayBuffer()
    buffers[id] = await context.decodeAudioData(data)
  } catch (error) {
    // Pas de son pour ce clip : la séquence continue (sous-titres seuls). Retenté à la prochaine partie.
    if (import.meta.env.DEV) console.warn(`[easter] clip ${id} non chargé`, error)
  }
}

/** Branche l'élément de la musique (créé pendant le geste par audio.ts) sur le bus des clips. */
function connectMusic(context: AudioContext): void {
  const bus = getClipBus()
  const element = getMusicElement()
  if (!bus || !element) return
  try {
    const gain = context.createGain()
    context.createMediaElementSource(element).connect(gain).connect(bus)
    music = { context, element, gain }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[easter] musique non branchée', error)
  }
}

/** Fondu de la musique (s) puis pause ; `dispose` : sortie (audio.ts libère ensuite l'élément). */
function fadeOutMusic(fade: number, dispose: boolean): void {
  const current = music
  if (!current) return
  musicToken += 1
  const token = musicToken
  musicHidden = false
  if (dispose) music = null
  const { context, element, gain } = current
  try {
    const now = context.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + fade)
  } catch {
    // Contexte déjà fermé
  }
  window.setTimeout(() => {
    if (!dispose && token !== musicToken) return
    element.pause()
  }, fade * 1000)
}

/** Arrête une voix en fondu (`fade` en s, 0 : net). */
function stopEntry(context: AudioContext, entry: Playing, fade: number): void {
  const now = context.currentTime
  entry.source.onended = null
  try {
    entry.gain.gain.cancelScheduledValues(now)
    entry.gain.gain.setValueAtTime(entry.gain.gain.value, now)
    if (fade > 0) entry.gain.gain.linearRampToValueAtTime(0, now + fade)
    entry.source.stop(now + fade)
  } catch {
    // Source déjà arrêtée
  }
  window.setTimeout(
    () => {
      entry.source.disconnect()
      entry.gain.disconnect()
    },
    fade * 1000 + 100,
  )
}

function stopVoices(fade: number): void {
  const context = playingContext
  if (context) {
    playing.forEach((entry) => {
      stopEntry(context, entry, fade)
    })
  }
  playing.clear()
}

/** Branché sur audio.ts : sortie (closeAudio) et onglet caché. */
const player: ClipPlayer = {
  close: (fade) => {
    stopVoices(fade)
    fadeOutMusic(fade, true)
    playingContext = null
  },
  pause: () => {
    if (!music || music.element.paused) return
    music.element.pause()
    musicHidden = true
  },
  resume: () => {
    if (!music || !musicHidden) return
    musicHidden = false
    void music.element.play().catch(() => undefined)
  },
}

/**
 * Télécharge et décode les voix sur le contexte de audio.ts (~640 Ko), puis branche l'élément de la
 * musique, qui se précharge en streaming depuis le geste (~3.9 Mo, jouée une minute plus tard au moins).
 * Ne bloque rien : la séquence démarre sans attendre, un clip pas encore prêt ne joue pas.
 */
export function loadClips(): Promise<void> {
  const context = getAudioContext()
  if (!context) return Promise.resolve()
  attachClips(player)
  if (loading?.context === context) return loading.promise
  const promise = (async () => {
    await Promise.all(VOICES.map((id) => loadClip(context, id)))
    // Sortie pendant le chargement : contexte fermé, plus de musique à brancher
    if (getAudioContext() === context && music?.context !== context) connectMusic(context)
  })()
  loading = { context, promise }
  return promise
}

function playMusic(offset: number): void {
  const current = music
  if (current?.context !== getAudioContext()) {
    if (import.meta.env.DEV) console.info('[easter] musique pas encore prête, ignorée')
    return
  }
  const { context, element, gain } = current
  musicToken += 1
  musicHidden = false
  gain.gain.cancelScheduledValues(context.currentTime)
  gain.gain.setValueAtTime(1, context.currentTime)
  element.muted = false
  element.currentTime = Math.max(0, offset)
  void element.play().catch(() => undefined)
}

/**
 * Démarre le clip tout de suite (relance s'il joue déjà). `offset` : départ en cours de clip (s), pour le
 * saut de debug. Voix pas encore décodée ou musique pas encore créée : rien (log en DEV). Le son coupé
 * passe par le bus (audio.ts) : le clip joue en silence et reste synchro si l'utilisateur rallume le son.
 */
export function playClip(id: ClipId, offset = 0): void {
  if (id === 'park') {
    playMusic(offset)
    return
  }
  const context = getAudioContext()
  const bus = getClipBus()
  const buffer = buffers[id]
  if (!context || !bus || !buffer) {
    if (import.meta.env.DEV) console.info(`[easter] clip ${id} pas encore décodé, ignoré`)
    return
  }
  if (offset >= buffer.duration) return
  if (playingContext !== context) {
    playing.clear()
    playingContext = context
  }
  const previous = playing.get(id)
  if (previous) stopEntry(context, previous, 0.05)
  const source = context.createBufferSource()
  source.buffer = buffer
  const gain = context.createGain()
  source.connect(gain).connect(bus)
  const entry: Playing = { source, gain }
  source.onended = () => {
    if (playing.get(id) === entry) playing.delete(id)
    source.disconnect()
    gain.disconnect()
  }
  playing.set(id, entry)
  source.start(0, Math.max(0, offset))
}

/** Arrête tous les clips en fondu (`fade` en s) : voix arrêtées, musique en pause à la fin du fondu. */
export function stopClips(fade = 0.4): void {
  const context = getAudioContext()
  if (playingContext === context) stopVoices(fade)
  else playing.clear()
  if (music?.context === context) fadeOutMusic(fade, false)
}
