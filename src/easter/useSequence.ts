// Easter egg : lance la séquence quand la scène est prête (stage 'running') : état remis à zéro,
// moteur de tension branché sur l'AudioContext ouvert au déverrouillage (audio.ts), timeline GSAP
// (timeline.ts). Onglet masqué : timeline et son en pause (sinon le ticker GSAP, sans lissage du
// décalage quand Lenis tourne, sauterait à la fin au retour). Intensité du son relue chaque frame.
// En dev : window.__easter (seek, pause, play) pour vérifier chaque beat.
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { useScene } from '../scene/store'
import { attachEngine, getAudioContext, getEngine } from './audio'
import { E, resetEaster } from './state'
import { createTension } from './tension'
import { buildTimeline } from './timeline'

type Debug = {
  seek: (t: number) => void
  play: () => void
  pause: () => void
  state: typeof E
  audio: () => string
}

let sentIntensity = -1

export function useSequence(running: boolean, reducedMotion: boolean, bloom: boolean): void {
  useEffect(() => {
    if (!running) return
    resetEaster(reducedMotion, bloom)
    sentIntensity = -1
    const ctx = getAudioContext()
    const engine = ctx ? createTension(ctx) : null
    attachEngine(engine)
    const tl = buildTimeline({
      cue: (name) => engine?.cue(name),
      climax: () => engine?.climax(),
      finale: () => {
        useScene.getState().setEasterStage('finale')
      },
    })
    engine?.start()
    tl.play()

    const onVisibility = () => {
      if (document.hidden) {
        tl.pause()
        void ctx?.suspend().catch(() => undefined)
      } else {
        tl.resume()
        void ctx?.resume().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const host = window as Window & { __easter?: Debug }
    if (import.meta.env.DEV) {
      host.__easter = {
        seek: (t) => {
          tl.pause()
          tl.seek(t)
        },
        play: () => {
          tl.play()
        },
        pause: () => {
          tl.pause()
        },
        state: E,
        audio: () => ctx?.state ?? 'none',
      }
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      tl.kill()
      engine?.stop()
      attachEngine(null)
      delete host.__easter
    }
  }, [running, reducedMotion, bloom])

  useFrame(() => {
    if (!running || Math.abs(E.intensity - sentIntensity) < 0.01) return
    sentIntensity = E.intensity
    getEngine()?.setIntensity(E.intensity)
  })
}
