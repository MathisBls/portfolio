// À propos (docs/storyboards/about-legal.md) : 4 lignes, stack déduite des projets, disponibilité.
// Pas de pin : un ScrollTrigger scrubé écrit seulement le progress 'about' lu par la scène (calme ici).
// Les apparitions passent par [data-reveal] (CSS + IntersectionObserver, lib/reveal.ts).
import { useRef } from 'react'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { useContent } from '../content/useContent'
import { uniqueStack } from '../lib/stack'
import { stagger } from '../lib/stagger'
import { useSectionProgress } from '../lib/useSectionProgress'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './About.module.css'

const stack = uniqueStack(projects)

export function About() {
  const { text } = useContent()
  const { id } = site.sections.about
  const { label, title } = text.sections.about
  const { lines, stackLabel, availability } = text.about
  const sectionRef = useRef<HTMLElement>(null)

  // Progress de la section pour la scène (reduced-motion : 0 puis 1, sans scrub)
  useSectionProgress('about', sectionRef)

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
