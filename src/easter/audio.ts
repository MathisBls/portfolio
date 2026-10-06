// Easter egg : contexte audio. Bundle initial (quelques lignes, aucun son ici). L'AudioContext est créé
// dans le keydown du code Konami : c'est un geste utilisateur, les navigateurs autorisent alors le son.
// Le moteur de tension (tension.ts, Web Audio pur) vit dans le chunk lazy et s'y branche une fois chargé.
// Les clips enregistrés (voice.ts : Houston, la speakeuse, la musique du parc) passent par un bus à part,
// coupé et rétabli par le bouton Son comme le moteur. voice.ts (chunk à part) s'y branche par attachClips.
// Onglet caché : le contexte est suspendu et la musique (élément <audio> en streaming) mise en pause (GSAP
// et le rendu s'arrêtent aussi), puis tout reprend au retour : les voix restent synchro avec la timeline.
// Second niveau (docs/storyboards/easter-majestic.md) : la musique du Sanctuaire a son propre élément,
// créé et débloqué par unlockMajestic dans le keydown de la dernière lettre de `boulardtv`.

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
/** Musique du Sanctuaire (MAJESTIC de majestic/music.ts, qui la reprend d'ici). */
export const MAJESTIC_SRC = '/audio/easter/majestic.mp3'

let context: AudioContext | null = null
let engine: TensionEngine | null = null
let clips: ClipPlayer | null = null
/** Élément <audio> de la musique, créé et débloqué pendant le geste (iOS), branché ensuite par voice.ts. */
let musicElement: HTMLAudioElement | null = null
/** Élément de la musique du Sanctuaire (préchargé pendant le parc, ou créé dans le geste du mot de passe). */
let majesticElement: HTMLAudioElement | null = null
/** Déjà débloqué : un second appel couperait la musique en train de jouer (lecture muette puis pause). */
let majesticUnlocked = false
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

/** Élément <audio> en streaming (pas de décodage complet en mémoire). */
function createStream(src: string): HTMLAudioElement {
  const element = new Audio()
  element.preload = 'auto'
  element.src = src
  return element
}

/**
 * Débloque un élément pendant le geste : iOS refuse un play() hors geste sur un élément qui n'a jamais
 * joué. Lecture muette puis pause aussitôt ; le préchargement en streaming démarre. `isCurrent` : faux
 * si l'élément a été libéré entre-temps (sortie).
 */
function unlockElement(element: HTMLAudioElement, isCurrent: () => boolean): void {
  element.muted = true
  const unmute = () => {
    // Déjà relancée pour de vrai par voice.ts (muted remis à false) : ne rien toucher
    if (!isCurrent() || !element.muted) return
    element.pause()
    element.currentTime = 0
    element.muted = false
  }
  element.play().then(unmute, unmute)
}

function unlockMusic(): void {
  const element = createStream(PARK_SRC)
  musicElement = element
  unlockElement(element, () => musicElement === element)
}

/** Arrête un élément et coupe son téléchargement. */
function releaseElement(element: HTMLAudioElement): void {
  element.pause()
  element.removeAttribute('src')
  element.load()
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

/**
 * Facultatif, hors geste : crée l'élément du Sanctuaire pendant le parc pour que le streaming démarre
 * avant la saisie du mot de passe. unlockMajestic le reprend. Sans partie en cours : rien.
 */
export function preloadMajesticMusic(): void {
  if (!context || majesticElement) return
  majesticElement = createStream(MAJESTIC_SRC)
}

/**
 * Second niveau : à appeler dans le geste qui le déclenche (keydown de la dernière lettre de `boulardtv`,
 * ou tape). Crée l'élément du Sanctuaire (ou reprend celui préchargé) et le débloque comme celui du parc,
 * puis relance un contexte suspendu. Idempotent. Sans partie en cours (pas de contexte) : rien.
 */
export function unlockMajestic(): void {
  if (!context) return
  if (context.state === 'suspended' && !suspendedForHidden) {
    void context.resume().catch(() => undefined)
  }
  if (majesticUnlocked) return
  const element = majesticElement ?? createStream(MAJESTIC_SRC)
  majesticElement = element
  majesticUnlocked = true
  unlockElement(element, () => majesticElement === element)
}

/** Élément de la musique du Sanctuaire (null avant unlockMajestic ou après la sortie). */
export function getMajesticElement(): HTMLAudioElement | null {
  return majesticElement
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
  const elements = [musicElement, majesticElement]
  musicElement = null
  majesticElement = null
  majesticUnlocked = false
  setTimeout(() => {
    if (closing) void closing.close().catch(() => undefined)
    // Musiques arrêtées et libérées (téléchargement coupé)
    for (const element of elements) if (element) releaseElement(element)
  }, 400)
}
