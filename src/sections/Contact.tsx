// Contact (docs/storyboards/services-contact.md) : coordonnées à gauche, formulaire à droite dès 1024 px.
// Le progress 'contact' (scrub, sans pin) pilote le retour du prisme dans la scène. Reduced-motion : pas de trigger.
import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { identity } from '../content/services'
import { site } from '../content/site'
import { isFilled, telHref } from '../lib/content'
import { ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import { setProgress } from '../scene/store'
import { ContactForm } from '../ui/ContactForm'
import styles from './Contact.module.css'

/** Stagger des [data-reveal] (global.css : delay = --reveal-i x 60 ms). */
const reveal = (i: number): CSSProperties & { '--reveal-i': number } => ({ '--reveal-i': i })

export function Contact() {
  const { id, label, title } = site.sections.contact
  const { intro, direct, emailLabel, phoneLabel, locationLabel, sirenLabel } = site.contact
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reduced) return
    const trigger = ScrollTrigger.create({
      id: 'contact',
      trigger: section,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setProgress('contact', self.progress)
      },
    })
    return () => {
      trigger.kill()
    }
  }, [reduced])

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.section}>
      <p className={styles.label} aria-hidden="true">
        {label}
      </p>
      <h2 id={`${id}-titre`} className={styles.title}>
        {title}
      </h2>
      <p className={styles.intro}>{intro}</p>

      <div className={styles.grid}>
        <div className={styles.direct} data-reveal style={reveal(0)}>
          <p className={styles.directLabel}>{direct}</p>
          <dl className={styles.list}>
            <div className={styles.row}>
              <dt className={styles.term}>{emailLabel}</dt>
              <dd className={styles.value}>
                {isFilled(identity.email) ? (
                  <a href={`mailto:${identity.email}`} className={styles.link}>
                    {identity.email}
                  </a>
                ) : (
                  identity.email
                )}
              </dd>
            </div>
            {identity.phone.trim() !== '' && (
              <div className={styles.row}>
                <dt className={styles.term}>{phoneLabel}</dt>
                <dd className={styles.value}>
                  {isFilled(identity.phone) ? (
                    <a href={telHref(identity.phone)} className={styles.link}>
                      {identity.phone}
                    </a>
                  ) : (
                    identity.phone
                  )}
                </dd>
              </div>
            )}
            <div className={styles.row}>
              <dt className={styles.term}>{locationLabel}</dt>
              <dd className={styles.value}>{identity.location}</dd>
            </div>
          </dl>
          <p className={styles.siren}>
            {sirenLabel} {identity.siren}
          </p>
        </div>

        <div className={styles.formCol} data-reveal style={reveal(1)}>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
