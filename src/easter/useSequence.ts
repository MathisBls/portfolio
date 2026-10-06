// Easter egg v3 (docs/storyboards/easter-park.md, « Contrats entre agents », hooks de la timeline) : lance
// la séquence quand la scène est prête (stage 'running') : état remis à zéro, moteur de tension branché
// sur l'AudioContext ouvert au déverrouillage (audio.ts), timeline GSAP (timeline.ts) dont les hooks
// jouent les clips (voice.ts, playClip) et posent message et sous-titres dans le store. Onglet masqué :
// timeline en pause (le contexte audio est suspendu par audio.ts ; sinon le ticker GSAP, sans lissage
// du décalage quand Lenis tourne, sauterait à la fin au retour). Intensité du son relue chaque frame.
// En DEV : `?easter-at=<s>` démarre à ce temps (debug.ts) et window.__easter (seek, pause, play).
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useScene } from '../scene/store'
import { attachEngine, getAudioContext, getEngine } from './audio'
import { debugStartAt } from './debug'
import { endEaster } from './session'
import { E, resetEaster } from './state'
import { type SequenceEngine, createTension } from './tension'
import { R, T, clipStart, cueAt, lineCues, subtitleCues } from './times'
import { buildTimeline } from './timeline'
import { CLIPS, type ClipId, loadClips, playClip, stopClips } from './voice'

type Debug = {
  seek: (t: number) => void
  play: () => void
  pause: () => void
  state: typeof E
  audio: () => string
  /** Compteurs du renderer (programmes compilés, textures et géométries envoyées au GPU). */
  info: () => { programs: number; textures: number; geometries: number; calls: number }
  /** Nom et clé de cache de chaque programme compilé (diagnostic des recompilations). */
  programKeys: () => string[]
}

const CLIP_IDS = Object.keys(CLIPS) as ClipId[]
/** Silence après la dernière note de la musique, avant le retour à la page (s). */
const MUSIC_TAIL = 2

let sentIntensity = -1

/**
 * Saut de debug à `t` : la timeline est rendue à ce temps sans ses appels (seek), puis on rétablit ce
 * qu'ils auraient posé : ligne, sous-titre, sortie du warp côté son, clip en cours à la bonne position.
 */
function jumpTo(
  tl: gsap.core.Timeline,
  t: number,
  engine: SequenceEngine | null,
  isLive: () => boolean,
): void {
  const reduced = E.reduced
  tl.seek(t)
  const scene = useScene.getState()
  scene.setEasterLine(cueAt(lineCues(reduced), t))
  scene.setEasterSubtitle(cueAt(subtitleCues(reduced), t))
  if (t >= (reduced ? R.warp : T.warp)) engine?.climax()
  stopClips(0.05)
  void loadClips().then(() => {
    if (!isLive()) return
    const now = tl.time()
    for (const id of CLIP_IDS) {
      const start = clipStart(id, reduced)
      if (now >= start && now < start + CLIPS[id].duration) playClip(id, now - start)
    }
  })
}

export function useSequence(running: boolean, reducedMotion: boolean, bloom: boolean): void {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!running) return
    resetEaster(reducedMotion, bloom)
    sentIntensity = -1
    let live = true
    const isLive = () => live
    const ctx = getAudioContext()
    const engine = ctx ? createTension(ctx) : null
    attachEngine(engine)
    const scene = useScene.getState()
    const tl = buildTimeline({
      cue: (name) => engine?.cue(name),
      sfx: (name) => engine?.sfx(name),
      hush: () => engine?.hush(),
      climax: () => engine?.climax(),
      line: (index) => {
        scene.setEasterLine(index)
      },
      clip: (id) => {
        playClip(id)
      },
      subtitle: (index) => {
        scene.setEasterSubtitle(index)
      },
      finale: () => {
        scene.setEasterStage('finale')
      },
    })
    // Retour à la page quand la musique du parc se termine (le final reste affiché tant qu'elle joue)
    tl.call(endEaster, [], clipStart('park', reducedMotion) + CLIPS.park.duration + MUSIC_TAIL)
    engine?.start()
    const at = debugStartAt()
    if (at !== null) jumpTo(tl, at, engine, isLive)
    tl.play()

    const onVisibility = () => {
      if (document.hidden) tl.pause()
      else tl.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const host = window as Window & { __easter?: Debug }
    if (import.meta.env.DEV) {
      host.__easter = {
        seek: (t) => {
          tl.pause()
          jumpTo(tl, t, engine, isLive)
        },
        play: () => {
          tl.play()
        },
        pause: () => {
          tl.pause()
        },
        state: E,
        audio: () => ctx?.state ?? 'none',
        info: () => ({
          programs: gl.info.programs?.length ?? 0,
          textures: gl.info.memory.textures,
          geometries: gl.info.memory.geometries,
          calls: gl.info.render.calls,
        }),
        programKeys: () => (gl.info.programs ?? []).map((p) => `${p.name}|${p.cacheKey}`),
      }
    }
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisibility)
      tl.kill()
      scene.setEasterLine(-1)
      scene.setEasterSubtitle(-1)
      stopClips(0.4)
      engine?.stop()
      attachEngine(null)
      delete host.__easter
    }
  }, [running, reducedMotion, bloom, gl])

  useFrame(() => {
    if (!running || Math.abs(E.intensity - sentIntensity) < 0.01) return
    sentIntensity = E.intensity
    getEngine()?.setIntensity(E.intensity)
  })
}
