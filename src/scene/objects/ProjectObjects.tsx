// Storyboard projets (docs/storyboards/projects.md §3) : « ProjectObjects.tsx : monte les 5 objets
// (Suspense chacun) quand projectsNear, desktop non reduced seulement ». §4 : « Montage : projects-near →
// la scène précharge et monte les objets » et « Drapeau has-project-objects : posé par ProjectObjects
// quand les 5 objets sont prêts » (les posters s'effacent). §2 « Mobile, reduced-motion » : posters seuls.
import { useThree } from '@react-three/fiber'
import { type ComponentType, Suspense, useCallback, useEffect, useRef } from 'react'
import { type Project, projects } from '../../content/projects'
import { ScrollTrigger } from '../../lib/gsap'
import { setSceneFlag, useScene } from '../store'
import { preloadModel } from '../useModel'
import { Factory } from './Factory'
import { Pizza } from './Pizza'
import { Quorin } from './Quorin'
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
  const ready = useRef(new Set<string>())

  const onReady = useCallback(
    (slug: string) => {
      ready.current.add(slug)
      if (ready.current.size < ITEMS.length) return
      setSceneFlag('has-project-objects', true)
      // Les posters s'effacent : les triggers (et les mesures des emplacements) se recalculent
      ScrollTrigger.refresh()
      invalidate()
    },
    [invalidate],
  )

  useEffect(
    () => () => {
      setSceneFlag('has-project-objects', false)
    },
    [],
  )

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
