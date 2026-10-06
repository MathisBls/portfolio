// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 0 à 7) : lance le second
// niveau quand le stage passe à 'majestic' (mot de passe ou tapes, EasterOverlay). État M remis à zéro,
// timeline GSAP (timeline.ts) dont les hooks jouent la musique (voice.ts : fondu de celle du parc, puis
// MajesticBTV), précompilent le monde (warmup.ts) et terminent (THANKS FOR PLAYING, retour à la page).
// Montage du monde (MajesticWorld) : demandé par `onMount` au repère de précompilation, une fois ACCESS
// GRANTED tapé, pour que la construction du monde (une centaine de ms) tombe sous le texte affiché.
// Précompilation (beat 0) : la timeline se met en pause sous ACCESS GRANTED déjà tapé (le final du parc
// continue de s'afficher), le monde est compilé pour la cible du bloom en asynchrone puis envoyé au GPU
// (warmUpSubtree, avec la préparation de D4) : seule cette dernière partie fige l'image, en une tâche.
// Pas de frameloop "never" : R3F remet son horloge à zéro à chaque changement de frameloop. Si le GLB
// n'est pas encore là, on attend de même (rendu actif, HUD lisible).
// Onglet masqué : timeline en pause (comme useSequence). En DEV : `?majestic-at=<s>` (debug.ts) et
// window.__majestic (seek, play, pause, état M, temps de précompilation mesuré).
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useScene } from '../../scene/store'
import { endEaster } from '../session'
import { E } from '../state'
import { playClip, stopClip, stopClips } from '../voice'
import { warmUpSubtree } from '../warmup'
import { debugMajesticAt } from './debug'
import { warmMajesticEnv } from './env'
import { majesticRoot } from './ready'
import { M, resetMajestic } from './state'
import { MT, musicTime } from './times'
import { buildMajesticTimeline } from './timeline'

type Debug = {
  seek: (t: number) => void
  play: () => void
  pause: () => void
  state: typeof M
  /** Durée de la précompilation du beat 0 (ms), -1 avant ; et de sa partie bloquante (image figée). */
  warmup: () => number
  blocked: () => number
}

export function useMajestic(
  active: boolean,
  mobile: boolean,
  reducedMotion: boolean,
  bloom: boolean,
  onMount: () => void,
): void {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    if (!active) return
    resetMajestic(reducedMotion, mobile, bloom)
    // Partie en cours (faux après le démontage) ; précompilation en cours ; durée mesurée (ms)
    const run = { live: true, warming: false, warmMs: -1, blockMs: -1 }
    const alive = () => run.live
    const store = useScene.getState()

    /** Précompile le monde dès qu'il est monté (une fois). */
    let prepared: Promise<void> | null = null
    const prepare = (): Promise<void> => {
      prepared ??= (async () => {
        const root = await majesticRoot()
        if (!alive()) return
        const start = performance.now()
        run.blockMs = await warmUpSubtree(gl, scene, camera, root, bloom, () =>
          warmMajesticEnv(gl, scene, camera, bloom),
        )
        run.warmMs = performance.now() - start
      })()
      return prepared
    }

    const tl = buildMajesticTimeline({
      fadePark: (fade) => {
        stopClip('park', fade)
      },
      music: () => {
        playClip('majestic')
      },
      warm: () => {
        run.warming = true
        tl.pause()
        onMount()
        void prepare().then(() => {
          run.warming = false
          if (run.live && !document.hidden) tl.resume()
        })
      },
      thanks: (shown) => {
        store.setEasterThanks(shown)
      },
      back: endEaster,
    })

    /** Saut de debug : timeline rendue à `t` sans ses appels, musique à la bonne position. */
    const jump = (t: number) => {
      tl.seek(t)
      store.setEasterThanks(t >= MT.thanks)
      stopClips(0.05)
      const at = musicTime(t)
      if (at >= 0) playClip('majestic', at)
    }

    const at = debugMajesticAt()
    if (at !== null && at > MT.warm) {
      // Départ en cours de route : précompilation d'abord, puis le saut
      run.warming = true
      E.fade = 1
      onMount()
      void prepare().then(() => {
        run.warming = false
        if (!run.live) return
        jump(at)
        tl.play()
      })
    } else {
      tl.play()
    }

    const onVisibility = () => {
      if (document.hidden) tl.pause()
      else if (!run.warming) tl.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const host = window as Window & { __majestic?: Debug }
    if (import.meta.env.DEV) {
      host.__majestic = {
        seek: (t) => {
          tl.pause()
          jump(t)
        },
        play: () => {
          tl.play()
        },
        pause: () => {
          tl.pause()
        },
        state: M,
        warmup: () => run.warmMs,
        blocked: () => run.blockMs,
      }
    }
    return () => {
      run.live = false
      document.removeEventListener('visibilitychange', onVisibility)
      tl.kill()
      store.setEasterThanks(false)
      resetMajestic(reducedMotion, mobile, bloom)
      delete host.__majestic
    }
  }, [active, mobile, reducedMotion, bloom, gl, scene, camera, onMount])
}
