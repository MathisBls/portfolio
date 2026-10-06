// À propos (docs/storyboards/about-legal.md) : 4 lignes, stack déduite des projets, disponibilité.
// Pas de pin : un ScrollTrigger scrubé écrit seulement le progress 'about' lu par la scène (calme ici).
// Les apparitions passent par [data-reveal] (CSS + IntersectionObserver, lib/reveal.ts).
import { useLayoutEffect, useRef } from 'react'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { ScrollTrigger } from '../lib/gsap'
import { uniqueStack } from '../lib/stack'
import { stagger } from '../lib/stagger'
import { useReducedMotion } from '../lib/useReducedMotion'
import { setProgress } from '../scene/store'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './About.module.css'

const stack = uniqueStack(projects)

export function About() {
  const { id, label, title } = site.sections.about
  const { lines, stackLabel, availability } = site.about
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  // Sans mouvement : pas de ScrollTrigger, la scène garde son état courant.
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reducedMotion) return

    const trigger = ScrollTrigger.create({
      id: 'about',
      trigger: section,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (st) => {
        setProgress('about', st.progress)
      },
    })

    return () => {
      trigger.kill()
    }
  }, [reducedMotion])

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.about}>
      <SectionLabel>{label}</SectionLabel>
      <RevealTitle id={`${id}-titre`} className={styles.title}>
        {title}
      </RevealTitle>

      <div className={styles.body}>
        <div className={styles.lines}>
          {lines.map((line, i) => (
            <p key={line} className={styles.line} data-reveal style={stagger(i)}>
              {line}
            </p>
          ))}
        </div>

        <div className={styles.stack}>
          <h3 id={`${id}-stack`} className={styles.stackTitle} data-reveal>
            {stackLabel}
          </h3>
          <ul className={styles.chips} aria-labelledby={`${id}-stack`}>
            {stack.map((tech, i) => (
              <li key={tech} className={styles.chip} data-reveal style={stagger(i + 1)}>
                {tech}
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.badge} data-reveal>
          <span className={styles.dot} aria-hidden="true" />
          {availability}
        </p>
      </div>
    </section>
  )
}
