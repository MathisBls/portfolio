// Easter egg : contexte audio. Bundle initial (quelques lignes, aucun son ici). L'AudioContext est créé
// dans le keydown du code Konami : c'est un geste utilisateur, les navigateurs autorisent alors le son.
// Le moteur de tension (tension.ts, Web Audio pur) vit dans le chunk lazy et s'y branche une fois chargé.
// Les clips enregistrés (voice.ts : Houston, la speakeuse, la musique du parc) passent par un bus à part,
// coupé et rétabli par le bouton Son comme le moteur. voice.ts (chunk à part) s'y branche par attachClips.
// Onglet caché : le contexte est suspendu et la musique (élément <audio> en streaming) mise en pause (GSAP
// et le rendu s'arrêtent aussi), puis tout reprend au retour : les voix restent synchro avec la timeline.

export type TensionCue = 'shatter' | 'deal' | 'flip' | 'legendary' | 'swap' | 'type'

/** API du moteur de tension (tension.ts). */
export type TensionEngine = {
  start: () => void
  /** 0 calme -> 1 vitesse de la lumière : nappe, riser et tempo du cœur. */
  setIntensity: (value: number) => void
  /** Une demi-seconde de silence (avant l'éclatement du prisme), puis tout reprend. */
  hush: () => void
  /** Silence d'une demi-seconde puis impact grave, puis nappe finale. */
  climax: () => void
  cue: (name: TensionCue) => void
  mute: (muted: boolean) => void
  stop: () => void
}

/** Lecteur des clips (voice.ts) : arrêt à la sortie, pause de la musique quand l'onglet est caché. */
export type ClipPlayer = {
  /** Sortie : fondu (s), puis tout est arrêté et libéré. */
  close: (fade: number) => void
  pause: () => void
  resume: () => void
}

/** Musique du parc (CLIPS.park de voice.ts), en dur ici pour ne pas importer voice.ts au bundle initial. */
export const PARK_SRC = '/audio/easter/park.mp3'

let context: AudioContext | null = null
let engine: TensionEngine | null = null
let clips: ClipPlayer | null = null
/** Élément <audio> de la musique, créé et débloqué pendant le geste (iOS), branché ensuite par voice.ts. */
let musicElement: HTMLAudioElement | null = null
/** Bus des clips (voice.ts) : gain 0 quand le son est coupé. */
let clipBus: GainNode | null = null
let muted = false
/** Contexte suspendu par nous (onglet caché) : seul celui-là est repris au retour. */
let suspendedForHidden = false

function onVisibilityChange(): void {
  if (!context) return
  if (document.hidden) {
    if (context.state !== 'running') return
    suspendedForHidden = true
    void context.suspend().catch(() => undefined)
    clips?.pause()
  } else if (suspendedForHidden) {
    suspendedForHidden = false
    void context.resume().catch(() => undefined)
    clips?.resume()
  }
}

/**
 * Débloque l'élément de la musique pendant le geste : iOS refuse un play() hors geste sur un élément qui
 * n'a jamais joué. Lecture muette puis pause aussitôt ; le préchargement en streaming démarre.
 */
function unlockMusic(): void {
  const element = new Audio()
  element.preload = 'auto'
  element.src = PARK_SRC
  element.muted = true
  musicElement = element
  const unmute = () => {
    // Déjà relancée pour de vrai par voice.ts (muted remis à false) : ne rien toucher
    if (musicElement !== element || !element.muted) return
    element.pause()
    element.currentTime = 0
    element.muted = false
  }
  element.play().then(unmute, unmute)
}

/**
 * À appeler pendant le geste (keydown). `startMuted` : reduced-motion, son coupé par défaut. `withMusic` :
 * la séquence jouera (WebGL 2), l'élément de la musique est créé et débloqué maintenant.
 */
export function openAudio(startMuted: boolean, withMusic = false): void {
  muted = startMuted
  if (context || typeof AudioContext === 'undefined') return
  try {
    context = new AudioContext()
  } catch {
    context = null
    return
  }
  suspendedForHidden = false
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (withMusic) unlockMusic()
}

/** Élément de la musique de la partie en cours (null sans geste ou après la sortie). */
export function getMusicElement(): HTMLAudioElement | null {
  return musicElement
}

export function getAudioContext(): AudioContext | null {
  return context
}

/** Bus des clips, créé au premier besoin sur le contexte courant. null sans contexte. */
export function getClipBus(): GainNode | null {
  if (!context) return null
  if (!clipBus) {
    clipBus = context.createGain()
    clipBus.gain.value = muted ? 0 : 1
    clipBus.connect(context.destination)
  }
  return clipBus
}

export function attachClips(next: ClipPlayer | null): void {
  clips = next
}

export function attachEngine(next: TensionEngine | null): void {
  engine = next
  next?.mute(muted)
}

export function getEngine(): TensionEngine | null {
  return engine
}

export function isMuted(): boolean {
  return muted
}

/** Bouton son de l'overlay (geste utilisateur : relance aussi un contexte suspendu). */
export function setMuted(value: boolean): void {
  muted = value
  if (!value && context?.state === 'suspended') void context.resume().catch(() => undefined)
  engine?.mute(value)
  if (clipBus) clipBus.gain.setTargetAtTime(value ? 0 : 1, clipBus.context.currentTime, 0.03)
}

/** Sortie : le moteur et les clips s'éteignent en fondu, puis le contexte est fermé. */
export function closeAudio(): void {
  engine?.stop()
  engine = null
  clips?.close(0.3)
  clips = null
  if (clipBus) clipBus.gain.setTargetAtTime(0, clipBus.context.currentTime, 0.08)
  clipBus = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
  suspendedForHidden = false
  const closing = context
  context = null
  const element = musicElement
  musicElement = null
  setTimeout(() => {
    if (closing) void closing.close().catch(() => undefined)
    // Musique arrêtée et libérée (téléchargement coupé)
    if (element) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, 400)
}
