// Storyboard projets (docs/storyboards/projects.md §3) : « ProjectObjects.tsx : monte les 5 objets
// (Suspense chacun) quand projectsNear, desktop non reduced seulement ». §4 : « Montage : projects-near →
// la scène précharge et monte les objets » et « Drapeau has-project-objects : posé par ProjectObjects
// quand les 5 objets sont prêts » (les posters s'effacent). §2 « Mobile, reduced-motion » : posters seuls.
// Retour de Mathis (rayons) : mesure des cards au refresh pour le chemin du rayon actif (rayPath).
// Brief agent V du 2026-10-09 (nouvelle pizza) : les objets montent après le préchauffage de la scène
// (Warmup, Scene.tsx) ; quand ils sont tous prêts, la scène est précompilée de nouveau (warm.ts : objets
// masqués compris, programmes déjà compilés en cache) avant de lever has-project-objects, pour que leurs
// matériaux (part de pizza réaliste comprise) ne se compilent pas pendant la première image du chapitre.
import { useThree } from '@react-three/fiber'
import { type ComponentType, Suspense, useCallback, useEffect, useRef } from 'react'
import { type Project, projects } from '../../content/projects'
import { ScrollTrigger } from '../../lib/gsap'
import { setSceneFlag, useScene } from '../store'
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

/** Monté dans le même Suspense que son objet : son effet ne part qu'une fois le GLB prêt et rendu. */
function Ready({ slug, onReady }: { slug: string; onReady: (slug: string) => void }) {
  useEffect(() => {
    onReady(slug)
  }, [slug, onReady])
  return null
}

function Objects() {
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
      // Objets montés seulement avec le postprocessing (desktop hors reduced-motion) : variante hors écran
      warmScene(gl, scene, camera, true).then(show, show)
    },
    [invalidate, gl, scene, camera],
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

  return ITEMS.map(({ slug, Component }) => (
    <Suspense key={slug} fallback={null}>
      <Component slug={slug} />
      <Ready slug={slug} onReady={onReady} />
    </Suspense>
  ))
}

export function ProjectObjects({ mobile, reducedMotion }: ProjectObjectsProps) {
  const near = useScene((s) => s.projectsNear)
  const enabled = near && !mobile && !reducedMotion

  // Préchargement dès que la section est à moins d'un écran (les composants suspendent dessus)
  useEffect(() => {
    if (!enabled) return
    ITEMS.forEach(({ model }) => {
      preloadModel(model)
    })
  }, [enabled])

  return enabled ? <Objects /> : null
}
