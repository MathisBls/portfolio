// Section Projets : DOM seulement (chapitres plein écran, ui/ProjectChapter). Les ScrollTriggers écrivent
// les progress lus par la scène : 'projects' (section : caméra et prisme) ici, et 'project:<slug>' (un par
// chapitre) dans ProjectChapter.
// Reduced-motion : aucun trigger scrubé, posters seulement (les objets 3D ne sont jamais montés). Seul
// 'projects' passe de 0 à 1 à l'entrée de la section, pour que la scène ne garde pas l'éventail du hero.
import { useLayoutEffect, useRef } from 'react'
import { site } from '../content/site'
import { useContent } from '../content/useContent'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { stagger } from '../lib/stagger'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { setProgress, useScene } from '../scene/store'
import { ProjectChapter } from '../ui/ProjectChapter'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Projects.module.css'

export function Projects() {
  const { text, projects } = useContent()
  const { id } = site.sections.projects
  const { label, title } = text.sections.projects
  const { intro } = text.projects
  // Garde prefersReducedMotion : useReducedMotion vaut false pendant l'hydratation (snapshot serveur)
  const reducedMotion = useReducedMotion() || prefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (reducedMotion) {
      // Sans scrub, sur le modèle du Hero : 1 (prisme levé, plus d'éventail) dès que le hero est
      // entièrement sorti, 0 si on remonte au-dessus de la section. Jamais d'état intermédiaire.
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        onEnter: () => {
          setProgress('projects', 1)
        },
        onLeave: () => {
          setProgress('projects', 1)
        },
        onEnterBack: () => {
          setProgress('projects', 1)
        },
        onLeaveBack: () => {
          setProgress('projects', 0)
        },
      })
      setProgress('projects', trigger.progress > 0 ? 1 : 0)
      return () => {
        trigger.kill()
      }
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: 'projects',
        trigger: section,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          setProgress('projects', self.progress)
        },
      })
      // À un écran d'arriver : la scène précharge et monte les objets 3D
      ScrollTrigger.create({
        id: 'projects-near',
        trigger: section,
        start: 'top bottom+=100%',
        once: true,
        onEnter: () => {
          useScene.getState().setProjectsNear(true)
        },
      })
    }, section)

    return () => {
      ctx.revert()
    }
  }, [reducedMotion])

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.section}>
      <div className={styles.head}>
        <SectionLabel>{label}</SectionLabel>
        <RevealTitle id={`${id}-titre`} className={styles.title}>
          {title}
        </RevealTitle>
        <p className={styles.intro} data-reveal style={stagger(1)}>
          {intro}
        </p>
      </div>

      <ol className={styles.list}>
        {projects.map((project, index) => (
          <li key={project.slug} className={styles.item}>
            <ProjectChapter project={project} index={index} />
          </li>
        ))}
      </ol>
    </section>
  )
}
