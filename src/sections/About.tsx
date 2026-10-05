// À propos (docs/storyboards/about-legal.md) : 4 lignes, stack déduite des projets, disponibilité.
// Pas de pin : un ScrollTrigger scrubé écrit seulement le progress 'about' lu par la scène (calme ici).
// Les apparitions passent par [data-reveal] (CSS + IntersectionObserver, lib/reveal.ts).
import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { ScrollTrigger } from '../lib/gsap'
import { uniqueStack } from '../lib/stack'
import { useReducedMotion } from '../lib/useReducedMotion'
import { setProgress } from '../scene/store'
import styles from './About.module.css'

const stack = uniqueStack(projects)

/** Délai d'apparition : le CSS global multiplie --reveal-i par 60 ms. */
function stagger(index: number): CSSProperties {
  return { '--reveal-i': index } as CSSProperties
}

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
      <p className={styles.label} aria-hidden="true">
        {label}
      </p>
      <h2 id={`${id}-titre`} className={styles.title}>
        {title}
      </h2>

      <div className={styles.body}>
        <div className={styles.lines}>
          {lines.map((line, i) => (
            <p key={line} className={styles.line} data-reveal style={stagger(i)}>
              {line}
            </p>
          ))}
        </div>

        <div className={styles.stack} data-reveal>
          <h3 id={`${id}-stack`} className={styles.stackTitle}>
            {stackLabel}
          </h3>
          <ul className={styles.chips} aria-labelledby={`${id}-stack`}>
            {stack.map((tech) => (
              <li key={tech} className={styles.chip}>
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
