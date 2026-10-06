// Progress d'une section pour la timeline de la scène (getTimeline) : scrubé de 'top bottom' à
// 'bottom bottom'. En reduced-motion, pas de scrub : 0 avant la section, 1 dès qu'on y entre (état
// final statique), pour que la scène ne reste pas figée sur l'état d'une section précédente.
import { type RefObject, useLayoutEffect } from 'react'
import { type SectionId, setProgress } from '../scene/store'
import { ScrollTrigger } from './gsap'
import { prefersReducedMotion, useReducedMotion } from './useReducedMotion'

export function useSectionProgress(id: SectionId, ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion() || prefersReducedMotion()

  useLayoutEffect(() => {
    const section = ref.current
    if (!section) return
    const trigger = reduced
      ? ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom bottom',
          onToggle: (self) => {
            setProgress(id, self.isActive || self.progress >= 1 ? 1 : 0)
          },
          onLeaveBack: () => {
            setProgress(id, 0)
          },
        })
      : ScrollTrigger.create({
          id,
          trigger: section,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            setProgress(id, self.progress)
          },
        })
    setProgress(id, reduced ? (trigger.progress > 0 ? 1 : 0) : trigger.progress)
    return () => {
      trigger.kill()
    }
  }, [id, ref, reduced])
}
