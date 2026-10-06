// Section Projets (docs/storyboards/projects.md) : DOM seulement. Les ScrollTriggers écrivent les progress
// lus par la scène : 'projects' (section, caméra et prisme) et, dans ProjectCard, 'project:<slug>' (un par card).
// Reduced-motion : aucun trigger, posters seulement (les objets 3D ne sont jamais montés).
import { useLayoutEffect, useRef } from 'react'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { stagger } from '../lib/stagger'
import { useReducedMotion } from '../lib/useReducedMotion'
import { setProgress, useScene } from '../scene/store'
import { ProjectCard } from '../ui/ProjectCard'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Projects.module.css'

export function Projects() {
  const { id, label, title } = site.sections.projects
  const { intro } = site.projects
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion) return

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
          <li key={project.slug}>
            <ProjectCard project={project} index={index} />
          </li>
        ))}
      </ol>
    </section>
  )
}
