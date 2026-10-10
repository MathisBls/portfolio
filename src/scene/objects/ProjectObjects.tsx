// Storyboard projets (docs/storyboards/projects.md §3) : « ProjectObjects.tsx : monte les 5 objets
// (Suspense chacun) quand projectsNear, desktop non reduced seulement ». §4 : « Montage : projects-near →
// la scène précharge et monte les objets » et « Drapeau has-project-objects : posé par ProjectObjects
// quand les 5 objets sont prêts » (les posters s'effacent). §2 « Mobile, reduced-motion » : posters seuls.
// Retour de Mathis (rayons) : mesure des cards au refresh pour le chemin du rayon actif (rayPath).
// Brief agent V du 2026-10-09 (nouvelle pizza) : les objets montent après le préchauffage de la scène
// (Warmup, Scene.tsx) ; quand ils sont tous prêts, la scène est précompilée de nouveau (warm.ts : objets
// masqués compris, programmes déjà compilés en cache) avant de lever has-project-objects, pour que leurs
// matériaux (part de pizza réaliste comprise) ne se compilent pas pendant la première image du chapitre.
// Objets 3D sur mobile (demande de Mathis du 2026-10-10 : « les modèles 3D sur tel on dirait une image, ça
// ne bouge pas ») : montés aussi sur mobile, version légère (pas de postprocessing, matériaux standard du
// GLB, DPR ≤ 1.5 par AdaptiveDpr), jamais en reduced-motion ni sans WebGL 2 (Canvas absent). Préchauffage
// dans la variante écran (sans composer). Filet de sécurité (FrameGuard) : si le téléphone rend
// durablement sous 30 i/s (GUARD) avec un objet à l'écran, les posters reviennent pour la session.
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentType, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { type Project, projects } from '../../content/projects'
import { ScrollTrigger } from '../../lib/gsap'
import { getAnchorMetrics, getProgress, setSceneFlag, useScene } from '../store'
import { preloadModel } from '../useModel'
import { warmScene } from '../warm'
import { Factory } from './Factory'
import { Fitness } from './Fitness'
import { Pizza } from './Pizza'
import { Quorin } from './Quorin'
import { measureCards } from './rayPath'
import { Wegir } from './Wegir'
import { Zephyr } from './Zephyr'

type ProjectObjectsProps = { mobile: boolean; reducedMotion: boolean }
type ObjectModel = Exclude<Project['model'], 'prism'>

const OBJECTS: Record<ObjectModel, ComponentType<{ slug: string }>> = {
  zephyr: Zephyr,
  wegir: Wegir,
  quorin: Quorin,
  gamefactory: Factory,
  pizza: Pizza,
  fitness: Fitness,
}

const isObjectModel = (model: Project['model']): model is ObjectModel => model !== 'prism'

/** Un objet par projet, dans l'ordre des cards (source unique : content/projects.ts). */
const ITEMS = projects.flatMap(({ slug, model }) =>
  isObjectModel(model) ? [{ slug, model, Component: OBJECTS[model] }] : [],
)

const IDS = ITEMS.map(({ slug }) => `project:${slug}` as const)

/** Filet de sécurité mobile : fenêtres d'images consécutives (s), seuil, fenêtres lentes d'affilée. */
const GUARD = { window: 1, minFps: 30, slowWindows: 4, gap: 0.5 }
/** Retour des posters : fondu CSS (--dur, 0.6 s) avant de démonter les objets. */
const FADE_MS = 700

/** true si l'emplacement d'un objet coupe l'écran (son objet rend alors en continu). */
function slotOnScreen() {
  for (const id of IDS) {
    const m = getAnchorMetrics(id)
    const p = getProgress(id)
    if (m && p > 0 && p < 1 && m.top < m.viewportH && m.top + m.height > 0) return true
  }
  return false
}

/**
 * Mesure le rendu pendant qu'un objet est à l'écran (boucle continue : images consécutives ; en
 * frameloop "demand", les trous d'une page immobile ne comptent pas, cf. AdaptiveDpr). Sous GUARD.minFps
 * pendant `slowWindows` fenêtres d'affilée (AdaptiveDpr a déjà baissé la densité entre-temps) : les
 * posters reviennent tout de suite (drapeau retiré), les objets sont démontés après le fondu.
 * Aucun setState dans useFrame : la décision part une fois, en différé.
 */
function FrameGuard({ onSlow }: { onSlow: () => void }) {
  const stats = useRef({ time: 0, frames: 0, slow: 0, wasShown: false, tripped: false })
  const timer = useRef(0)
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )
  useFrame((_, delta) => {
    const s = stats.current
    if (s.tripped) return
    const shown = slotOnScreen()
    const consecutive = shown && s.wasShown && delta < GUARD.gap
    s.wasShown = shown
    if (!consecutive) return
    s.time += delta
    s.frames += 1
    if (s.time < GUARD.window) return
    const fps = s.frames / s.time
    s.time = 0
    s.frames = 0
    s.slow = fps < GUARD.minFps ? s.slow + 1 : 0
    if (s.slow < GUARD.slowWindows) return
    s.tripped = true
    setSceneFlag('has-project-objects', false)
    timer.current = window.setTimeout(onSlow, FADE_MS)
  })
  return null
}

/** Monté dans le même Suspense que son objet : son effet ne part qu'une fois le GLB prêt et rendu. */
function Ready({ slug, onReady }: { slug: string; onReady: (slug: string) => void }) {
  useEffect(() => {
    onReady(slug)
  }, [slug, onReady])
  return null
}

function Objects({ mobile, onSlow }: { mobile: boolean; onSlow: () => void }) {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const ready = useRef(new Set<string>())
  const mounted = useRef(true)

  const onReady = useCallback(
    (slug: string) => {
      ready.current.add(slug)
      if (ready.current.size < ITEMS.length) return
      const show = () => {
        if (!mounted.current) return
        setSceneFlag('has-project-objects', true)
        // Les posters s'effacent : les triggers (et les mesures des emplacements) se recalculent
        ScrollTrigger.refresh()
        invalidate()
      }
      // Desktop : postprocessing actif, variante hors écran (cible du composer). Mobile : rendu direct
      warmScene(gl, scene, camera, !mobile).then(show, show)
    },
    [invalidate, gl, scene, camera, mobile],
  )

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      setSceneFlag('has-project-objects', false)
    }
  }, [])

  // Corps des cards, pour que le rayon actif ne passe pas dessus (rayPath) : au montage et à chaque
  // refresh de ScrollTrigger (resize, polices, posters), jamais dans useFrame
  useEffect(() => {
    measureCards()
    ScrollTrigger.addEventListener('refresh', measureCards)
    return () => {
      ScrollTrigger.removeEventListener('refresh', measureCards)
    }
  }, [])

  return (
    <>
      {ITEMS.map(({ slug, Component }) => (
        <Suspense key={slug} fallback={null}>
          <Component slug={slug} />
          <Ready slug={slug} onReady={onReady} />
        </Suspense>
      ))}
      {mobile && <FrameGuard onSlow={onSlow} />}
    </>
  )
}

export function ProjectObjects({ mobile, reducedMotion }: ProjectObjectsProps) {
  const near = useScene((s) => s.projectsNear)
  // Rendu trop lent constaté (FrameGuard, mobile) : posters jusqu'au rechargement
  const [slow, setSlow] = useState(false)
  const onSlow = useCallback(() => {
    setSlow(true)
  }, [])
  const enabled = near && !reducedMotion && !slow

  // Préchargement dès que la section est à moins d'un écran (les composants suspendent dessus)
  useEffect(() => {
    if (!enabled) return
    ITEMS.forEach(({ model }) => {
      preloadModel(model)
    })
  }, [enabled])

  return enabled ? <Objects mobile={mobile} onSlow={onSlow} /> : null
}
