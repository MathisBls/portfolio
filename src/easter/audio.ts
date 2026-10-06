// Easter egg : contexte audio. Bundle initial (quelques lignes, aucun son ici). L'AudioContext est créé
// dans le keydown du code Konami : c'est un geste utilisateur, les navigateurs autorisent alors le son.
// Le moteur de tension (tension.ts, Web Audio pur) vit dans le chunk lazy et s'y branche une fois chargé.

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

let context: AudioContext | null = null
let engine: TensionEngine | null = null
let muted = false

/** À appeler pendant le geste (keydown). `startMuted` : reduced-motion, son coupé par défaut. */
export function openAudio(startMuted: boolean): void {
  muted = startMuted
  if (context || typeof AudioContext === 'undefined') return
  try {
    context = new AudioContext()
  } catch {
    context = null
  }
}

export function getAudioContext(): AudioContext | null {
  return context
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
}

/** Sortie : le moteur s'éteint en fondu, puis le contexte est fermé. */
export function closeAudio(): void {
  engine?.stop()
  engine = null
  const closing = context
  context = null
  if (closing) {
    setTimeout(() => {
      void closing.close().catch(() => undefined)
    }, 400)
  }
}
